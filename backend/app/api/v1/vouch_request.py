"""
Vouch Request API Endpoint
Allows users to request vouches from circle members
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.api.v1.auth import get_current_user
from app.services.supabase import supabase_service
from app.services.twilio import twilio_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class VouchRequestPayload(BaseModel):
    target_user_id: str
    message: Optional[str] = None


@router.post("/request")
async def request_vouch(
    payload: VouchRequestPayload,
    current_user: dict = Depends(get_current_user)
):
    """
    Request a vouch from a circle member
    Sends notification to target user
    """
    try:
        user_id = current_user["id"]
        requester_name = current_user.get("full_name", "A friend")
        
        # Get target user profile
        target_profile = await supabase_service.get_profile(payload.target_user_id)
        if not target_profile:
            raise HTTPException(status_code=404, detail="Target user not found")
        
        target_phone = target_profile.get("phone")
        
        # Store request in database (optional - for tracking)
        # Could create a vouch_requests table for this
        
        # Send notification via WhatsApp/SMS
        if target_phone:
            try:
                message = f"🤝 {requester_name} is requesting you to vouch for them on Kredefy! Your vouch could help them get a loan approved. Open the app to respond."
                if payload.message:
                    message += f"\n\nTheir message: \"{payload.message}\""
                
                await twilio_service.send_whatsapp(
                    to=target_phone,
                    message=message
                )
                logger.info(f"Vouch request notification sent to {target_phone}")
            except Exception as e:
                logger.warning(f"Failed to send vouch request notification: {e}")
                # Don't fail the request if notification fails
        
        logger.info(f"Vouch request from {user_id} to {payload.target_user_id}")
        
        return {
            "success": True,
            "message": f"Vouch request sent to {target_profile.get('full_name', 'user')}",
            "target_user_id": payload.target_user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Vouch request failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
