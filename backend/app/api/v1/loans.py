"""
Loans API endpoints - Enhanced with AI Risk Analysis
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from decimal import Decimal
from datetime import datetime
import logging

from app.models.schemas import (
    LoanCreate, LoanVote, LoanResponse, LoanVoteResponse, BaseResponse
)
from app.services.supabase import supabase_service
from app.services import get_advanced_blockchain_service
from app.services.dodo import dodo_service
from app.services.twilio import twilio_service
from app.ai.orchestrator import orchestrator
from app.api.v1.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=dict)
async def create_loan(
    request: LoanCreate,
    user: dict = Depends(get_current_user),
):
    """
    Request a loan from circle - with full AI analysis
    
    Returns:
    - Loan details
    - AI risk assessment
    - Reasoning traces showing how decision was made
    """
    try:
        # Step 1: Check if user is in circle
        members = await supabase_service.get_circle_members(request.circle_id)
        if not any(m["user_id"] == str(user["id"]) for m in members):
            raise HTTPException(status_code=403, detail="Not a circle member")
        
        # Step 2: Run full AI analysis pipeline
        logger.info(f"Running AI analysis for loan request: ₹{request.amount}")
        ai_result = await orchestrator.process_loan_request(
            user_id=str(user["id"]),
            amount=float(request.amount),
            purpose=request.purpose,
            circle_id=str(request.circle_id),
        )
        
        # Step 3: Check if AI approved
        if not ai_result.get("approved"):
            return {
                "success": False,
                "approved": False,
                "reason": ai_result.get("reason"),
                "advice": ai_result.get("advice"),
                "suggested_action": ai_result.get("suggested_action"),
                "reasoning_traces": ai_result.get("reasoning_traces", []),
            }
        
        # Step 4: Create loan record
        approved_amount = ai_result.get("approved_amount", request.amount)
        emi_amount = approved_amount / (request.tenure_days // 7)
        
        loan_data = {
            "borrower_id": str(user["id"]),
            "circle_id": str(request.circle_id),
            "amount": float(approved_amount),
            "purpose": request.purpose,
            "tenure_days": request.tenure_days,
            "emi_amount": float(emi_amount),
            "status": "voting",
        }
        
        loan = await supabase_service.create_loan(loan_data)
        
        # Step 5: Record on blockchain
        blockchain = get_advanced_blockchain_service()
        profile = await supabase_service.get_profile(user["id"])
        if profile and profile.get("wallet_address") and blockchain and blockchain.is_configured:
            tx_hash = await blockchain.create_loan_record(
                loan["id"],
                profile["wallet_address"],
                int(approved_amount),
                request.tenure_days,
            )
            if tx_hash:
                loan = await supabase_service.update_loan(
                    loan["id"], {"blockchain_tx_hash": tx_hash}
                )
        
        return {
            "success": True,
            "loan": LoanResponse(**loan).model_dump(),
            "ai_analysis": {
                "approved": True,
                "requested_amount": float(request.amount),
                "approved_amount": approved_amount,
                "risk_category": ai_result.get("risk_category"),
            },
            "reasoning_traces": ai_result.get("reasoning_traces", []),
            "blockchain_tx": loan.get("blockchain_tx_hash"),
            "explorer_url": blockchain.get_tx_explorer_url(loan.get("blockchain_tx_hash", "")) if blockchain and loan.get("blockchain_tx_hash") else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create loan failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[LoanResponse])
async def list_loans(user: dict = Depends(get_current_user)):
    """List my loans"""
    loans = await supabase_service.get_user_loans(user["id"])
    return [LoanResponse(**l) for l in loans]

@router.get("/pending-votes", response_model=List[LoanResponse])
async def get_pending_votes(user: dict = Depends(get_current_user)):
    """Get loans awaiting my vote"""
    loans = await supabase_service.get_pending_loans(user["id"])
    return [LoanResponse(**l) for l in loans]


@router.get("/{loan_id}", response_model=dict)
async def get_loan(
    loan_id: str,
    user: dict = Depends(get_current_user),
):
    """Get loan details with blockchain verification"""
    loan = await supabase_service.get_loan(loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    votes = await supabase_service.get_loan_votes(loan_id)
    loan["votes_for"] = sum(1 for v in votes if v["vote"])
    loan["votes_against"] = sum(1 for v in votes if not v["vote"])
    loan["total_votes"] = len(votes)
    
    # Get blockchain explorer URL
    explorer_url = None
    blockchain = get_advanced_blockchain_service()
    if loan.get("blockchain_tx_hash") and blockchain:
        explorer_url = blockchain.get_tx_explorer_url(loan["blockchain_tx_hash"])
    
    return {
        "loan": LoanResponse(**loan).model_dump(),
        "blockchain_verified": bool(loan.get("blockchain_tx_hash")),
        "explorer_url": explorer_url,
    }


@router.post("/{loan_id}/vote", response_model=BaseResponse)
async def vote_on_loan(
    loan_id: str,
    request: LoanVote,
    user: dict = Depends(get_current_user),
):
    """Vote on a loan request"""
    loan = await supabase_service.get_loan(loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    if loan["status"] != "voting":
        raise HTTPException(status_code=400, detail="Voting is closed")
    
    members = await supabase_service.get_circle_members(loan["circle_id"])
    if not any(m["user_id"] == str(user["id"]) for m in members):
        raise HTTPException(status_code=403, detail="Not a circle member")
    
    if loan["borrower_id"] == str(user["id"]):
        raise HTTPException(status_code=400, detail="Cannot vote on own loan")
    
    vote_data = {
        "loan_id": loan_id,
        "voter_id": str(user["id"]),
        "vote": request.vote,
        "vote_weight": request.vote_weight if hasattr(request, 'vote_weight') else 1,
        "tokens_spent": request.tokens_spent if hasattr(request, 'tokens_spent') else 1,
    }
    
    try:
        await supabase_service.create_loan_vote(vote_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Already voted")
    
    # Use Quadratic Voting for fair democratic decision
    from app.services.governance import quadratic_voting_service
    
    votes = await supabase_service.get_loan_votes(loan_id)
    
    # Convert to quadratic voting format
    qv_votes = [
        {
            "voter_id": v["voter_id"],
            "tokens_spent": v.get("tokens_spent", 1),
            "vote": "for" if v["vote"] else "against"
        }
        for v in votes
    ]
    
    qv_result = quadratic_voting_service.tally_votes(qv_votes)
    
    logger.info(f"Quadratic Vote Tally for {loan_id}: {qv_result}")
    
    # If quorum met and approved
    if qv_result["approved"]:
        await supabase_service.update_loan(loan_id, {"status": "approved"})
        
        borrower = await supabase_service.get_profile(loan["borrower_id"])
        if borrower:
            await twilio_service.send_loan_approved(
                borrower["phone"],
                loan["amount"],
                borrower.get("language", "en"),
            )
    
    return BaseResponse(
        success=True, 
        message=f"Vote recorded. Approval: {qv_result['approval_percentage']}%"
    )


@router.get("/{loan_id}/votes", response_model=List[LoanVoteResponse])
async def get_loan_votes(
    loan_id: str,
    user: dict = Depends(get_current_user),
):
    """Get votes for a loan"""
    votes = await supabase_service.get_loan_votes(loan_id)
    return [LoanVoteResponse(**v) for v in votes]


@router.post("/{loan_id}/disburse", response_model=dict)
async def disburse_loan(
    loan_id: str,
    user: dict = Depends(get_current_user),
):
    """Disburse approved loan via Dodo Payments"""
    loan = await supabase_service.get_loan(loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    if loan["status"] != "approved":
        raise HTTPException(status_code=400, detail="Loan not approved")
    
    borrower = await supabase_service.get_profile(loan["borrower_id"])
    if not borrower:
        raise HTTPException(status_code=400, detail="Borrower not found")
    
    # Create payout via Dodo
    payment = await dodo_service.create_payout(
        Decimal(str(loan["amount"])),
        f"{borrower['phone']}@upi",
        borrower.get("full_name", "User"),
        metadata={"loan_id": loan_id},
    )
    
    # Update loan status
    loan = await supabase_service.update_loan(loan_id, {
        "status": "disbursed",
        "dodo_payment_id": payment.get("payout_id"),
        "disbursed_at": datetime.utcnow().isoformat(),
    })
    
    return {
        "success": True,
        "loan": LoanResponse(**loan).model_dump(),
        "payment": payment,
    }
