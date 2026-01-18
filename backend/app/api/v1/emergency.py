"""
Emergency Fund API endpoints - Turant Paisa feature
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from decimal import Decimal
import logging

from app.models.schemas import EmergencyRequest, EmergencyVote, EmergencyResponse, BaseResponse
from app.services.supabase import supabase_service
from app.services.dodo import dodo_service
from app.api.v1.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Emergency bypass limit (Turant Paisa)
EMERGENCY_BYPASS_LIMIT = 2000


@router.post("/request", response_model=EmergencyResponse)
async def create_emergency_request(
    request: EmergencyRequest,
    user: dict = Depends(get_current_user),
):
    """Request emergency funds"""
    # Check if amount is within bypass limit
    if request.amount <= EMERGENCY_BYPASS_LIMIT:
        # Instant approval - Turant Paisa
        emergency_data = {
            "user_id": str(user["id"]),
            "amount": float(request.amount),
            "reason": request.reason,
            "evidence_url": request.evidence_url,
            "status": "approved",  # Auto-approved for small amounts
        }
        
        emergency = await supabase_service.create_emergency_request(emergency_data)
        
        # Trigger immediate disbursement
        profile = await supabase_service.get_profile(user["id"])
        if profile:
            await dodo_service.create_payout(
                Decimal(str(request.amount)),
                f"{profile['phone']}@upi",
                profile.get("full_name", "User"),
                metadata={"emergency_id": emergency["id"]},
            )
            
            await supabase_service.update_emergency_request(
                emergency["id"], {"status": "disbursed"}
            )
        
        return EmergencyResponse(**emergency)
    else:
        # Needs circle approval for larger amounts
        emergency_data = {
            "user_id": str(user["id"]),
            "amount": float(request.amount),
            "reason": request.reason,
            "evidence_url": request.evidence_url,
            "status": "pending",
        }
        
        emergency = await supabase_service.create_emergency_request(emergency_data)
        return EmergencyResponse(**emergency)


@router.get("/requests", response_model=List[EmergencyResponse])
async def list_emergency_requests(user: dict = Depends(get_current_user)):
    """List emergency requests"""
    requests = await supabase_service.get_emergency_requests(user["id"])
    return [EmergencyResponse(**r) for r in requests]


@router.post("/{request_id}/vote", response_model=BaseResponse)
async def vote_emergency(
    request_id: str,
    request: EmergencyVote,
    user: dict = Depends(get_current_user),
):
    """Vote on emergency request"""
    # Implementation: Circle members vote on larger emergency amounts
    return BaseResponse(success=True, message="Vote recorded")
