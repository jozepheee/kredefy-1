"""
Trust Score API - Bharosa Meter
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
import logging

from app.models.schemas import TrustScoreResponse, TrustScoreHistory
from app.services.supabase import supabase_service
from app.services.blockchain import blockchain_service
from app.api.v1.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


def get_trust_level(score: int) -> str:
    """Convert score to visual level"""
    if score >= 80:
        return "Pakka Bharosa"  # Highly trusted
    elif score >= 60:
        return "Bhrosemand"  # Trusted
    elif score >= 30:
        return "Building"
    return "Naya"  # New


def get_visual_dots(score: int) -> dict:
    """Get visual representation for Bharosa Meter"""
    dots = score // 10  # 0-10 dots
    return {
        "green_dots": min(dots, 10),
        "gray_dots": 10 - min(dots, 10),
        "percentage": score,
    }


@router.get("", response_model=TrustScoreResponse)
async def get_my_trust_score(user: dict = Depends(get_current_user)):
    """Get my trust score with Bharosa Meter visualization"""
    profile = await supabase_service.get_profile(user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    score = profile.get("trust_score", 0)
    
    # Get score components
    vouches_received = await supabase_service.get_vouches_received(user["id"])
    loans = await supabase_service.get_user_loans(user["id"])
    
    completed_loans = sum(1 for l in loans if l.get("status") == "completed")
    active_vouches = sum(1 for v in vouches_received if v.get("status") == "active")
    
    components = {
        "base_score": 10,
        "vouches": active_vouches * 5,
        "completed_loans": completed_loans * 10,
        "on_time_payments": min((score - 10 - active_vouches * 5 - completed_loans * 10), 50),
    }
    
    return TrustScoreResponse(
        score=score,
        level=get_trust_level(score),
        components=components,
        last_updated=profile.get("updated_at"),
        blockchain_tx_hash=None,
    )


@router.get("/visual")
async def get_bharosa_meter(user: dict = Depends(get_current_user)):
    """Get Bharosa Meter visual data"""
    profile = await supabase_service.get_profile(user["id"])
    score = profile.get("trust_score", 0) if profile else 0
    
    visual = get_visual_dots(score)
    
    return {
        **visual,
        "level": get_trust_level(score),
        "message_en": f"{visual['green_dots']} out of 10 people trust you",
        "message_hi": f"10 में से {visual['green_dots']} लोग आप पर भरोसा करते हैं",
        "message_ml": f"10-ൽ {visual['green_dots']} പേർ നിങ്ങളെ വിശ്വസിക്കുന്നു",
    }


@router.get("/bharosa-meter")
async def get_bharosa_meter_alias(user: dict = Depends(get_current_user)):
    """Alias for /visual to match frontend requests"""
    return await get_bharosa_meter(user)


@router.get("/history", response_model=List[TrustScoreHistory])
async def get_trust_history(user: dict = Depends(get_current_user)):
    """Get trust score history"""
    history = await supabase_service.get_trust_score_history(user["id"])
    return [TrustScoreHistory(**h) for h in history]


@router.get("/{user_id}")
async def get_user_trust_score(
    user_id: str,
    user: dict = Depends(get_current_user),
):
    """Get another user's public trust score"""
    profile = await supabase_service.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    score = profile.get("trust_score", 0)
    
    return {
        "user_id": user_id,
        "full_name": profile.get("full_name"),
        "score": score,
        "level": get_trust_level(score),
        "visual": get_visual_dots(score),
    }
