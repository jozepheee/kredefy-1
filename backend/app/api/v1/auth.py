"""
Authentication API endpoints
Phone + OTP based auth via Supabase
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
import logging

from app.models.schemas import (
    RegisterRequest, VerifyOTPRequest, LoginRequest, SendOTPRequest,
    AuthResponse, ProfileUpdate, ProfileResponse, BaseResponse
)
from app.services.supabase import supabase_service
from app.services.twilio import twilio_service

router = APIRouter()
logger = logging.getLogger(__name__)


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Dependency to get current authenticated user"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    user = await supabase_service.get_user(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user


import random
from datetime import datetime, timedelta

# Deprecated: in-memory OTP storage - now using Supabase
# otp_store: dict = {}


@router.post("/send-otp", response_model=BaseResponse)
async def send_otp(request: SendOTPRequest):
    """Send OTP via WhatsApp (works for both new and existing users)"""
    try:
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Store OTP in database (persistent across server restarts)
        stored = await supabase_service.store_otp(request.phone, otp, expires_minutes=10)
        if not stored:
            raise Exception("Failed to store OTP in database")
        
        # Send OTP via Twilio WhatsApp
        await twilio_service.send_otp(request.phone, otp)
        
        logger.info(f"OTP sent and stored for {request.phone}")
        
        return BaseResponse(
            success=True,
            message=f"OTP sent to {request.phone} via WhatsApp",
        )
    except Exception as e:
        logger.error(f"Send OTP failed: {e}")
        raise HTTPException(status_code=400, detail=f"Send OTP failed: {str(e)}")


@router.post("/register", response_model=BaseResponse)
async def register(request: RegisterRequest):
    """Register new user with phone number"""
    try:
        # Send OTP via Supabase (which uses Twilio)
        result = await supabase_service.send_otp(request.phone)
        
        # Store registration data temporarily (will create profile on OTP verification)
        return BaseResponse(
            success=True,
            message=f"OTP sent to {request.phone}. Please verify.",
        )
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


import uuid
import jwt
from app.config import get_settings as get_config

settings_config = get_config()


@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP and complete registration/login"""
    try:
        # Verify OTP from database (persistent storage)
        is_valid = await supabase_service.verify_stored_otp(request.phone, request.otp)
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please request a new one.")
        
        logger.info(f"OTP verified successfully for {request.phone}")
        
        # Check if profile exists, create if not
        profile = await supabase_service.get_profile_by_phone(request.phone)
        
        if not profile:
            # Create new profile with generated user_id
            user_id = str(uuid.uuid4())
            profile = await supabase_service.create_profile(
                user_id,
                {"phone": request.phone, "language": "en"}
            )
        
        # Generate JWT token
        token_payload = {
            "sub": profile["id"],
            "phone": request.phone,
            "exp": datetime.utcnow() + timedelta(days=30)
        }
        access_token = jwt.encode(token_payload, settings_config.jwt_secret, algorithm="HS256")
        refresh_token = jwt.encode(
            {**token_payload, "exp": datetime.utcnow() + timedelta(days=90)},
            settings_config.jwt_secret,
            algorithm="HS256"
        )
        
        logger.info(f"User logged in: {request.phone}")
        
        return AuthResponse(
            success=True,
            access_token=access_token,
            refresh_token=refresh_token,
            user=ProfileResponse(**profile) if profile else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification failed: {e}")
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")


@router.post("/login", response_model=BaseResponse)
async def login(request: LoginRequest):
    """Login - send OTP to existing user"""
    try:
        await supabase_service.send_otp(request.phone)
        return BaseResponse(success=True, message="OTP sent")
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(refresh_token: str):
    """Refresh access token"""
    try:
        result = await supabase_service.refresh_token(refresh_token)
        return AuthResponse(
            success=True,
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.get("/me", response_model=ProfileResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user profile"""
    profile = await supabase_service.get_profile(user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(**profile)


@router.get("/profile", response_model=ProfileResponse)
async def get_profile_alias(user: dict = Depends(get_current_user)):
    """Alias for /me to match frontend requests"""
    return await get_me(user)


@router.patch("/profile", response_model=ProfileResponse)
async def update_profile(
    updates: ProfileUpdate,
    user: dict = Depends(get_current_user),
):
    """Update user profile"""
    data = updates.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    profile = await supabase_service.update_profile(user["id"], data)
    return ProfileResponse(**profile)


@router.post("/wallet/connect", response_model=ProfileResponse)
async def connect_wallet(
    wallet_address: str,
    user: dict = Depends(get_current_user),
):
    """Link wallet address to profile"""
    profile = await supabase_service.update_profile(
        user["id"],
        {"wallet_address": wallet_address}
    )
    return ProfileResponse(**profile)
