"""
ElevenLabs Text-to-Speech Service
Real voice output for Nova AI in multiple languages
"""

import httpx
import logging
from typing import Optional
import base64
import hashlib
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ElevenLabsService:
    """
    ElevenLabs TTS integration for multilingual voice output
    
    Voices:
    - English: Adam (conversational, warm)
    - Hindi: Custom cloned or Raj
    - Malayalam: Custom cloned or Indian female
    """
    
    def __init__(self):
        self.api_key = settings.elevenlabs_api_key
        self.base_url = "https://api.elevenlabs.io/v1"
        
        # Voice IDs - using ElevenLabs preset voices
        self.voices = {
            "en": "pNInz6obpgDQGcFmaJgB",  # Adam - warm, conversational
            "hi": "21m00Tcm4TlvDq8ikWAM",  # Rachel - works for Hindi
            "ml": "21m00Tcm4TlvDq8ikWAM",  # Same for Malayalam until custom voice
        }
        
        # Model ID for multilingual
        self.model_id = "eleven_multilingual_v2"
        
        # Cache directory
        self.cache_dir = Path("/tmp/kredefy_tts_cache")
        self.cache_dir.mkdir(exist_ok=True)
    
    def _get_headers(self) -> dict:
        return {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
        }
    
    def _get_cache_key(self, text: str, voice_id: str) -> str:
        """Generate cache key for TTS output"""
        content = f"{text}:{voice_id}:{self.model_id}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _get_cached(self, cache_key: str) -> Optional[bytes]:
        """Get cached audio if exists"""
        cache_file = self.cache_dir / f"{cache_key}.mp3"
        if cache_file.exists():
            return cache_file.read_bytes()
        return None
    
    def _save_to_cache(self, cache_key: str, audio_data: bytes):
        """Save audio to cache"""
        cache_file = self.cache_dir / f"{cache_key}.mp3"
        cache_file.write_bytes(audio_data)
    
    async def text_to_speech(
        self,
        text: str,
        language: str = "en",
        voice_id: Optional[str] = None,
    ) -> bytes:
        """
        Convert text to speech audio
        Returns MP3 audio bytes
        """
        # Use language-specific voice
        voice = voice_id or self.voices.get(language, self.voices["en"])
        
        # Check cache first
        cache_key = self._get_cache_key(text, voice)
        cached = self._get_cached(cache_key)
        if cached:
            logger.info(f"TTS cache hit for: {text[:30]}...")
            return cached
        
        # Call ElevenLabs API
        async with httpx.AsyncClient() as client:
            payload = {
                "text": text,
                "model_id": self.model_id,
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True,
                }
            }
            
            response = await client.post(
                f"{self.base_url}/text-to-speech/{voice}",
                json=payload,
                headers=self._get_headers(),
                timeout=30.0,
            )
            response.raise_for_status()
            
            audio_data = response.content
            
            # Cache the result
            self._save_to_cache(cache_key, audio_data)
            
            logger.info(f"TTS generated for: {text[:30]}... ({len(audio_data)} bytes)")
            return audio_data
    
    async def text_to_speech_base64(
        self,
        text: str,
        language: str = "en",
    ) -> str:
        """
        Convert text to speech and return base64 encoded audio
        Useful for API responses
        """
        audio_bytes = await self.text_to_speech(text, language)
        return base64.b64encode(audio_bytes).decode('utf-8')
    
    async def generate_data_url(
        self,
        text: str,
        language: str = "en",
    ) -> str:
        """
        Generate audio data URL for direct playback
        Returns: data:audio/mpeg;base64,...
        """
        audio_b64 = await self.text_to_speech_base64(text, language)
        return f"data:audio/mpeg;base64,{audio_b64}"
    
    async def get_voices(self) -> list:
        """Get available voices from ElevenLabs"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/voices",
                headers=self._get_headers(),
                timeout=15.0,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("voices", [])


# Singleton instance
elevenlabs_service = ElevenLabsService()
