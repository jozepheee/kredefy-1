"""
Pydantic models for request/response validation
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, validator
import phonenumbers


# ============================================
# Base Models
# ============================================

class BaseResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool = True
    message: Optional[str] = None


class PaginatedResponse(BaseResponse):
    """Paginated response wrapper"""
    total: int
    page: int
    per_page: int
    total_pages: int


# ============================================
# Auth Models
# ============================================

class PhoneNumber(BaseModel):
    """Phone number with validation"""
    phone: str = Field(..., description="Phone number with country code")
    
    @validator("phone")
    def validate_phone(cls, v):
        try:
            parsed = phonenumbers.parse(v, "IN")
            if not phonenumbers.is_valid_number(parsed):
                raise ValueError("Invalid phone number")
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except phonenumbers.NumberParseException:
            raise ValueError("Invalid phone number format")


class SendOTPRequest(PhoneNumber):
    """Send OTP request - only needs phone"""
    pass


class RegisterRequest(PhoneNumber):
    """Registration request"""
    full_name: str = Field(..., min_length=2, max_length=100)
    language: str = Field(default="en", pattern="^(en|hi|ml)$")


class VerifyOTPRequest(PhoneNumber):
    """OTP verification request"""
    otp: str = Field(..., min_length=6, max_length=6)


class LoginRequest(PhoneNumber):
    """Login request - sends OTP"""
    pass


class AuthResponse(BaseResponse):
    """Authentication response"""
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional["ProfileResponse"] = None


class ProfileUpdate(BaseModel):
    """Profile update request"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    language: Optional[str] = Field(None, pattern="^(en|hi|ml)$")
    wallet_address: Optional[str] = Field(None, pattern="^0x[a-fA-F0-9]{40}$")


class ProfileResponse(BaseModel):
    """User profile response"""
    id: str
    phone: str
    full_name: Optional[str]
    language: str
    wallet_address: Optional[str]
    trust_score: int
    saathi_balance: Decimal
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Circle Models
# ============================================

class CircleCreate(BaseModel):
    """Create circle request"""
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    max_members: int = Field(default=10, ge=3, le=50)


class CircleJoin(BaseModel):
    """Join circle request"""
    invite_code: str = Field(..., min_length=6, max_length=8)


class CircleMemberResponse(BaseModel):
    """Circle member info"""
    id: str
    user_id: str
    full_name: Optional[str]
    trust_score: int
    role: str
    joined_at: datetime
    contribution_amount: Decimal
    
    class Config:
        from_attributes = True


class CircleResponse(BaseModel):
    """Circle details response"""
    id: str
    name: str
    description: Optional[str]
    invite_code: str
    creator_id: str
    max_members: int
    emergency_fund_balance: Decimal
    blockchain_address: Optional[str]
    member_count: int = 0
    members: List[CircleMemberResponse] = []
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Vouch Models
# ============================================

class VouchCreate(BaseModel):
    """Create vouch request"""
    vouchee_id: str
    circle_id: str
    vouch_level: str = Field(..., pattern="^(basic|strong|maximum)$")
    
    @property
    def saathi_required(self) -> Decimal:
        levels = {"basic": 10, "strong": 50, "maximum": 100}
        return Decimal(levels.get(self.vouch_level, 10))


class VouchResponse(BaseModel):
    """Vouch details response"""
    id: str
    voucher_id: str
    voucher_name: Optional[str]
    vouchee_id: str
    vouchee_name: Optional[str]
    circle_id: str
    vouch_level: str
    saathi_staked: Decimal
    blockchain_tx_hash: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Loan Models
# ============================================

class LoanCreate(BaseModel):
    """Create loan request"""
    circle_id: str
    amount: Decimal = Field(..., gt=0, le=50000)
    purpose: str = Field(..., min_length=10, max_length=500)
    tenure_days: int = Field(..., ge=7, le=365)


class LoanVote(BaseModel):
    """Vote on loan request"""
    vote: bool = Field(..., description="True = approve, False = reject")


class LoanVoteResponse(BaseModel):
    """Individual vote info"""
    voter_id: str
    voter_name: Optional[str]
    vote: bool
    vote_weight: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class LoanResponse(BaseModel):
    """Loan details response"""
    id: str
    borrower_id: str
    borrower_name: Optional[str]
    circle_id: str
    circle_name: Optional[str]
    amount: Decimal
    purpose: str
    interest_rate: Decimal
    tenure_days: int
    emi_amount: Optional[Decimal]
    status: str
    blockchain_tx_hash: Optional[str]
    dodo_payment_id: Optional[str]
    votes_for: int = 0
    votes_against: int = 0
    votes_total: int = 0
    disbursed_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Payment Models
# ============================================

class PaymentCheckoutCreate(BaseModel):
    """Create payment checkout request"""
    loan_id: str
    amount: Decimal = Field(..., gt=0)
    description: Optional[str] = None


class PaymentLinkCreate(BaseModel):
    """Create payment link request"""
    loan_id: str
    amount: Decimal = Field(..., gt=0)


class PaymentResponse(BaseModel):
    """Payment info response"""
    id: str
    loan_id: str
    amount: Decimal
    dodo_payment_id: Optional[str]
    blockchain_tx_hash: Optional[str]
    status: str
    due_date: Optional[datetime]
    paid_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class DodoWebhookPayload(BaseModel):
    """Dodo Payments webhook payload"""
    event_type: str
    payment_id: str
    status: str
    amount: Decimal
    currency: str = "INR"
    metadata: Optional[dict] = None


# ============================================
# Emergency Models
# ============================================

class EmergencyRequest(BaseModel):
    """Emergency fund request"""
    amount: Decimal = Field(..., gt=0, le=10000)
    reason: str = Field(..., min_length=10, max_length=500)
    evidence_url: Optional[str] = None


class EmergencyVote(BaseModel):
    """Vote on emergency request"""
    approve: bool


class EmergencyResponse(BaseModel):
    """Emergency request response"""
    id: str
    user_id: str
    user_name: Optional[str]
    amount: Decimal
    reason: str
    evidence_url: Optional[str]
    status: str
    votes_for: int = 0
    votes_against: int = 0
    blockchain_tx_hash: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Financial Diary Models
# ============================================

class DiaryEntryCreate(BaseModel):
    """Create diary entry (from voice or text)"""
    type: str = Field(..., pattern="^(income|expense)$")
    amount: Decimal = Field(..., gt=0)
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=200)


class DiaryEntryResponse(BaseModel):
    """Diary entry response"""
    id: str
    type: str
    amount: Decimal
    category: Optional[str]
    description: Optional[str]
    voice_url: Optional[str]
    transcription: Optional[str]
    recorded_at: datetime
    
    class Config:
        from_attributes = True


class DiarySummary(BaseModel):
    """Weekly/Monthly diary summary"""
    period: str
    total_income: Decimal
    total_expense: Decimal
    net: Decimal
    top_categories: List[dict]


# ============================================
# Nova AI Models
# ============================================

class NovaMessage(BaseModel):
    """Chat message to Nova"""
    message: str = Field(..., min_length=1, max_length=1000)
    language: str = Field(default="en", pattern="^(en|hi|ml)$")


class NovaVoiceInput(BaseModel):
    """Voice input to Nova"""
    audio_base64: str
    language: str = Field(default="en", pattern="^(en|hi|ml)$")


class NovaResponse(BaseModel):
    """Nova AI response"""
    message: str
    audio_url: Optional[str] = None
    intent: Optional[str] = None
    entities: Optional[dict] = None
    actions: Optional[List[dict]] = None


# ============================================
# Trust Score Models
# ============================================

class TrustScoreResponse(BaseModel):
    """Trust score details"""
    score: int
    level: str  # "new", "building", "trusted", "highly_trusted"
    components: dict
    last_updated: datetime
    blockchain_tx_hash: Optional[str]
    
    @property
    def visual_level(self) -> str:
        if self.score >= 80:
            return "Pakka Bharosa"
        elif self.score >= 60:
            return "Bhrosemand"
        elif self.score >= 30:
            return "Building"
        return "Naya"


class TrustScoreHistory(BaseModel):
    """Trust score history entry"""
    old_score: int
    new_score: int
    reason: str
    blockchain_tx_hash: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Saathi Token Models
# ============================================

class SaathiBalanceResponse(BaseModel):
    """Saathi token balance"""
    balance: Decimal
    staked: Decimal
    available: Decimal
    pending_rewards: Decimal


class SaathiStakeRequest(BaseModel):
    """Stake SAATHI for vouching"""
    vouchee_id: str
    amount: Decimal = Field(..., gt=0)


class SaathiBuyRequest(BaseModel):
    """Buy SAATHI tokens request"""
    amount: Decimal = Field(..., gt=0)

class SaathiTransactionResponse(BaseModel):
    """Saathi transaction history"""
    id: str
    type: str
    amount: Decimal
    reference_id: Optional[str]
    blockchain_tx_hash: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Update forward references
AuthResponse.model_rebuild()
