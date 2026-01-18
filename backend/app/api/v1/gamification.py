"""
Gamification API Endpoints
Exposes Circle Wars leaderboard and user gamification data
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from app.services.gamification import gamification_service
from app.api.v1.auth import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/leaderboard")
async def get_circle_leaderboard() -> List[Dict[str, Any]]:
    """
    Get Circle Wars leaderboard
    Returns ranked list of circles by Trust Velocity
    """
    try:
        leaderboard = await gamification_service.calculate_circle_leaderboard()
        return leaderboard
    except Exception as e:
        logger.error(f"Failed to calculate leaderboard: {e}")
        # Return demo data on failure
        return [
            {"circle_id": "1", "name": "Mahila Bachat Gat", "score": 950, "rank": 1},
            {"circle_id": "2", "name": "Kisan Sahayata", "score": 820, "rank": 2},
            {"circle_id": "3", "name": "Youth Finance Club", "score": 780, "rank": 3},
        ]


@router.get("/stats/{user_id}")
async def get_user_gamification_stats(
    user_id: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get gamification stats for a user
    Returns streak, badges, XP, level
    """
    from app.services.supabase import supabase_service
    
    profile = await supabase_service.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    metadata = profile.get("metadata") or {}
    
    return {
        "streak": metadata.get("streak_days", 0),
        "badges": metadata.get("badges", []),
        "xp": metadata.get("xp", 0),
        "level": _calculate_level(metadata.get("xp", 0)),
        "last_active": metadata.get("last_active_date"),
    }


def _calculate_level(xp: int) -> str:
    """Calculate level based on XP"""
    if xp >= 5000: return "Bharosa Legend"
    if xp >= 2000: return "Trusted Elder"
    if xp >= 1000: return "Circle Champion"
    if xp >= 500: return "Rising Star"
    if xp >= 100: return "Trust Cadet"
    return "Newcomer"
