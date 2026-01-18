"""
Groq AI Service - LLM and Voice
"""

from groq import Groq
import logging
from typing import Optional, Dict, Any

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class GroqService:
    """Groq AI for LLM and transcription"""
    
    def __init__(self):
        self.client = Groq(api_key=settings.groq_api_key)
        self.model = "llama-3.3-70b-versatile"
    
    async def chat(
        self,
        message: str,
        system_prompt: str = "",
        language: str = "en",
    ) -> str:
        """Chat with Nova AI assistant"""
        system = system_prompt or self._get_nova_prompt(language)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": message},
                ],
                max_tokens=600,
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Groq API Error: {str(e)}")
            # Fallback for demo if API fails
            if "401" in str(e) or "api_key" in str(e).lower():
                return f"[System: Groq API Key Missing/Invalid] I cannot think right now. Please check backend .env. (Simulated Response: {message})"
            return f"I am having trouble thinking (Error: {str(e)[:50]}...)"
    
    async def transcribe(self, audio_file) -> str:
        """Transcribe audio using Whisper"""
        response = self.client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=audio_file,
        )
        return response.text
    
    async def categorize_expense(self, description: str) -> Dict[str, Any]:
        """Categorize financial diary entry"""
        prompt = f"""
        Categorize this financial transaction. Return JSON only:
        Transaction: "{description}"
        
        Return: {{"type": "income" or "expense", "category": "category_name", "amount": number_if_mentioned}}
        """
        
        response = await self.chat(prompt)
        try:
            import json
            return json.loads(response)
        except:
            return {"type": "expense", "category": "other", "amount": 0}
    
    def _get_nova_prompt(self, language: str) -> str:
        """Get Nova system prompt by language"""
        prompts = {
            "en": """You are Nova, a friendly financial assistant for Kredefy.
You help poor and middle-class Indians manage their money, apply for loans, and build credit.
Keep responses short, simple, and helpful. Avoid jargon.
You can help with: checking loan status, explaining EMIs, answering questions about trust circles.""",
            
            "hi": """आप Nova हैं, Kredefy के लिए एक दोस्ताना वित्तीय सहायक।
आप गरीब और मध्यम वर्ग के भारतीयों को उनके पैसे का प्रबंधन करने, ऋण के लिए आवेदन करने और क्रेडिट बनाने में मदद करते हैं।
जवाब छोटे, सरल और मददगार रखें।""",
            
            "ml": """നിങ്ങൾ Nova ആണ്, Kredefy-യുടെ സൗഹൃദപരമായ സാമ്പത്തിക സഹായി.
ദരിദ്രരും ഇടത്തരക്കാരുമായ ഇന്ത്യക്കാരെ പണം കൈകാര്യം ചെയ്യാനും വായ്പയ്ക്ക് അപേക്ഷിക്കാനും സഹായിക്കുന്നു.""",
        }
        return prompts.get(language, prompts["en"])


groq_service = GroqService()
