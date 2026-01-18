"""
Kredefy Backend Tests
Pytest configuration and fixtures
"""

import pytest
import asyncio
from typing import Generator
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4


# ============================================
# Fixtures
# ============================================

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_user():
    """Mock authenticated user"""
    return MagicMock(
        id=uuid4(),
        phone="+919876543210",
        email=None,
    )


@pytest.fixture
def mock_profile():
    """Mock user profile"""
    return {
        "id": str(uuid4()),
        "phone": "+919876543210",
        "full_name": "Test User",
        "trust_score": 65,
        "saathi_balance": 100,
        "wallet_address": "0x1234567890abcdef",
        "language": "en",
    }


@pytest.fixture
def mock_loan():
    """Mock loan data"""
    return {
        "id": str(uuid4()),
        "borrower_id": str(uuid4()),
        "circle_id": str(uuid4()),
        "amount": 10000,
        "purpose": "Medical emergency",
        "tenure_days": 30,
        "emi_amount": 2500,
        "status": "voting",
    }


@pytest.fixture
def mock_vouch():
    """Mock vouch data"""
    return {
        "id": str(uuid4()),
        "voucher_id": str(uuid4()),
        "vouchee_id": str(uuid4()),
        "circle_id": str(uuid4()),
        "vouch_level": "strong",
        "saathi_staked": 100,
        "status": "active",
    }


@pytest.fixture
def mock_supabase():
    """Mock Supabase service"""
    with patch("app.services.supabase.supabase_service") as mock:
        mock.get_profile = AsyncMock()
        mock.create_vouch = AsyncMock()
        mock.update_saathi_balance = AsyncMock()
        mock.create_saathi_transaction = AsyncMock()
        mock.update_vouch_status = AsyncMock()
        mock.get_vouches_given = AsyncMock(return_value=[])
        mock.get_vouches_received = AsyncMock(return_value=[])
        yield mock


@pytest.fixture
def mock_blockchain():
    """Mock blockchain service"""
    with patch("app.services.advanced_blockchain.advanced_blockchain_service") as mock:
        mock.stake_for_vouch = AsyncMock(return_value="0xabc123")
        mock.create_loan_record = AsyncMock(return_value="0xdef456")
        mock.record_repayment = AsyncMock(return_value="0xghi789")
        yield mock
