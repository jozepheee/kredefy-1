"""
Saathi Token API
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from decimal import Decimal
import logging

from app.models.schemas import (
    SaathiBalanceResponse, SaathiStakeRequest, SaathiTransactionResponse, 
    SaathiBuyRequest, BaseResponse
)
from app.services.supabase import supabase_service
from app.services.blockchain import blockchain_service
from app.api.v1.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/balance", response_model=SaathiBalanceResponse)
async def get_saathi_balance(user: dict = Depends(get_current_user)):
    """Get SAATHI token balance"""
    profile = await supabase_service.get_profile(user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    total_balance = Decimal(str(profile.get("saathi_balance", 0)))
    
    # Calculate staked amount from active vouches
    vouches = await supabase_service.get_vouches_given(user["id"])
    staked = sum(
        Decimal(str(v.get("saathi_staked", 0)))
        for v in vouches
        if v.get("status") == "active"
    )
    
    return SaathiBalanceResponse(
        balance=total_balance,
        staked=staked,
        available=total_balance - staked,
        pending_rewards=Decimal(0),  # Could calculate from pending rewards
    )


@router.get("/transactions", response_model=List[SaathiTransactionResponse])
async def get_transactions(
    limit: int = 50,
    user: dict = Depends(get_current_user),
):
    """Get SAATHI transaction history"""
    transactions = await supabase_service.get_saathi_transactions(user["id"], limit)
    return [SaathiTransactionResponse(**t) for t in transactions]


@router.post("/claim", response_model=BaseResponse)
async def claim_rewards(user: dict = Depends(get_current_user)):
    """Claim pending SAATHI rewards"""
    # Calculate rewards from completed vouches
    vouches = await supabase_service.get_vouches_given(user["id"])
    
    claimable = 0
    for vouch in vouches:
        if vouch.get("status") == "returned":
            # 5% reward on returned vouches
            claimable += float(vouch.get("saathi_staked", 0)) * 0.05
    
    if claimable > 0:
        await supabase_service.update_saathi_balance(user["id"], claimable)
        await supabase_service.create_saathi_transaction({
            "user_id": str(user["id"]),
            "type": "reward",
            "amount": claimable,
        })
        
        return BaseResponse(success=True, message=f"Claimed {claimable} SAATHI")
    
    return BaseResponse(success=True, message="No rewards to claim")


@router.post("/claim-rewards")
async def claim_rewards_alias(user: dict = Depends(get_current_user)):
    """Alias for /claim to match frontend requests"""
    return await claim_rewards(user)


@router.post("/earn/learning", response_model=BaseResponse)
async def earn_from_learning(
    module_id: str,
    user: dict = Depends(get_current_user),
):
    """Earn SAATHI from completing learning modules"""
    # Seekh aur Kamaao feature
    reward_amounts = {
        "basics": 5,
        "emi_explained": 2,
        "savings_tips": 3,
        "trust_building": 5,
    }
    
    reward = reward_amounts.get(module_id, 1)
    
    await supabase_service.update_saathi_balance(user["id"], reward)
    await supabase_service.create_saathi_transaction({
        "user_id": str(user["id"]),
        "type": "reward",
        "amount": reward,
    })
    
    profile = await supabase_service.get_profile(user["id"])
    
    # Also update trust score
    await supabase_service.update_trust_score(
        user["id"],
        (profile.get("trust_score", 0) if profile else 0) + 2,
        f"Completed learning: {module_id}",
    )
    
    return BaseResponse(success=True, message=f"Earned {reward} SAATHI from learning!")


@router.post("/buy", response_model=BaseResponse)
async def buy_tokens(
    request: SaathiBuyRequest,
    user: dict = Depends(get_current_user),
):
    """Buy SAATHI tokens (Simulated Dodo Payments / UPI)"""
    amount = float(request.amount)
    
    # Simulate payment processing
    # In real prod, this would verify a Dodo Payments session
    
    await supabase_service.update_saathi_balance(user["id"], amount)
    await supabase_service.create_saathi_transaction({
        "user_id": str(user["id"]),
        "type": "earn",
        "amount": amount,
        "description": f"Purchased {amount} SAATHI via UPI"
    })
    
    return BaseResponse(success=True, message=f"Successfully purchased {amount} SAATHI!")
