from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from backend.config import settings
from backend.database import engine, Base, SessionLocal
from backend.api import router_auth, router_analyze, router_dashboard, router_admin
from backend.services.ai_model import load_transformers_models_async, initialize_db_model_status

app = FastAPI(
    title="Sentiment Analysis of Reviews API",
    description="Enterprise-grade NLP API backend for Review Summarization, ABSA, and Fake Review Detection.",
    version="1.0.0"
)

# CORS Configuration
# Allow all origins in development, but restrict as necessary in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup DB initialization & Model Loading
@app.on_event("startup")
def startup_event():
    # 1. Create SQL Database tables if they do not exist
    Base.metadata.create_all(bind=engine)
    
    # 2. Add baseline model metadata rows
    db = SessionLocal()
    try:
        initialize_db_model_status(db)
    finally:
        db.close()
        
    # 3. Load Hugging Face pipelines asynchronously
    load_transformers_models_async(SessionLocal)

# Global API routers
app.include_router(router_auth.router, prefix="/api")
app.include_router(router_analyze.router, prefix="/api")
app.include_router(router_dashboard.router, prefix="/api")
app.include_router(router_admin.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "name": "Sentiment Analysis of Reviews API",
        "version": "1.0.0",
        "documentation": "/docs",
        "status": "online"
    }

# General API health check endpoint (matching POST /analyze, GET /health requests)
@app.get("/api/health")
def api_health():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "api_endpoints_active": True
    }

# Simple Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )
