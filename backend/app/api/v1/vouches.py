"""
Vouching API endpoints - Using Domain Service
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List
from decimal import Decimal
import logging

from app.models.schemas import VouchCreate, VouchResponse, BaseResponse
from app.domain.services import vouching_service
from app.services.supabase import supabase_service
from app.api.v1.auth import get_current_user
from app.api.v1 import vouch_request

router = APIRouter()
logger = logging.getLogger(__name__)

# Include vouch request routes
router.include_router(vouch_request.router, tags=["Vouch Requests"])


@router.post("", response_model=VouchResponse)
async def create_vouch(
    request: VouchCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """
    Create a vouch by staking SAATHI tokens
    
    Business logic handled by VouchingDomainService:
    1. Validates balance and vouch level
    2. Deducts SAATHI atomically
    3. Records vouch in database
    4. Updates vouchee trust score
    5. Records on blockchain (background)
    """
    try:
        vouch = await vouching_service.create_vouch(
            voucher_id=user["id"],
            vouchee_id=request.vouchee_id,
            circle_id=request.circle_id,
            vouch_level=request.vouch_level,
            saathi_amount=request.saathi_required,
        )
        
        return VouchResponse(**vouch)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Create vouch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create vouch")


@router.get("/given", response_model=List[VouchResponse])
async def get_vouches_given(user: dict = Depends(get_current_user)):
    """Get vouches I've given"""
    vouches = await supabase_service.get_vouches_given(user["id"])
    return [VouchResponse(**v) for v in vouches]


@router.get("/received", response_model=List[VouchResponse])
async def get_vouches_received(user: dict = Depends(get_current_user)):
    """Get vouches I've received"""
    vouches = await supabase_service.get_vouches_received(user["id"])
    return [VouchResponse(**v) for v in vouches]


@router.delete("/{vouch_id}", response_model=BaseResponse)
async def revoke_vouch(
    vouch_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Revoke a vouch (only if vouchee has no active loans)
    Returns staked SAATHI to voucher
    """
    # Get vouch
    vouches = await supabase_service.get_vouches_given(user["id"])
    vouch = next((v for v in vouches if v["id"] == vouch_id), None)
    
    if not vouch:
        raise HTTPException(status_code=404, detail="Vouch not found")
    
    if vouch["status"] != "active":
        raise HTTPException(status_code=400, detail="Vouch is not active")
    
    # Check if vouchee has active loans
    vouchee_loans = await supabase_service.get_user_loans(vouch["vouchee_id"])
    active_loans = [l for l in vouchee_loans if l["status"] in ["voting", "approved", "disbursed", "repaying"]]
    
    if active_loans:
        raise HTTPException(
            status_code=400,
            detail="Cannot revoke vouch while vouchee has active loans"
        )
    
    # Return staked SAATHI
    await supabase_service.update_saathi_balance(
        user["id"], float(vouch["saathi_staked"])
    )
    
    # Update vouch status
    await supabase_service.update_vouch_status(vouch_id, "returned")
    
    # Record transaction
    await supabase_service.create_saathi_transaction({
        "user_id": str(user["id"]),
        "type": "unstake",
        "amount": float(vouch["saathi_staked"]),
        "reference_id": vouch_id,
        "description": "Vouch revoked, stake returned",
    })
    
    logger.info(f"Vouch revoked: {vouch_id}, returned {vouch['saathi_staked']} SAATHI")
    
    return BaseResponse(success=True, message="Vouch revoked, SAATHI returned")


@router.get("/levels")
async def get_vouch_levels():
    """Get available vouch levels with requirements"""
    return {
        "levels": [
            {
                "name": "basic",
                "min_stake": 10,
                "max_stake": 50,
                "trust_impact": 5,
                "description": "Entry level vouch for casual acquaintances",
            },
            {
                "name": "strong",
                "min_stake": 50,
                "max_stake": 200,
                "trust_impact": 10,
                "description": "Strong vouch for people you know well",
            },
            {
                "name": "maximum",
                "min_stake": 200,
                "max_stake": 500,
                "trust_impact": 20,
                "description": "Maximum trust - for close family/friends",
            },
        ]
    }
