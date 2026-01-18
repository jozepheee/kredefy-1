"""
Application Configuration
Loads all environment variables and provides typed settings
"""

from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # App
    environment: str = "development"
    secret_key: str
    debug: bool = False
    
    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_anon_key: str
    supabase_db_url: str
    
    # JWT Secret for token generation
    jwt_secret: str = "kredefy-super-secret-jwt-key-change-in-production"
    
    # Dodo Payments
    dodo_api_key: str
    dodo_webhook_secret: str
    dodo_base_url: str = "https://api.dodopayments.com/v1"
    
    # Twilio
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_whatsapp_number: str
    twilio_phone_number: str = ""
    
    # Groq AI
    groq_api_key: str
    
    # ElevenLabs
    elevenlabs_api_key: str
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Default voice
    
    # Polygon Blockchain
    polygon_rpc_url: str = "https://rpc-amoy.polygon.technology"
    blockchain_private_key: str = ""  # Optional - only needed for contract interactions
    saathi_token_address: str = ""
    trust_score_address: str = ""
    vouch_bond_address: str = ""
    loan_registry_address: str = ""
    circle_dao_address: str = ""
    emergency_fund_address: str = ""
    
    # Mastra AI Service
    mastra_service_url: str = "http://localhost:4000"
    mastra_port: int = 4000
    openai_api_key: str = ""
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    # Rate Limiting
    rate_limit_per_minute: int = 60
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string to list"""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment == "production"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Allow extra env vars


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
