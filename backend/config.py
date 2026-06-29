import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./sentiment_platform.db"
    JWT_SECRET: str = "4f2a7b8e9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Model Cache Directory (inside workspace)
    MODEL_CACHE_DIR: str = "./model_cache"
    
    # Hugging Face Models
    MODEL_SENTIMENT: str = "lxyuan/distilbert-base-multilingual-cased-sentiments-student"
    MODEL_EMOTION: str = "bhadresh-savani/distilbert-base-uncased-emotion"
    MODEL_SUMMARIZATION: str = "t5-small"
    
    # Rate Limiting
    RATE_LIMIT_CALLS: int = 60
    RATE_LIMIT_PERIOD: int = 60  # seconds

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure model cache dir exists
os.makedirs(settings.MODEL_CACHE_DIR, exist_ok=True)
