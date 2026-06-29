import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="user")  # 'user', 'admin'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    review_text = Column(Text, nullable=False)
    
    # Sentiment Results
    sentiment = Column(String, nullable=False)  # 'positive', 'neutral', 'negative'
    sentiment_confidence = Column(Float, nullable=False)
    
    # Emotion Results
    emotion = Column(String, nullable=False)  # 'joy', 'anger', 'sadness', 'love', 'fear', 'surprise'
    emotion_confidence = Column(Float, nullable=False)
    
    # Predictions
    rating_predicted = Column(Integer, nullable=False)  # 1 to 5 stars
    
    # Summarization
    summary_short = Column(Text, nullable=True)
    summary_detailed = Column(Text, nullable=True)
    insights = Column(JSON, nullable=True)  # List/dict of key complaints, praises, recommendations
    
    # Fake Review Detection
    fake_probability = Column(Float, nullable=False)
    bot_probability = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    
    # Key entities/words
    keywords = Column(JSON, nullable=True)  # List of strings
    
    # Aspect-based sentiment
    aspect_sentiment = Column(JSON, nullable=True)  # Dict: {aspect: {sentiment: 'pos/neu/neg', score: float}}
    
    # Explainability Data
    explanation_data = Column(JSON, nullable=True)  # List of dicts: [{'word': str, 'score': float}]
    
    # Performance & Source
    processing_time_ms = Column(Float, nullable=False)
    source_dataset = Column(String, default="custom")  # 'custom', 'imdb', 'amazon', 'flipkart', 'yelp'
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="analyses")


class ModelStatus(Base):
    __tablename__ = "model_status"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, unique=True, index=True, nullable=False)
    task = Column(String, nullable=False)  # 'sentiment', 'emotion', 'summarization'
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    status = Column(String, default="loading")  # 'loading', 'active', 'failed'
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
