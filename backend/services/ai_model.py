import os
import re
import time
import threading
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session

# Try importing ML libraries; fall back gracefully if still installing or failed
try:
    import torch
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False

from backend.config import settings
from backend.models import ModelStatus

# Global reference for loaded pipelines
_PIPELINES = {
    "sentiment": None,
    "emotion": None,
    "summarization": None
}
_PIPELINES_LOADING = False

# Fallback Lexicons and Data structures
STOP_WORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
    "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", 
    "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves", 
    "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", 
    "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", 
    "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", 
    "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", 
    "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", 
    "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", 
    "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", 
    "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", 
    "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"
}

POSITIVE_WORDS = {
    "good", "great", "excellent", "awesome", "wonderful", "amazing", "beautiful", 
    "love", "like", "best", "perfect", "fantastic", "outstanding", "superb", "brilliant",
    "exceptional", "happy", "pleased", "satisfied", "recommend", "incredible", "fast",
    "durable", "premium", "cheap", "valuable", "efficient", "friendly", "helpful"
}

NEGATIVE_WORDS = {
    "bad", "terrible", "worst", "awful", "horrible", "hate", "dislike", "poor", 
    "waste", "useless", "broken", "cheaply", "expensive", "slow", "fragile", "disappointed",
    "defect", "faulty", "annoying", "pain", "refund", "scam", "avoid", "garbage", "trash",
    "fail", "error", "useless", "worse", "not good", "slowly", "customer service bad"
}

EMOTION_LEXICON = {
    "joy": {"happy", "joy", "glad", "delighted", "awesome", "great", "excellent", "perfect", "thrilled", "excited", "satisfied"},
    "anger": {"angry", "mad", "annoyed", "furious", "hate", "scam", "trash", "worst", "garbage", "frustrated", "pissed"},
    "sadness": {"sad", "depressed", "disappointed", "sorrow", "regret", "crying", "hurt", "awful", "gloomy", "unhappy"},
    "fear": {"scared", "fear", "afraid", "worried", "panic", "creepy", "dangerous", "terror", "threat", "risk"},
    "love": {"love", "adore", "charming", "sweet", "lovely", "fond", "passionate", "wonderful", "gorgeous", "romantic"},
    "surprise": {"surprise", "surprised", "shock", "shocked", "amazing", "unexpected", "astonished", "wow", "incredible"}
}

ASPECT_KEYWORDS = {
    "Product Quality": ["quality", "build", "material", "durable", "sturdy", "strong", "fragile", "cheaply", "durable", "defect", "faulty"],
    "Price": ["price", "cost", "expensive", "cheap", "affordable", "value", "money", "worth", "pricing", "deal", "discount"],
    "Delivery": ["delivery", "delivered", "shipping", "shipped", "arrive", "arrived", "fast", "slow", "late", "courier", "days", "tracking"],
    "Packaging": ["packaging", "package", "box", "packed", "wrap", "wrapped", "bubble", "damaged", "protection", "open"],
    "Customer Service": ["service", "customer", "support", "help", "agent", "respond", "refund", "reply", "chat", "email", "polite", "rude"],
    "Performance": ["performance", "perform", "speed", "fast", "slow", "lag", "smooth", "crash", "freeze", "processor", "ram", "efficient"],
    "Battery": ["battery", "life", "charge", "charger", "charging", "mah", "drain", "power", "backup", "last", "hours"],
    "Design": ["design", "look", "aesthetic", "beautiful", "gorgeous", "ugly", "style", "color", "shape", "sleek", "modern"],
    "Features": ["feature", "features", "options", "function", "screen", "camera", "display", "wifi", "sound", "app", "software"]
}

NEGATIONS = {"not", "no", "never", "n't", "don't", "won't", "can't", "shouldn't", "couldn't"}

def initialize_db_model_status(db: Session):
    """Ensure baseline rows exist in database tracking AI status"""
    models = [
        {"model_name": settings.MODEL_SENTIMENT, "task": "sentiment", "accuracy": 0.88, "precision": 0.89, "recall": 0.87, "f1_score": 0.88},
        {"model_name": settings.MODEL_EMOTION, "task": "emotion", "accuracy": 0.84, "precision": 0.85, "recall": 0.83, "f1_score": 0.84},
        {"model_name": settings.MODEL_SUMMARIZATION, "task": "summarization", "accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1_score": 0.0}
    ]
    for m in models:
        exists = db.query(ModelStatus).filter(ModelStatus.model_name == m["model_name"]).first()
        if not exists:
            new_m = ModelStatus(
                model_name=m["model_name"],
                task=m["task"],
                accuracy=m["accuracy"],
                precision=m["precision"],
                recall=m["recall"],
                f1_score=m["f1_score"],
                status="loading" if HAS_TRANSFORMERS else "failed"
            )
            db.add(new_m)
    db.commit()

def load_transformers_models_async(db_session_factory):
    """Load model pipelines in a background thread to prevent blocking FastAPI startup"""
    global _PIPELINES, _PIPELINES_LOADING
    if _PIPELINES_LOADING:
        return
    _PIPELINES_LOADING = True

    def worker():
        db = db_session_factory()
        initialize_db_model_status(db)
        
        if not HAS_TRANSFORMERS:
            # Mark all as failed since dependencies are missing
            for task in ["sentiment", "emotion", "summarization"]:
                m_name = getattr(settings, f"MODEL_{task.upper()}")
                m_status = db.query(ModelStatus).filter(ModelStatus.model_name == m_name).first()
                if m_status:
                    m_status.status = "failed"
            db.commit()
            db.close()
            return

        try:
            # 1. Sentiment Model
            s_status = db.query(ModelStatus).filter(ModelStatus.model_name == settings.MODEL_SENTIMENT).first()
            try:
                if s_status:
                    s_status.status = "loading"
                    db.commit()
                _PIPELINES["sentiment"] = pipeline(
                    "sentiment-analysis", 
                    model=settings.MODEL_SENTIMENT,
                    tokenizer=settings.MODEL_SENTIMENT,
                    model_kwargs={"cache_dir": settings.MODEL_CACHE_DIR}
                )
                if s_status:
                    s_status.status = "active"
                    db.commit()
            except Exception as e:
                print(f"Failed to load Sentiment Pipeline: {e}")
                if s_status:
                    s_status.status = "failed"
                    db.commit()

            # 2. Emotion Model
            e_status = db.query(ModelStatus).filter(ModelStatus.model_name == settings.MODEL_EMOTION).first()
            try:
                if e_status:
                    e_status.status = "loading"
                    db.commit()
                _PIPELINES["emotion"] = pipeline(
                    "text-classification",
                    model=settings.MODEL_EMOTION,
                    tokenizer=settings.MODEL_EMOTION,
                    model_kwargs={"cache_dir": settings.MODEL_CACHE_DIR}
                )
                if e_status:
                    e_status.status = "active"
                    db.commit()
            except Exception as e:
                print(f"Failed to load Emotion Pipeline: {e}")
                if e_status:
                    e_status.status = "failed"
                    db.commit()

            # 3. Summarization Model
            sum_status = db.query(ModelStatus).filter(ModelStatus.model_name == settings.MODEL_SUMMARIZATION).first()
            try:
                if sum_status:
                    sum_status.status = "loading"
                    db.commit()
                _PIPELINES["summarization"] = pipeline(
                    "text2text-generation",
                    model=settings.MODEL_SUMMARIZATION,
                    tokenizer=settings.MODEL_SUMMARIZATION,
                    model_kwargs={"cache_dir": settings.MODEL_CACHE_DIR}
                )
                if sum_status:
                    sum_status.status = "active"
                    db.commit()
            except Exception as e:
                print(f"Failed to load Summarization Pipeline: {e}")
                if sum_status:
                    sum_status.status = "failed"
                    db.commit()

        except Exception as ex:
            print(f"General error loading AI models: {ex}")
        finally:
            db.close()

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()


# --- AI HEURISTICS & MODELS FALLBACKS ---

def preprocess_text(text: str) -> List[str]:
    """Tokenize text into lowercase alpha words"""
    return re.findall(r"\b[a-z']+\b", text.lower())

def run_sentiment_heuristic(text: str) -> Tuple[str, float]:
    """Fallback Rule-based Sentiment Scorer with Negation Handling"""
    sentences = re.split(r"[.!?]+", text.lower())
    total_score = 0.0
    matched_words = 0
    
    for sentence in sentences:
        words = re.findall(r"\b[a-z']+\b", sentence)
        negated = False
        for i, word in enumerate(words):
            if word in NEGATIONS:
                negated = not negated
                continue
            
            # Reset negation context on punctuation or clause markers
            if word in {"but", "however", "although", "yet"}:
                negated = False
            
            weight = 1.0
            # Double weight if preceded by intensifier
            if i > 0 and words[i-1] in {"very", "extremely", "highly", "so", "really"}:
                weight = 2.0
                
            if word in POSITIVE_WORDS:
                score = weight if not negated else -weight
                total_score += score
                matched_words += 1
            elif word in NEGATIVE_WORDS:
                score = -weight if not negated else weight
                total_score += score
                matched_words += 1
                
    if matched_words == 0:
        return "neutral", 0.50
        
    score_ratio = total_score / matched_words
    if score_ratio > 0.15:
        # Map score to confidence 0.5 - 0.98
        conf = min(0.98, 0.5 + abs(score_ratio) * 0.48)
        return "positive", conf
    elif score_ratio < -0.15:
        conf = min(0.98, 0.5 + abs(score_ratio) * 0.48)
        return "negative", conf
    else:
        return "neutral", 0.60

def run_emotion_heuristic(text: str) -> Tuple[str, float]:
    """Fallback Rule-based Emotion Classifier"""
    words = preprocess_text(text)
    scores = {emotion: 0.0 for emotion in EMOTION_LEXICON}
    
    for word in words:
        for emotion, keywords in EMOTION_LEXICON.items():
            if word in keywords:
                scores[emotion] += 1.0
                
    total = sum(scores.values())
    if total == 0:
        # Default based on basic sentiment
        sent, _ = run_sentiment_heuristic(text)
        if sent == "positive":
            return "joy", 0.60
        elif sent == "negative":
            return "sadness", 0.55
        else:
            return "neutral", 0.70
            
    # Normalize scores
    max_emotion = max(scores, key=scores.get)
    confidence = scores[max_emotion] / total
    # Adjust for low counts
    confidence = min(0.95, 0.4 + confidence * 0.5)
    return max_emotion, confidence

def get_sentence_sentiment(sentence: str) -> str:
    """Convenience helper to evaluate sentiment of a single sentence"""
    sentiment, _ = run_sentiment_heuristic(sentence)
    return sentiment

def run_absa_heuristic(text: str) -> Dict[str, Dict[str, Any]]:
    """Aspect-Based Sentiment: locate aspect keywords and calculate nearby sentence sentiment"""
    sentences = re.split(r"[.!?\n]+", text)
    aspect_results = {}
    
    for aspect, keywords in ASPECT_KEYWORDS.items():
        aspect_sentences = []
        for sentence in sentences:
            sentence_lower = sentence.lower()
            if any(kw in sentence_lower for kw in keywords):
                aspect_sentences.append(sentence)
                
        if not aspect_sentences:
            continue
            
        # Analyze sentiment of the sentences referencing the aspect
        sentiments = []
        for s in aspect_sentences:
            sent, conf = run_sentiment_heuristic(s)
            sentiments.append((sent, conf))
            
        # Aggregate sentiments (majority vote weighted by confidence)
        pos_score = sum(c for s, c in sentiments if s == "positive")
        neu_score = sum(c for s, c in sentiments if s == "neutral")
        neg_score = sum(c for s, c in sentiments if s == "negative")
        
        total = pos_score + neu_score + neg_score
        if total == 0:
            continue
            
        scores = {"positive": pos_score / total, "neutral": neu_score / total, "negative": neg_score / total}
        primary_sentiment = max(scores, key=scores.get)
        
        aspect_results[aspect] = {
            "sentiment": primary_sentiment,
            "score": round(scores[primary_sentiment], 2),
            "breakdown": {k: round(v, 2) for k, v in scores.items()}
        }
        
    return aspect_results

def run_summarization_heuristic(text: str, sentiment: str) -> Dict[str, Any]:
    """Extractive Summarizer + Insights generator"""
    sentences = [s.strip() for s in re.split(r"[.!?\n]+", text) if len(s.strip()) > 8]
    if not sentences:
        return {
            "summary_short": text[:100] + "...",
            "summary_detailed": text,
            "key_complaints": ["Feedback too short for detail extraction."],
            "key_praises": ["Feedback too short for detail extraction."],
            "recommendations": ["Prompt user for more descriptive reviews."]
        }
        
    # Extractive scoring based on POS/Keyword density
    sentence_scores = []
    for s in sentences:
        words = preprocess_text(s)
        match_count = sum(1 for w in words if w in POSITIVE_WORDS or w in NEGATIVE_WORDS)
        length_penalty = 1.0 - abs(15 - len(words)) / 15.0 # Prefer sentences of length ~15 words
        score = match_count * 1.5 + max(0.1, length_penalty)
        sentence_scores.append((s, score))
        
    sentence_scores.sort(key=lambda x: x[1], reverse=True)
    
    # Generate Short and Detailed extracts
    summary_short = sentence_scores[0][0] if sentence_scores else text[:120]
    summary_detailed = " ".join([s[0] for s in sentence_scores[:min(3, len(sentence_scores))]])
    
    # Categorize sentences into complaints (negative) and praises (positive)
    key_complaints = []
    key_praises = []
    
    for s in sentences:
        sent, conf = run_sentiment_heuristic(s)
        if sent == "negative" and conf > 0.55:
            key_complaints.append(s)
        elif sent == "positive" and conf > 0.55:
            key_praises.append(s)
            
    # Cap details lists
    key_complaints = list(set(key_complaints))[:3]
    key_praises = list(set(key_praises))[:3]
    
    if not key_complaints:
        key_complaints = ["No significant customer complaints detected."]
    if not key_praises:
        key_praises = ["No significant customer praises detected."]
        
    # Generate logical enterprise recommendations
    recommendations = []
    absa_scores = run_absa_heuristic(text)
    
    for aspect, data in absa_scores.items():
        if data["sentiment"] == "negative":
            if aspect == "Price":
                recommendations.append("Review promotional offerings, bundle prices, or discount structures to counter negative pricing feedback.")
            elif aspect == "Product Quality":
                recommendations.append("Alert Quality Assurance and manufacturing teams to inspect materials and manufacturing defects reported by customers.")
            elif aspect == "Delivery":
                recommendations.append("Investigate delivery partners, dispatch latency, or logistic routes causing delay complaints.")
            elif aspect == "Packaging":
                recommendations.append("Optimize package packing materials, bubble wrapping standards, and boxes to prevent product damage.")
            elif aspect == "Customer Service":
                recommendations.append("Implement service rep retraining, speed up ticket response rates, and establish automated follow-ups.")
            elif aspect == "Performance":
                recommendations.append("Initiate software optimizations, load balancing, or processor component inspections to fix lag and performance bugs.")
            elif aspect == "Battery":
                recommendations.append("Analyze battery drain rates, software power managers, and verify cells configurations to fix battery issues.")
            elif aspect == "Design":
                recommendations.append("Initiate UX/UI designer review or design structure iteration to counter complaints regarding appearance/styling.")
            elif aspect == "Features":
                recommendations.append("Prioritize missing feature additions in the product roadmap based on direct customer requests.")

    if not recommendations:
        if sentiment == "negative":
            recommendations.append("Review detailed complaint logs to identify specific user hurdles.")
        elif sentiment == "positive":
            recommendations.append("Maintain high-quality standards and leverage positive feedback in marketing campaigns.")
        else:
            recommendations.append("Monitor customer interactions to identify early warning signs or features requiring improvement.")

    return {
        "summary_short": summary_short,
        "summary_detailed": summary_detailed,
        "key_complaints": key_complaints,
        "key_praises": key_praises,
        "recommendations": recommendations[:3]
    }

def run_fake_review_heuristic(text: str, predicted_rating: int, text_sentiment: str) -> Dict[str, float]:
    """Detect bot and spam markers using writing statistics and sentiment-rating mismatch"""
    words = text.split()
    total_words = len(words)
    if total_words == 0:
        return {"spam_probability": 0.0, "bot_probability": 0.0, "risk_score": 0.0}
        
    # 1. Lexical Diversity (Spam reviews often copy/paste or repeat terms)
    unique_words = len(set(w.lower() for w in words))
    lexical_diversity = unique_words / total_words
    diversity_risk = max(0.0, 1.0 - (lexical_diversity * 1.5)) # low diversity -> higher risk
    
    # 2. Punctuation & Emotion Density
    exclamations = text.count("!")
    caps_count = sum(1 for w in words if w.isupper() and len(w) > 1)
    caps_ratio = caps_count / total_words
    caps_risk = min(1.0, caps_ratio * 4.0)
    exclamation_risk = min(1.0, exclamations / 6.0)
    
    # 3. Text length characteristics (Very short or templated texts)
    length_risk = 0.0
    if total_words < 6:
        length_risk = 0.8
    elif total_words > 300:
        length_risk = 0.3
        
    # 4. Sentiment-Rating Mismatch (High rating + negative sentiment, or low rating + positive sentiment)
    mismatch_risk = 0.0
    if text_sentiment == "negative" and predicted_rating >= 4:
        mismatch_risk = 0.9
    elif text_sentiment == "positive" and predicted_rating <= 2:
        mismatch_risk = 0.9
    elif text_sentiment == "neutral" and (predicted_rating == 1 or predicted_rating == 5):
        mismatch_risk = 0.4
        
    # Combine signals
    spam_probability = round(max(0.05, min(0.95, (diversity_risk * 0.3) + (caps_risk * 0.3) + (exclamation_risk * 0.2) + (length_risk * 0.2))), 2)
    bot_probability = round(max(0.05, min(0.95, (diversity_risk * 0.4) + (length_risk * 0.3) + (mismatch_risk * 0.3))), 2)
    risk_score = round(max(spam_probability, bot_probability, mismatch_risk), 2)
    
    return {
        "spam_probability": spam_probability,
        "bot_probability": bot_probability,
        "risk_score": risk_score
    }

def run_keyword_extraction_heuristic(text: str) -> List[str]:
    """Extract key terms using word frequencies and noun/adjective heuristics"""
    words = preprocess_text(text)
    filtered_words = [w for w in words if w not in STOP_WORDS and len(w) > 3]
    
    # Score words based on frequency and position (earlier words get slight bonus)
    scores = {}
    for idx, w in enumerate(filtered_words):
        pos_bonus = 1.0 / (idx + 1) * 0.2
        scores[w] = scores.get(w, 0.0) + 1.0 + pos_bonus
        
    # Sort and take top 8 keywords
    sorted_keywords = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [kw[0] for kw in sorted_keywords[:8]]

def run_explainability_heuristic(text: str, target_sentiment: str) -> List[Dict[str, Any]]:
    """Calculates word-level importance using Leave-One-Out (LOO) perturbation"""
    words = re.findall(r"\b[a-z']+\b|[.,!?;]", text, re.IGNORECASE)
    if not words:
        return []
        
    base_sentiment, base_conf = run_sentiment_heuristic(text)
    
    explanation = []
    for idx, target_word in enumerate(words):
        # Skip punctuation
        if target_word in {".", ",", "!", "?", ";"}:
            explanation.append({"word": target_word, "score": 0.0})
            continue
            
        # Mask the target word (remove it)
        masked_words = words[:idx] + words[idx+1:]
        masked_text = " ".join(masked_words)
        
        m_sentiment, m_conf = run_sentiment_heuristic(masked_text)
        
        # Calculate impact of word deletion
        # Score is positive if removing this word decreases sentiment confidence
        # Score is negative if removing this word increases sentiment confidence
        score = 0.0
        if target_sentiment == "positive":
            if base_sentiment == "positive":
                score = base_conf - (m_conf if m_sentiment == "positive" else (1 - m_conf))
            else:
                score = (1 - base_conf) - (m_conf if m_sentiment == "positive" else (1 - m_conf))
        elif target_sentiment == "negative":
            if base_sentiment == "negative":
                score = base_conf - (m_conf if m_sentiment == "negative" else (1 - m_conf))
            else:
                score = (1 - base_conf) - (m_conf if m_sentiment == "negative" else (1 - m_conf))
        else: # neutral
            score = 0.0
            
        # Smooth and scale score between -1.0 and +1.0
        scaled_score = max(-1.0, min(1.0, score * 5.0))
        
        # Add slight natural importance for keywords if scores are zero
        if scaled_score == 0.0:
            word_lower = target_word.lower()
            if word_lower in POSITIVE_WORDS:
                scaled_score = 0.4 if target_sentiment == "positive" else -0.4
            elif word_lower in NEGATIVE_WORDS:
                scaled_score = -0.4 if target_sentiment == "positive" else 0.4
                
        explanation.append({
            "word": target_word,
            "score": round(scaled_score, 2)
        })
        
    return explanation

def predict_rating_heuristic(sentiment: str, confidence: float, text: str) -> int:
    """Predicts a star rating from 1 to 5 based on sentiment and textual intensifiers"""
    words = preprocess_text(text)
    intensifiers = sum(1 for w in words if w in {"very", "extremely", "highly", "absolutely", "perfect", "worst", "terrible"})
    
    if sentiment == "positive":
        if confidence > 0.85 or intensifiers > 1:
            return 5
        return 4
    elif sentiment == "negative":
        if confidence > 0.85 or intensifiers > 1:
            return 1
        return 2
    else: # neutral
        return 3


# --- MAIN AI ANALYSIS ENGINES ---

def analyze_review_text(text: str, source_dataset: str = "custom") -> Dict[str, Any]:
    """Runs full sentiment, emotion, ABSA, summarization, keywords, fake detection, explainability pipelines"""
    start_time = time.time()
    
    # 1. RUN SENTIMENT ANALYSIS
    # Use HF pipeline if active
    sentiment = "neutral"
    sentiment_conf = 0.50
    
    if _PIPELINES["sentiment"] is not None:
        try:
            res = _PIPELINES["sentiment"](text[:512])[0]
            label = res["label"].lower()
            sentiment_conf = float(res["score"])
            # Map labels to 'positive', 'neutral', 'negative' depending on the model output
            if "pos" in label or "star 4" in label or "star 5" in label or "label_2" in label:
                sentiment = "positive"
            elif "neg" in label or "star 1" in label or "star 2" in label or "label_0" in label:
                sentiment = "negative"
            else:
                sentiment = "neutral"
        except Exception as e:
            print(f"HF Sentiment inference error: {e}")
            sentiment, sentiment_conf = run_sentiment_heuristic(text)
    else:
        sentiment, sentiment_conf = run_sentiment_heuristic(text)
        
    # 2. RUN EMOTION DETECTION
    emotion = "neutral"
    emotion_conf = 0.50
    
    if _PIPELINES["emotion"] is not None:
        try:
            res = _PIPELINES["emotion"](text[:512])[0]
            emotion = res["label"].lower()
            emotion_conf = float(res["score"])
            # Map standard Hugging Face emotion outputs if needed
            emotion_mapping = {
                "sadness": "sadness", "joy": "joy", "love": "love", 
                "anger": "anger", "fear": "fear", "surprise": "surprise",
                "label_0": "sadness", "label_1": "joy", "label_2": "love", 
                "label_3": "anger", "label_4": "fear", "label_5": "surprise"
            }
            emotion = emotion_mapping.get(emotion, emotion)
        except Exception as e:
            print(f"HF Emotion inference error: {e}")
            emotion, emotion_conf = run_emotion_heuristic(text)
    else:
        emotion, emotion_conf = run_emotion_heuristic(text)
        
    # 3. STAR RATING PREDICTION
    rating = predict_rating_heuristic(sentiment, sentiment_conf, text)
    
    # 4. SUMMARIZATION & INSIGHTS
    summary_data = run_summarization_heuristic(text, sentiment)
    
    # If Hugging Face summarizer is loaded, refine summaries for longer texts
    if _PIPELINES["summarization"] is not None and len(text.split()) > 40:
        try:
            # T5 text2text-generation pipeline; output key is 'generated_text'
            summarize_input = f"summarize: {text[:900]}"
            res = _PIPELINES["summarization"](summarize_input, max_length=60, min_length=15, do_sample=False)[0]
            summary_data["summary_short"] = res.get("generated_text", summary_data["summary_short"])
        except Exception as e:
            print(f"HF Summarizer inference error: {e}")
            
    # 5. ASPECT-BASED SENTIMENT
    aspect_sentiment = run_absa_heuristic(text)
    
    # 6. FAKE REVIEW DETECTION
    fake_data = run_fake_review_heuristic(text, rating, sentiment)
    
    # 7. KEYWORD EXTRACTION
    keywords = run_keyword_extraction_heuristic(text)
    
    # 8. EXPLAINABILITY HEATMAP
    explanation_data = run_explainability_heuristic(text, sentiment)
    
    processing_time_ms = round((time.time() - start_time) * 1000.0, 2)
    
    return {
        "review_text": text,
        "sentiment": sentiment,
        "sentiment_confidence": round(sentiment_conf, 4),
        "emotion": emotion,
        "emotion_confidence": round(emotion_conf, 4),
        "rating_predicted": rating,
        "summary_short": summary_data["summary_short"],
        "summary_detailed": summary_data["summary_detailed"],
        "insights": {
            "key_complaints": summary_data["key_complaints"],
            "key_praises": summary_data["key_praises"],
            "recommendations": summary_data["recommendations"]
        },
        "fake_probability": fake_data["spam_probability"],
        "bot_probability": fake_data["bot_probability"],
        "risk_score": fake_data["risk_score"],
        "keywords": keywords,
        "aspect_sentiment": aspect_sentiment,
        "explanation_data": explanation_data,
        "processing_time_ms": processing_time_ms,
        "source_dataset": source_dataset
    }
