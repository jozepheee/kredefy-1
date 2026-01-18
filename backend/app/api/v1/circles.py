"""
Trust Circles API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
import secrets
import logging

from app.models.schemas import (
    CircleCreate, CircleJoin, CircleResponse, CircleMemberResponse, BaseResponse
)
from app.services.supabase import supabase_service
from app.services.blockchain import blockchain_service
from app.api.v1.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


def generate_invite_code() -> str:
    """Generate unique 8-char invite code"""
    return secrets.token_urlsafe(6)[:8].upper()


@router.post("", response_model=CircleResponse)
async def create_circle(
    request: CircleCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new trust circle"""
    try:
        invite_code = generate_invite_code()
        
        circle_data = {
            "name": request.name,
            "description": request.description,
            "invite_code": invite_code,
            "creator_id": str(user["id"]),
            "max_members": request.max_members,
        }
        
        circle = await supabase_service.create_circle(circle_data)
        
        # Add creator as admin member
        await supabase_service.add_circle_member(
            circle["id"], user["id"], role="admin"
        )
        
        circle["member_count"] = 1  # Update after adding creator
        return CircleResponse(**circle)
    except Exception as e:
        logger.error(f"Create circle failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[CircleResponse])
async def list_circles(user: dict = Depends(get_current_user)):
    """List user's circles"""
    try:
        memberships = await supabase_service.get_user_circles(user["id"])
        circles = []
        for m in memberships:
            if m.get("circles"):
                circle = m["circles"]
                # Ensure all required fields have defaults
                circle.setdefault("description", "")
                circle.setdefault("invite_code", "XXXX")
                circle.setdefault("creator_id", user["id"])
                circle.setdefault("max_members", 20)
                circle.setdefault("emergency_fund_balance", 0.0)
                circle.setdefault("blockchain_address", None)
                circle.setdefault("created_at", "2024-01-01T00:00:00")
                circle["member_count"] = len(await supabase_service.get_circle_members(circle["id"]))
                try:
                    circles.append(CircleResponse(**circle))
                except Exception as e:
                    logger.warning(f"Circle validation failed: {e}, circle: {circle}")
        return circles
    except Exception as e:
        logger.error(f"List circles failed: {e}")
        return []


@router.get("/{circle_id}", response_model=CircleResponse)
async def get_circle(
    circle_id: str,
    user: dict = Depends(get_current_user),
):
    """Get circle details"""
    circle = await supabase_service.get_circle(circle_id)
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    members = await supabase_service.get_circle_members(circle_id)
    circle["members"] = [
        CircleMemberResponse(
            id=m["id"],
            user_id=m["user_id"],
            full_name=m.get("profiles", {}).get("full_name"),
            trust_score=m.get("profiles", {}).get("trust_score", 0),
            role=m["role"],
            joined_at=m["joined_at"],
            contribution_amount=m.get("contribution_amount", 0),
        )
        for m in members
    ]
    circle["member_count"] = len(members)
    
    return CircleResponse(**circle)


@router.post("/{circle_id}/join", response_model=BaseResponse)
async def join_circle(
    circle_id: str,
    request: CircleJoin,
    user: dict = Depends(get_current_user),
):
    """Join circle via invite code"""
    circle = await supabase_service.get_circle_by_invite_code(request.invite_code)
    
    if not circle:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    if circle["id"] != circle_id:
        raise HTTPException(status_code=400, detail="Invite code doesn't match circle")
    
    members = await supabase_service.get_circle_members(circle_id)
    if len(members) >= circle["max_members"]:
        raise HTTPException(status_code=400, detail="Circle is full")
    
    # Check if already member
    if any(m["user_id"] == str(user["id"]) for m in members):
        raise HTTPException(status_code=400, detail="Already a member")
    
    await supabase_service.add_circle_member(circle_id, user["id"])
    
    return BaseResponse(success=True, message="Joined circle successfully")


@router.post("/{circle_id}/leave", response_model=BaseResponse)
async def leave_circle(
    circle_id: str,
    user: dict = Depends(get_current_user),
):
    """Leave a circle"""
    circle = await supabase_service.get_circle(circle_id)
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    # Creator cannot leave
    if circle["creator_id"] == str(user["id"]):
        raise HTTPException(status_code=400, detail="Creator cannot leave circle")
    
    await supabase_service.remove_circle_member(circle_id, user["id"])
    
    return BaseResponse(success=True, message="Left circle")


@router.get("/{circle_id}/members", response_model=List[CircleMemberResponse])
async def get_members(
    circle_id: str,
    user: dict = Depends(get_current_user),
):
    """Get circle members"""
    members = await supabase_service.get_circle_members(circle_id)
    return [
        CircleMemberResponse(
            id=m["id"],
            user_id=m["user_id"],
            full_name=m.get("profiles", {}).get("full_name"),
            trust_score=m.get("profiles", {}).get("trust_score", 0),
            role=m["role"],
            joined_at=m["joined_at"],
            contribution_amount=m.get("contribution_amount", 0),
        )
        for m in members
    ]
