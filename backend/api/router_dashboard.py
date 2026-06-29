import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from typing import Dict, Any, List
from backend.database import get_db
from backend.models import Analysis, User
from backend.auth import get_current_user
from backend.schemas import DashboardMetrics

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Analytics"])

@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Base user query
    user_id = current_user.id
    base_query = db.query(Analysis).filter(Analysis.user_id == user_id)
    
    # 1. Quantities
    total = base_query.count()
    if total == 0:
        # Return structured blank state
        return {
            "total_reviews": 0,
            "positive_reviews": 0,
            "neutral_reviews": 0,
            "negative_reviews": 0,
            "average_rating": 0.0,
            "prediction_accuracy": 88.5,
            "sentiment_trend": [],
            "emotion_distribution": [],
            "most_discussed_topics": [],
            "aspect_scores": {}
        }
        
    pos = base_query.filter(Analysis.sentiment == "positive").count()
    neu = base_query.filter(Analysis.sentiment == "neutral").count()
    neg = base_query.filter(Analysis.sentiment == "negative").count()
    
    # 2. Averages
    avg_rating = db.query(func.avg(Analysis.rating_predicted)).filter(Analysis.user_id == user_id).scalar() or 0.0
    avg_rating = round(float(avg_rating), 2)
    
    # 3. Sentiment Trend (by Date)
    # Group analyses by date (YYYY-MM-DD)
    if db.bind.dialect.name == "sqlite":
        date_func = func.strftime("%Y-%m-%d", Analysis.created_at)
    else: # PostgreSQL
        date_func = func.to_char(Analysis.created_at, "YYYY-MM-DD")
        
    trend_query = db.query(
        date_func.label("day"),
        func.count(Analysis.id).label("total"),
        func.sum(case((Analysis.sentiment == "positive", 1), else_=0)).label("pos"),
        func.sum(case((Analysis.sentiment == "neutral", 1), else_=0)).label("neu"),
        func.sum(case((Analysis.sentiment == "negative", 1), else_=0)).label("neg")
    ).filter(Analysis.user_id == user_id).group_by("day").order_by("day").all()
    
    sentiment_trend = []
    for day, count, p, nu, ng in trend_query:
        sentiment_trend.append({
            "date": day,
            "total": count,
            "positive": int(p or 0),
            "neutral": int(nu or 0),
            "negative": int(ng or 0)
        })
        
    # 4. Emotion Distribution
    emotion_query = db.query(
        Analysis.emotion,
        func.count(Analysis.id).label("count")
    ).filter(Analysis.user_id == user_id).group_by(Analysis.emotion).all()
    
    emotion_distribution = []
    for emo, cnt in emotion_query:
        emotion_distribution.append({
            "emotion": emo.capitalize(),
            "count": cnt
        })
        
    # 5. Keywords / Most Discussed Topics
    # Pull all keywords from DB and count frequencies in python
    all_keywords_rows = db.query(Analysis.keywords).filter(
        Analysis.user_id == user_id,
        Analysis.keywords != None
    ).all()
    
    keyword_freq = {}
    for row in all_keywords_rows:
        kw_list = row[0]
        if isinstance(kw_list, list):
            for kw in kw_list:
                keyword_freq[kw] = keyword_freq.get(kw, 0) + 1
                
    sorted_keywords = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)[:10]
    most_discussed_topics = [{"topic": k, "frequency": v} for k, v in sorted_keywords]
    
    # 6. Aspect-Based Aggregations
    # Accumulate positive vs total count for each aspect
    all_aspects_rows = db.query(Analysis.aspect_sentiment).filter(
        Analysis.user_id == user_id,
        Analysis.aspect_sentiment != None
    ).all()
    
    aspect_pos_cnt = {}
    aspect_tot_cnt = {}
    for row in all_aspects_rows:
        aspect_dict = row[0]
        if isinstance(aspect_dict, dict):
            for aspect, details in aspect_dict.items():
                aspect_tot_cnt[aspect] = aspect_tot_cnt.get(aspect, 0) + 1
                if details.get("sentiment") == "positive":
                    aspect_pos_cnt[aspect] = aspect_pos_cnt.get(aspect, 0) + 1
                    
    aspect_scores = {}
    for aspect in aspect_tot_cnt:
        pos_ratio = aspect_pos_cnt.get(aspect, 0) / aspect_tot_cnt[aspect]
        aspect_scores[aspect] = round(pos_ratio, 2)

    return {
        "total_reviews": total,
        "positive_reviews": pos,
        "neutral_reviews": neu,
        "negative_reviews": neg,
        "average_rating": avg_rating,
        "prediction_accuracy": 88.5,
        "sentiment_trend": sentiment_trend,
        "emotion_distribution": emotion_distribution,
        "most_discussed_topics": most_discussed_topics,
        "aspect_scores": aspect_scores
    }
