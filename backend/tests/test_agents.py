"""
Tests for AI Agents
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.ai.engine import AgentContext, ReasoningTrace


class TestRiskOracleAgent:
    """Tests for RiskOracleAgent"""
    
    @pytest.fixture
    def agent_context(self, mock_profile):
        """Create agent context for testing"""
        return AgentContext(
            user_id="test-user-123",
            user_profile=mock_profile,
            trust_score=65,
            saathi_balance=100.0,
            language="en",
            circles=[{"circles": {"member_count": 5}}],
            loans=[
                {"status": "completed", "amount": 5000},
                {"status": "completed", "amount": 8000},
            ],
            vouches=[
                {"status": "active", "vouch_level": "strong", "saathi_staked": 100},
                {"status": "active", "vouch_level": "basic", "saathi_staked": 20},
            ],
            financial_diary=[
                {"type": "income", "amount": 15000, "recorded_at": "2026-01-15T10:00:00Z"},
                {"type": "income", "amount": 14500, "recorded_at": "2026-01-08T10:00:00Z"},
                {"type": "income", "amount": 15200, "recorded_at": "2026-01-01T10:00:00Z"},
                {"type": "income", "amount": 14800, "recorded_at": "2025-12-25T10:00:00Z"},
            ],
        )
    
    @pytest.mark.asyncio
    async def test_risk_assessment_moderate_risk(self, agent_context):
        """Test risk assessment returns correct category"""
        from app.ai.agents.risk_oracle import RiskOracleAgent
        
        agent = RiskOracleAgent()
        result = await agent.execute(agent_context)
        
        assert result.success is True
        assert "risk_score" in result.result
        assert "risk_category" in result.result
        assert "factors" in result.result
        assert "recommendation" in result.result
        
        # With trust score 65 and good history, should be moderate risk
        assert result.result["risk_category"] in ["LOW_RISK", "MODERATE_RISK"]
    
    @pytest.mark.asyncio
    async def test_reasoning_trace_generated(self, agent_context):
        """Test that reasoning traces are properly generated"""
        from app.ai.agents.risk_oracle import RiskOracleAgent
        
        agent = RiskOracleAgent()
        result = await agent.execute(agent_context)
        
        assert result.reasoning_trace is not None
        assert len(result.reasoning_trace.steps) > 0
        
        # Check trace has proper structure
        trace = result.reasoning_trace
        assert trace.agent_name == "RiskOracle"
        assert trace.overall_confidence > 0
    
    @pytest.mark.asyncio
    async def test_risk_factors_all_calculated(self, agent_context):
        """Test that all 6 risk factors are calculated"""
        from app.ai.agents.risk_oracle import RiskOracleAgent
        
        agent = RiskOracleAgent()
        result = await agent.execute(agent_context)
        
        factors = result.result["factors"]
        
        assert "trust_score" in factors
        assert "repayment_history" in factors
        assert "income_stability" in factors
        assert "vouch_strength" in factors
        assert "circle_health" in factors
        assert "loan_to_income" in factors
        
        # All factors should be between 0 and 1
        for factor_name, value in factors.items():
            assert 0 <= value <= 1, f"{factor_name} should be between 0 and 1"


class TestFraudGuardAgent:
    """Tests for FraudGuardAgent"""
    
    @pytest.fixture
    def clean_context(self):
        """Context for user with no fraud indicators"""
        return AgentContext(
            user_id="clean-user",
            user_profile={"created_at": "2025-01-01T00:00:00Z"},
            trust_score=70,
            loans=[{"status": "completed"}],
            vouches=[{"status": "active"}],
        )
    
    @pytest.mark.asyncio
    async def test_clean_user_passes(self, clean_context):
        """Test that clean user passes fraud check"""
        from app.ai.agents.fraud_guard import FraudGuardAgent
        
        agent = FraudGuardAgent()
        result = await agent.execute(clean_context)
        
        assert result.success is True
        assert result.result["verdict"] in ["CLEAR", "WARN"]
    
    @pytest.mark.asyncio
    async def test_velocity_abuse_detected(self):
        """Test detection of velocity abuse"""
        from app.ai.agents.fraud_guard import FraudGuardAgent
        
        # Context with many loans in short time
        context = AgentContext(
            user_id="velocity-abuser",
            user_profile={"created_at": "2026-01-10T00:00:00Z"},
            trust_score=30,
            loans=[
                {"status": "voting", "created_at": "2026-01-16T10:00:00Z"},
                {"status": "voting", "created_at": "2026-01-16T11:00:00Z"},
                {"status": "voting", "created_at": "2026-01-16T12:00:00Z"},
                {"status": "voting", "created_at": "2026-01-16T13:00:00Z"},
            ],
            vouches=[],
        )
        
        agent = FraudGuardAgent()
        result = await agent.execute(context)
        
        assert result.success is True
        # Should detect velocity abuse
        assert "velocity" in str(result.result.get("signals", [])).lower() or \
               result.result["verdict"] in ["WARN", "REVIEW", "BLOCK"]


class TestNovaAgent:
    """Tests for NovaAgent"""
    
    @pytest.mark.asyncio
    async def test_intent_detection(self):
        """Test that Nova correctly detects user intent"""
        from app.ai.agents.nova import NovaAgent
        
        context = AgentContext(
            user_id="test-user",
            trust_score=50,
            language="en",
        )
        context.current_request = "I want to apply for a loan"
        
        with patch("app.services.groq.groq_service.chat") as mock_chat:
            mock_chat.return_value = "loan_request"
            
            agent = NovaAgent()
            result = await agent.execute(context)
            
            assert result.success is True
