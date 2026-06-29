import pandas as pd
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from backend.database import get_db
from backend.models import Analysis, User
from backend.schemas import AnalysisRequest, AnalysisResponse
from backend.auth import get_current_user
from backend.services.ai_model import analyze_review_text
from backend.services.pdf_report import generate_pdf_report

router = APIRouter(prefix="/reviews", tags=["Review Analysis"])

@router.post("/analyze", response_model=AnalysisResponse)
def analyze_review(
    req: AnalysisRequest, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    try:
        # Run AI prediction pipelines
        result = analyze_review_text(req.review_text, req.source_dataset)
        
        # Save to database
        db_analysis = Analysis(
            user_id=current_user.id if current_user else None,
            review_text=result["review_text"],
            sentiment=result["sentiment"],
            sentiment_confidence=result["sentiment_confidence"],
            emotion=result["emotion"],
            emotion_confidence=result["emotion_confidence"],
            rating_predicted=result["rating_predicted"],
            summary_short=result["summary_short"],
            summary_detailed=result["summary_detailed"],
            insights=result["insights"],
            fake_probability=result["fake_probability"],
            bot_probability=result["bot_probability"],
            risk_score=result["risk_score"],
            keywords=result["keywords"],
            aspect_sentiment=result["aspect_sentiment"],
            explanation_data=result["explanation_data"],
            processing_time_ms=result["processing_time_ms"],
            source_dataset=result["source_dataset"]
        )
        
        db.add(db_analysis)
        db.commit()
        db.refresh(db_analysis)
        return db_analysis
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis pipeline execution failed: {str(e)}"
        )

@router.post("/upload", response_model=List[AnalysisResponse])
async def upload_batch(
    file: UploadFile = File(...),
    dataset_name: Optional[str] = Form("uploaded_batch"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    filename = file.filename.lower()
    contents = await file.read()
    
    # 1. Parse File into a Pandas DataFrame
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(io.BytesIO(contents))
        elif filename.endswith(".txt"):
            lines = contents.decode("utf-8").split("\n")
            df = pd.DataFrame([line.strip() for line in lines if line.strip()], columns=["review"])
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. Please upload a .csv, .xlsx, or .txt file."
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse uploaded file: {str(e)}"
        )

    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file contains no rows."
        )

    # 2. Automatically detect dataset column headers
    # Standard synonyms for review body content
    review_synonyms = ["review", "text", "body", "comment", "feedback", "content", "review_text", "message"]
    review_col = None
    for col in df.columns:
        if col.lower() in review_synonyms:
            review_col = col
            break
    if not review_col:
        # Fallback to the first column containing string values
        for col in df.columns:
            if df[col].dtype == object:
                review_col = col
                break
                
    if not review_col:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not find review text column. Verified headers: {list(df.columns)}"
        )

    # 3. Analyze reviews (limit to first 100 to prevent timeouts/RAM limit in dev environment)
    batch_limit = 100
    records_to_analyze = df[review_col].dropna().tolist()[:batch_limit]
    
    results = []
    for text in records_to_analyze:
        text_str = str(text).strip()
        if len(text_str) < 3:
            continue
        try:
            res = analyze_review_text(text_str, dataset_name)
            
            db_analysis = Analysis(
                user_id=current_user.id,
                review_text=res["review_text"],
                sentiment=res["sentiment"],
                sentiment_confidence=res["sentiment_confidence"],
                emotion=res["emotion"],
                emotion_confidence=res["emotion_confidence"],
                rating_predicted=res["rating_predicted"],
                summary_short=res["summary_short"],
                summary_detailed=res["summary_detailed"],
                insights=res["insights"],
                fake_probability=res["fake_probability"],
                bot_probability=res["bot_probability"],
                risk_score=res["risk_score"],
                keywords=res["keywords"],
                aspect_sentiment=res["aspect_sentiment"],
                explanation_data=res["explanation_data"],
                processing_time_ms=res["processing_time_ms"],
                source_dataset=res["source_dataset"]
            )
            db.add(db_analysis)
            results.append(db_analysis)
        except Exception as ex:
            print(f"Error analyzing batch record: {ex}")
            
    db.commit()
    for item in results:
        db.refresh(item)
        
    return results

@router.get("/history", response_model=List[AnalysisResponse])
def get_history(
    skip: int = 0,
    limit: int = 50,
    sentiment: Optional[str] = None,
    emotion: Optional[str] = None,
    rating: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Analysis).filter(Analysis.user_id == current_user.id)
    
    if sentiment:
        query = query.filter(Analysis.sentiment == sentiment.lower())
    if emotion:
        query = query.filter(Analysis.emotion == emotion.lower())
    if rating:
        query = query.filter(Analysis.rating_predicted == rating)
    if search:
        query = query.filter(
            or_(
                Analysis.review_text.ilike(f"%{search}%"),
                Analysis.summary_short.ilike(f"%{search}%")
            )
        )
        
    # Order by newest first
    query = query.order_by(desc(Analysis.created_at))
    return query.offset(skip).limit(limit).all()

@router.delete("/analysis/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(
    analysis_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(Analysis).filter(
        Analysis.id == analysis_id, 
        Analysis.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis record not found or unauthorized to delete."
        )
        
    db.delete(record)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/export/csv")
def export_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    records = db.query(Analysis).filter(Analysis.user_id == current_user.id).all()
    if not records:
        raise HTTPException(status_code=400, detail="No historical logs found to export.")
        
    data = []
    for r in records:
        data.append({
            "ID": r.id,
            "Date": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "Review Text": r.review_text,
            "Sentiment": r.sentiment,
            "Sentiment Confidence": r.sentiment_confidence,
            "Emotion": r.emotion,
            "Emotion Confidence": r.emotion_confidence,
            "Predicted Rating": r.rating_predicted,
            "Short Summary": r.summary_short,
            "Risk Score": r.risk_score,
            "Dataset Source": r.source_dataset
        })
        
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    response = StreamingResponse(
        iter([stream.getvalue()]), 
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=sentiment_history.csv"
    return response

@router.get("/export/xlsx")
def export_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    records = db.query(Analysis).filter(Analysis.user_id == current_user.id).all()
    if not records:
        raise HTTPException(status_code=400, detail="No historical logs found to export.")
        
    data = []
    for r in records:
        data.append({
            "ID": r.id,
            "Date": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "Review Text": r.review_text,
            "Sentiment": r.sentiment,
            "Sentiment Confidence": r.sentiment_confidence,
            "Emotion": r.emotion,
            "Emotion Confidence": r.emotion_confidence,
            "Predicted Rating": r.rating_predicted,
            "Short Summary": r.summary_short,
            "Risk Score": r.risk_score,
            "Dataset Source": r.source_dataset
        })
        
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Reviews History")
        
    output.seek(0)
    response = StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response.headers["Content-Disposition"] = "attachment; filename=sentiment_history.xlsx"
    return response

@router.get("/export/pdf")
def export_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    records = db.query(Analysis).filter(Analysis.user_id == current_user.id).all()
    if not records:
        raise HTTPException(status_code=400, detail="No logs found to compile PDF.")

    # 1. Compile summary statistics
    total = len(records)
    positives = sum(1 for r in records if r.sentiment == "positive")
    neutrals = sum(1 for r in records if r.sentiment == "neutral")
    negatives = sum(1 for r in records if r.sentiment == "negative")
    avg_rating = sum(r.rating_predicted for r in records) / total if total > 0 else 0.0
    avg_risk = sum(r.risk_score for r in records) / total if total > 0 else 0.0
    
    # Primary emotion
    emotions = [r.emotion for r in records]
    primary_emotion = max(set(emotions), key=emotions.count) if emotions else "Joy"
    
    # Aspect sentiments aggregated
    aspect_scores = {}
    aspect_counts = {}
    for r in records:
        if r.aspect_sentiment:
            for aspect, details in r.aspect_sentiment.items():
                is_pos = 1 if details.get("sentiment") == "positive" else 0
                aspect_scores[aspect] = aspect_scores.get(aspect, 0.0) + is_pos
                aspect_counts[aspect] = aspect_counts.get(aspect, 0) + 1
                
    aggregated_aspects = {}
    for aspect in aspect_scores:
        aggregated_aspects[aspect] = aspect_scores[aspect] / aspect_counts[aspect]

    summary_stats = {
        "total_reviews": total,
        "positive_percentage": (positives / total) * 100 if total > 0 else 0.0,
        "average_rating": avg_rating,
        "average_risk_score": avg_risk,
        "primary_emotion": primary_emotion,
        "aspect_scores": aggregated_aspects
    }

    # Convert SQLAlchemy models to dicts for pdf generator utility
    analyses_dicts = []
    for r in records:
        analyses_dicts.append({
            "review_text": r.review_text,
            "rating_predicted": r.rating_predicted,
            "sentiment": r.sentiment,
            "emotion": r.emotion,
            "risk_score": r.risk_score
        })

    pdf_buffer = generate_pdf_report(analyses_dicts, summary_stats)
    
    response = StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf"
    )
    response.headers["Content-Disposition"] = "attachment; filename=sentiment_report.pdf"
    return response
