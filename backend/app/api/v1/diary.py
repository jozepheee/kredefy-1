"""
Financial Diary API - Voice-first expense tracking
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import base64

from app.models.schemas import DiaryEntryCreate, DiaryEntryResponse, DiarySummary, BaseResponse
from app.services.supabase import supabase_service
from app.services.groq import groq_service
from app.api.v1.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/voice", response_model=DiaryEntryResponse)
async def create_voice_entry(
    audio: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Create diary entry from voice recording"""
    try:
        # Read audio file
        audio_content = await audio.read()
        
        # Transcribe using Groq Whisper
        transcription = await groq_service.transcribe(audio_content)
        
        # Categorize using AI
        categorized = await groq_service.categorize_expense(transcription)
        
        # Create entry
        entry_data = {
            "user_id": str(user["id"]),
            "type": categorized.get("type", "expense"),
            "amount": categorized.get("amount", 0),
            "category": categorized.get("category", "other"),
            "description": transcription[:200],
            "transcription": transcription,
            "recorded_at": datetime.utcnow().isoformat(),
        }
        
        entry = await supabase_service.create_diary_entry(entry_data)
        return DiaryEntryResponse(**entry)
    except Exception as e:
        logger.error(f"Voice entry failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("", response_model=DiaryEntryResponse)
async def create_entry(
    request: DiaryEntryCreate,
    user: dict = Depends(get_current_user),
):
    """Create diary entry from text"""
    entry_data = {
        "user_id": str(user["id"]),
        "type": request.type,
        "amount": float(request.amount),
        "category": request.category or "other",
        "description": request.description,
        "recorded_at": datetime.utcnow().isoformat(),
    }
    
    entry = await supabase_service.create_diary_entry(entry_data)
    return DiaryEntryResponse(**entry)


@router.get("", response_model=List[DiaryEntryResponse])
async def list_entries(
    limit: int = 50,
    user: dict = Depends(get_current_user),
):
    """List diary entries"""
    entries = await supabase_service.get_diary_entries(user["id"], limit)
    return [DiaryEntryResponse(**e) for e in entries]


@router.get("/summary", response_model=DiarySummary)
async def get_summary(
    period: str = "week",  # "week" or "month"
    user: dict = Depends(get_current_user),
):
    """Get financial summary for period"""
    entries = await supabase_service.get_diary_entries(user["id"], 100)
    
    # Filter by period
    now = datetime.utcnow()
    if period == "week":
        cutoff = now - timedelta(days=7)
    else:
        cutoff = now - timedelta(days=30)
    
    filtered = [e for e in entries if datetime.fromisoformat(e["recorded_at"].replace("Z", "")) > cutoff]
    
    total_income = sum(Decimal(str(e["amount"])) for e in filtered if e["type"] == "income")
    total_expense = sum(Decimal(str(e["amount"])) for e in filtered if e["type"] == "expense")
    
    # Calculate top categories
    categories = {}
    for e in filtered:
        cat = e.get("category", "other")
        categories[cat] = categories.get(cat, 0) + float(e["amount"])
    
    top_categories = sorted(
        [{"category": k, "amount": v} for k, v in categories.items()],
        key=lambda x: x["amount"],
        reverse=True
    )[:5]
    
    return DiarySummary(
        period=period,
        total_income=total_income,
        total_expense=total_expense,
        net=total_income - total_expense,
        top_categories=top_categories,
    )
