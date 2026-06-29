from pydantic import BaseModel, EmailStr, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# --- Analysis Schemas ---
class AnalysisRequest(BaseModel):
    review_text: str = Field(..., min_length=3)
    source_dataset: Optional[str] = "custom"  # 'custom', 'imdb', 'amazon', 'flipkart', 'yelp'

class AnalysisResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    review_text: str
    sentiment: str
    sentiment_confidence: float
    emotion: str
    emotion_confidence: float
    rating_predicted: int
    summary_short: Optional[str] = None
    summary_detailed: Optional[str] = None
    insights: Optional[Dict[str, Any]] = None
    fake_probability: float
    bot_probability: float
    risk_score: float
    keywords: Optional[List[str]] = None
    aspect_sentiment: Optional[Dict[str, Any]] = None
    explanation_data: Optional[List[Dict[str, Any]]] = None
    processing_time_ms: float
    source_dataset: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Dashboard Schemas ---
class DashboardMetrics(BaseModel):
    total_reviews: int
    positive_reviews: int
    neutral_reviews: int
    negative_reviews: int
    average_rating: float
    prediction_accuracy: float
    sentiment_trend: List[Dict[str, Any]]
    emotion_distribution: List[Dict[str, Any]]
    most_discussed_topics: List[Dict[str, Any]]
    aspect_scores: Dict[str, Any]

class AnalyticsOverview(BaseModel):
    sentiment_counts: Dict[str, int]
    emotion_counts: Dict[str, int]
    rating_distribution: Dict[int, int]
    aspect_sentiment: Dict[str, Dict[str, int]]
    recent_reviews: List[AnalysisResponse]


# --- Model Status Schemas ---
class ModelStatusResponse(BaseModel):
    id: int
    model_name: str
    task: str
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    status: str
    last_updated: datetime

    class Config:
        from_attributes = True
