"""
Payments API endpoints - Production with Domain Service
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Header, BackgroundTasks
from typing import Optional
from decimal import Decimal
import logging
import json

from app.models.schemas import (
    PaymentCheckoutCreate, PaymentLinkCreate, PaymentResponse, BaseResponse
)
from app.services.supabase import supabase_service
from app.services.dodo import dodo_service
from app.domain.services import payment_service
from app.utils import dodo_circuit, retry_with_backoff
from app.middleware import get_request_id
from app.api.v1.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/checkout", response_model=dict)
async def create_checkout(
    request: PaymentCheckoutCreate,
    user: dict = Depends(get_current_user),
):
    """Create Dodo checkout session for repayment"""
    request_id = get_request_id()
    
    loan = await supabase_service.get_loan(request.loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    profile = await supabase_service.get_profile(user["id"])
    
    try:
        async with dodo_circuit:
            checkout = await dodo_service.create_checkout_session(
                amount=request.amount,
                product_name=f"Loan EMI Repayment #{loan['id'][:8]}",
                description=request.description or f"EMI Payment for Circle Loan",
                customer_phone=profile.get("phone"),
                metadata={
                    "loan_id": str(request.loan_id),
                    "user_id": str(user["id"]),
                    "type": "repayment",
                    "request_id": request_id,
                },
            )
        
        logger.info(
            f"Checkout created",
            extra={
                "request_id": request_id,
                "loan_id": str(request.loan_id),
                "amount": float(request.amount),
                "checkout_id": checkout.get("checkout_id"),
            }
        )
        
        return checkout
        
    except Exception as e:
        logger.error(f"Checkout creation failed: {e}", extra={"request_id": request_id})
        raise HTTPException(status_code=502, detail="Payment service unavailable")


@router.post("/link", response_model=dict)
async def create_payment_link(
    request: PaymentLinkCreate,
    user: dict = Depends(get_current_user),
):
    """Create shareable payment link for repayment"""
    loan = await supabase_service.get_loan(request.loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    profile = await supabase_service.get_profile(loan["borrower_id"])
    
    try:
        async with dodo_circuit:
            link = await dodo_service.create_payment_link(
                request.amount,
                description=f"EMI payment - ₹{request.amount}",
                customer_phone=profile.get("phone") if profile else None,
                metadata={"loan_id": str(request.loan_id)},
            )
        
        return link
        
    except Exception as e:
        logger.error(f"Payment link creation failed: {e}")
        raise HTTPException(status_code=502, detail="Payment service unavailable")


@router.post("/webhook")
async def handle_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_dodo_signature: str = Header(...),
):
    """
    Handle Dodo payment webhooks
    Signature verified, then processed in background
    """
    payload = await request.body()
    request_id = get_request_id()
    
    # Verify signature first
    if not dodo_service.verify_webhook(payload, x_dodo_signature):
        logger.warning(
            "Webhook signature verification failed",
            extra={"request_id": request_id}
        )
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    data = json.loads(payload)
    event_type = data.get("type")
    payment_data = data.get("data", {})
    
    logger.info(
        f"Webhook received: {event_type}",
        extra={
            "request_id": request_id,
            "event_type": event_type,
            "payment_id": payment_data.get("id"),
        }
    )
    
    # Process in background for fast response
    if event_type == "payment.completed":
        background_tasks.add_task(
            process_payment_completed,
            payment_data,
            request_id,
        )
    elif event_type == "payment.failed":
        background_tasks.add_task(
            process_payment_failed,
            payment_data,
            request_id,
        )
    
    return {"received": True, "request_id": request_id}


from app.services.gamification import gamification_service

async def process_payment_completed(payment_data: dict, request_id: str):
    """Background task to process completed payment"""
    try:
        metadata = payment_data.get("metadata", {})
        loan_id = metadata.get("loan_id")
        user_id = metadata.get("user_id") # Ensure we pass this in checkout creation
        amount = Decimal(str(payment_data.get("amount", 0))) / 100  # Paise to rupees
        
        if loan_id:
            result = await payment_service.process_repayment(
                loan_id=loan_id,
                amount=amount,
                dodo_payment_id=payment_data.get("id"),
            )
            
            # TRIGGER GAMIFICATION
            if user_id:
                try:
                    await gamification_service.process_event(user_id, 'repayment', {"amount": float(amount)})
                    logger.info(f"Gamification event triggered for user {user_id}")
                except Exception as g_err:
                    logger.error(f"Gamification trigger failed: {g_err}")
            
            logger.info(
                "Payment processed successfully",
                extra={
                    "request_id": request_id,
                    "loan_id": loan_id,
                    "amount": float(amount),
                    "total_repaid": result.get("total_repaid"),
                }
            )
    except Exception as e:
        logger.error(
            f"Failed to process payment: {e}",
            extra={"request_id": request_id}
        )


async def process_payment_failed(payment_data: dict, request_id: str):
    """Background task to handle failed payment"""
    try:
        metadata = payment_data.get("metadata", {})
        loan_id = metadata.get("loan_id")
        
        if loan_id:
            # Record failed payment attempt
            await supabase_service.create_repayment({
                "loan_id": loan_id,
                "amount": payment_data.get("amount", 0) / 100,
                "dodo_payment_id": payment_data.get("id"),
                "status": "failed",
            })
            
            logger.warning(
                "Payment failed",
                extra={
                    "request_id": request_id,
                    "loan_id": loan_id,
                    "error": payment_data.get("failure_reason"),
                }
            )
    except Exception as e:
        logger.error(f"Failed to process failed payment: {e}")


@router.get("/{payment_id}/status", response_model=dict)
async def get_payment_status(
    payment_id: str,
    user: dict = Depends(get_current_user),
):
    """Get payment status from Dodo"""
    # In production, would call Dodo API
    return {
        "payment_id": payment_id,
        "status": "pending",
        "message": "Check Dodo dashboard for real-time status",
    }
