"""
Nova AI Chat API endpoints
Production-ready with multi-agent orchestration
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
import logging

from app.api.v1.auth import get_current_user
from app.ai.orchestrator import orchestrator
from app.services.elevenlabs import elevenlabs_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/chat")
async def chat_with_nova(
    message: str = Query(..., description="User message"),
    language: str = Query("en", description="Language code"),
    include_voice: bool = Query(False, description="Include voice response"),
    user: dict = Depends(get_current_user),
):
    """
    Chat with Nova AI with full multi-agent orchestration
    Returns response with reasoning traces
    """
    try:
        result = await orchestrator.process_message(
            user_id=str(user["id"]),
            message=message,
            language=language,
        )
        
        # Add voice if requested
        voice_audio = None
        if include_voice and result.get("response"):
            try:
                voice_audio = await elevenlabs_service.generate_data_url(
                    result["response"],
                    language
                )
            except Exception as e:
                logger.warning(f"Voice generation failed: {e}")
        
        return {
            "response": result.get("response") or result.get("message"),
            "message": result.get("response") or result.get("message"),
            "voice_audio": voice_audio,
            "reasoning_traces": result.get("reasoning_traces", []),
            "reasoning_traces_raw": result.get("reasoning_traces_raw", []),
            "agents_used": result.get("agents_used", []),
            "intent": result.get("intent"),
            "action": result.get("action"),
            "target": result.get("target"),
            "screen": result.get("screen"),
            "data": result.get("data"),
            "guide_steps": result.get("guide_steps"),
            "duration_ms": result.get("duration_ms"),
        }
        
    except Exception as e:
        logger.error(f"Nova chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/speak")
async def text_to_speech(
    text: str,
    language: str = "en",
    user: dict = Depends(get_current_user),
):
    """Convert text to speech - direct TTS endpoint"""
    try:
        audio_url = await elevenlabs_service.generate_data_url(text, language)
        return {
            "success": True,
            "audio_url": audio_url,
            "text": text,
            "language": language,
        }
    except Exception as e:
        logger.error(f"TTS failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
