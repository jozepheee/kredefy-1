"""
Tests for Domain Services
"""

import pytest
from decimal import Decimal
from uuid import uuid4
from unittest.mock import AsyncMock, patch, MagicMock

from app.domain.services import VouchingDomainService, LoanDomainService


class TestVouchingDomainService:
    """Tests for VouchingDomainService"""
    
    @pytest.fixture
    def service(self):
        return VouchingDomainService()
    
    @pytest.mark.asyncio
    async def test_validate_vouch_level(self, service):
        """Test vouch level validation"""
        # Invalid level should raise
        with pytest.raises(ValueError, match="Invalid vouch level"):
            await service.create_vouch(
                voucher_id=uuid4(),
                vouchee_id=uuid4(),
                circle_id=uuid4(),
                vouch_level="invalid",
                saathi_amount=Decimal("50"),
            )
    
    @pytest.mark.asyncio
    async def test_validate_stake_amount(self, service, mock_supabase, mock_profile):
        """Test stake amount validation"""
        mock_supabase.get_profile.return_value = mock_profile
        
        # Below minimum should raise
        with pytest.raises(ValueError, match="Minimum stake"):
            await service.create_vouch(
                voucher_id=uuid4(),
                vouchee_id=uuid4(),
                circle_id=uuid4(),
                vouch_level="strong",
                saathi_amount=Decimal("10"),  # Minimum for strong is 50
            )
    
    @pytest.mark.asyncio
    async def test_insufficient_balance_rejected(self, service, mock_supabase):
        """Test that insufficient balance is rejected"""
        mock_supabase.get_profile.return_value = {
            "saathi_balance": 30,
        }
        mock_supabase.get_vouches_given.return_value = []
        
        with pytest.raises(ValueError, match="Insufficient SAATHI"):
            await service.create_vouch(
                voucher_id=uuid4(),
                vouchee_id=uuid4(),
                circle_id=uuid4(),
                vouch_level="basic",
                saathi_amount=Decimal("50"),
            )
    
    @pytest.mark.asyncio
    async def test_duplicate_vouch_rejected(self, service, mock_supabase):
        """Test that duplicate vouches are rejected"""
        vouchee_id = uuid4()
        
        mock_supabase.get_profile.return_value = {"saathi_balance": 100}
        mock_supabase.get_vouches_given.return_value = [
            {"vouchee_id": str(vouchee_id), "status": "active"}
        ]
        
        with pytest.raises(ValueError, match="Already have an active vouch"):
            await service.create_vouch(
                voucher_id=uuid4(),
                vouchee_id=vouchee_id,
                circle_id=uuid4(),
                vouch_level="basic",
                saathi_amount=Decimal("20"),
            )


class TestLoanDomainService:
    """Tests for LoanDomainService"""
    
    @pytest.fixture
    def service(self):
        return LoanDomainService()
    
    @pytest.mark.asyncio
    async def test_ai_rejection_prevents_loan(self, service):
        """Test that AI rejection prevents loan creation"""
        with patch("app.ai.orchestrator.orchestrator") as mock_orchestrator:
            mock_orchestrator.process_loan_request = AsyncMock(return_value={
                "approved": False,
                "reason": "High risk detected",
                "advice": "Build more trust first",
            })
            
            result = await service.request_loan(
                borrower_id=uuid4(),
                circle_id=uuid4(),
                amount=Decimal("50000"),
                purpose="Test",
                tenure_days=30,
            )
            
            assert result["success"] is False
            assert "reason" in result
