"""
Payment Streaming API - Programmable payment flows
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from decimal import Decimal
from datetime import datetime, timedelta
from app.api.v1.auth import get_current_user
from app.services.supabase import supabase_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("")
async def get_payment_streams(
    current_user: dict = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get active payment streams for current user
    Streams are derived from active loans with scheduled repayments
    """
    try:
        user_id = current_user["id"]
        
        # Get user's active loans
        loans = await supabase_service.get_user_loans(user_id)
        active_loans = [l for l in loans if l["status"] in ["disbursed", "active"]]
        
        streams = []
        for loan in active_loans:
            # Get repayments made
            repayments = await supabase_service.get_loan_repayments(loan["id"])
            total_repaid = sum(float(r["amount"]) for r in repayments)
            
            # Calculate stream details
            loan_amount = float(loan["amount"])
            total_due = loan_amount * 1.1  # 10% interest
            emi_amount = float(loan.get("emi_amount", loan_amount / 10))
            
            # Next payment calculation
            days_elapsed = (datetime.utcnow() - datetime.fromisoformat(loan["created_at"].replace("Z", ""))).days
            weeks_elapsed = days_elapsed // 7
            payments_made = len(repayments)
            
            next_payment_days = 7 - (days_elapsed % 7) if payments_made < 10 else None
            
            streams.append({
                "id": loan["id"],
                "type": "loan_repayment",
                "from": "Your Wallet",
                "to": loan.get("circle_id", "Circle Fund"),
                "to_name": f"Loan #{loan['id'][:8]}",
                "totalAmount": total_due,
                "amountPaid": total_repaid,
                "frequency": f"Weekly ₹{int(emi_amount)}",
                "nextPayment": f"In {next_payment_days} days" if next_payment_days else "Completed",
                "status": "completed" if total_repaid >= total_due else "active",
                "progress": min(100, (total_repaid / total_due) * 100) if total_due > 0 else 0
            })
        
        return streams if streams else [
            # Demo stream if no real data
            {
                "id": "demo-1",
                "type": "loan_repayment",
                "from": "Your Wallet",
                "to": "Mahila Bachat Gat",
                "to_name": "Weekly Contribution",
                "totalAmount": 5000,
                "amountPaid": 2500,
                "frequency": "Weekly ₹500",
                "nextPayment": "In 3 days",
                "status": "active",
                "progress": 50,
                "is_demo": True
            }
        ]
        
    except Exception as e:
        logger.error(f"Payment streams failed: {e}")
        return []


@router.post("")
async def create_payment_stream(
    to_user_id: str,
    total_amount: float,
    frequency_days: int = 7,
    installments: int = 10,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new payment stream (for future: Superfluid-style streaming)
    Currently creates a scheduled payment plan
    """
    try:
        user_id = current_user["id"]
        installment_amount = total_amount / installments
        
        # For now, this is a placeholder for Superfluid-style streaming
        # In production, this would interact with a smart contract
        
        stream = {
            "id": f"stream-{datetime.utcnow().timestamp()}",
            "from_user": user_id,
            "to_user": to_user_id,
            "total_amount": total_amount,
            "installment_amount": installment_amount,
            "frequency_days": frequency_days,
            "installments": installments,
            "status": "active",
            "created_at": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Created payment stream: {stream['id']}")
        
        return {
            "success": True,
            "stream": stream,
            "message": f"Payment stream created: ₹{installment_amount} every {frequency_days} days"
        }
        
    except Exception as e:
        logger.error(f"Create stream failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/total")
async def get_streaming_totals(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get total amounts being streamed"""
    streams = await get_payment_streams(current_user)
    
    total_streaming = sum(s["totalAmount"] for s in streams if s["status"] == "active")
    total_paid = sum(s["amountPaid"] for s in streams)
    total_remaining = sum(s["totalAmount"] - s["amountPaid"] for s in streams if s["status"] == "active")
    
    return {
        "total_streaming": total_streaming,
        "total_paid": total_paid,
        "total_remaining": total_remaining,
        "active_streams": len([s for s in streams if s["status"] == "active"])
    }
