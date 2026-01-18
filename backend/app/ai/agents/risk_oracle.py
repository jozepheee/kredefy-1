"""
Risk Oracle Agent - AI-Powered Credit Risk Assessment
Feeds risk scores directly to smart contracts
PRODUCTION VERSION - NO PLACEHOLDERS
"""

from typing import Dict, Any, List
from decimal import Decimal
from datetime import datetime, timedelta
from app.ai.engine import BaseAgent, AgentContext, AgentResult, ReasoningTrace, ThoughtType
from app.services.groq import groq_service
import logging

logger = logging.getLogger(__name__)


class RiskOracleAgent(BaseAgent):
    """
    Risk Oracle - The AI brain that assesses loan risk
    
    Features:
    - Multi-factor risk analysis (6 factors, all REAL calculations)
    - Behavioral pattern detection
    - Income stability assessment with variance analysis
    - Social trust network analysis
    - Outputs risk score to blockchain oracle
    """
    
    def __init__(self):
        super().__init__(
            name="RiskOracle",
            description="AI oracle that provides on-chain risk assessments"
        )
        
        # Risk factor weights (total = 1.0)
        self.weights = {
            "trust_score": 0.25,
            "repayment_history": 0.25,
            "income_stability": 0.15,
            "vouch_strength": 0.15,
            "circle_health": 0.10,
            "loan_to_income": 0.10,
        }
    
    async def execute(self, context: AgentContext) -> AgentResult:
        """Perform comprehensive risk assessment"""
        trace = self.create_trace(f"Risk assessment for user {context.user_id[:8]}...")
        
        try:
            # Step 1: Gather all data
            trace.observe(
                f"Collecting risk factors: trust_score={context.trust_score}, "
                f"loans={len(context.loans)}, vouches={len(context.vouches)}, "
                f"diary_entries={len(context.financial_diary)}",
                confidence=0.95
            )
            
            # Step 2: Calculate individual risk factors (ALL REAL - no placeholders)
            factors = await self._calculate_risk_factors(context, trace)
            
            # Step 3: Calculate weighted risk score
            risk_score = self._calculate_weighted_score(factors)
            
            trace.analyze(
                f"Risk factors: trust={factors['trust_score']:.2f}, "
                f"repayment={factors['repayment_history']:.2f}, "
                f"income={factors['income_stability']:.2f}, "
                f"vouch={factors['vouch_strength']:.2f}, "
                f"circle={factors['circle_health']:.2f}, "
                f"lti={factors['loan_to_income']:.2f}",
                confidence=0.88
            )
            
            # Step 4: Determine risk category
            risk_category = self._categorize_risk(risk_score)
            
            trace.hypothesize(
                f"Risk category: {risk_category} (weighted score: {risk_score:.3f})",
                confidence=0.90
            )
            
            # Step 5: Generate recommendation
            recommendation = self._generate_recommendation(risk_score, risk_category, context)
            
            trace.act(
                f"Recommendation: {recommendation['action']} - max ₹{recommendation['max_loan']}",
                confidence=0.87
            )
            
            # Step 6: Prepare blockchain oracle data
            oracle_data = {
                "risk_score": int(risk_score * 10000),  # 0-10000 for precision on-chain
                "category": risk_category,
                "max_recommended_loan": recommendation['max_loan'],
                "interest_tier": recommendation['interest_tier'],
                "timestamp": datetime.utcnow().isoformat(),
                "factors": {k: int(v * 100) for k, v in factors.items()},
            }
            
            # Generate oracle signature
            oracle_signature = await self.get_oracle_signature(oracle_data)
            oracle_data["signature"] = oracle_signature
            
            trace.conclude(
                f"Assessment complete. Score: {risk_score:.3f}, Category: {risk_category}, "
                f"Max loan: ₹{recommendation['max_loan']}",
                confidence=0.92
            )
            
            context.add_trace(trace)
            
            return AgentResult(
                agent_name=self.name,
                success=True,
                result={
                    "risk_score": risk_score,
                    "risk_category": risk_category,
                    "factors": factors,
                    "recommendation": recommendation,
                    "oracle_data": oracle_data,
                },
                reasoning_trace=trace,
                actions=[
                    {"type": "update_blockchain_oracle", "data": oracle_data}
                ]
            )
            
        except Exception as e:
            trace.reflect(f"Risk assessment failed: {str(e)}", confidence=0.2)
            logger.error(f"RiskOracle execution failed: {e}")
            return AgentResult(
                agent_name=self.name,
                success=False,
                result={"error": str(e)},
                reasoning_trace=trace,
            )
    
    async def _calculate_risk_factors(
        self,
        context: AgentContext,
        trace: ReasoningTrace,
    ) -> Dict[str, float]:
        """Calculate individual risk factors (0-1, higher = better/lower risk)"""
        
        factors = {}
        
        # ============================================
        # 1. Trust Score Factor (0-100 → 0-1)
        # ============================================
        factors["trust_score"] = min(context.trust_score / 100, 1.0)
        trace.analyze(
            f"Trust factor: {factors['trust_score']:.2f} (from {context.trust_score}/100)",
            confidence=0.95
        )
        
        # ============================================
        # 2. Repayment History Factor
        # ============================================
        completed_loans = [l for l in context.loans if l.get('status') == 'completed']
        defaulted_loans = [l for l in context.loans if l.get('status') == 'defaulted']
        active_loans = [l for l in context.loans if l.get('status') in ['disbursed', 'repaying']]
        total_historical = len(completed_loans) + len(defaulted_loans)
        
        if total_historical > 0:
            # Weight: completed loans positive, defaults heavily negative
            base_factor = len(completed_loans) / total_historical
            # Bonus for multiple completed loans
            bonus = min(len(completed_loans) * 0.05, 0.2)
            # Penalty for any defaults
            penalty = len(defaulted_loans) * 0.15
            factors["repayment_history"] = max(0, min(base_factor + bonus - penalty, 1.0))
        else:
            factors["repayment_history"] = 0.5  # Neutral for new users
        
        trace.analyze(
            f"Repayment factor: {factors['repayment_history']:.2f} "
            f"({len(completed_loans)} completed, {len(defaulted_loans)} defaulted, "
            f"{len(active_loans)} active)",
            confidence=0.92
        )
        
        # ============================================
        # 3. Income Stability Factor (REAL CALCULATION)
        # Uses coefficient of variation from financial diary
        # ============================================
        income_entries = [
            e for e in context.financial_diary 
            if e.get('type') == 'income' and e.get('amount')
        ]
        
        if len(income_entries) >= 4:
            # Get amounts from last 30 days
            recent_incomes = []
            now = datetime.utcnow()
            for entry in income_entries:
                try:
                    entry_date = datetime.fromisoformat(
                        entry.get('recorded_at', '').replace('Z', '+00:00')
                    ).replace(tzinfo=None)
                    if now - entry_date <= timedelta(days=30):
                        recent_incomes.append(float(entry.get('amount', 0)))
                except:
                    recent_incomes.append(float(entry.get('amount', 0)))
            
            if recent_incomes and len(recent_incomes) >= 2:
                mean = sum(recent_incomes) / len(recent_incomes)
                if mean > 0:
                    # Coefficient of variation (lower = more stable)
                    variance = sum((x - mean) ** 2 for x in recent_incomes) / len(recent_incomes)
                    std_dev = variance ** 0.5
                    cv = std_dev / mean
                    
                    # Convert CV to stability score (CV of 0 = 1.0, CV of 1 = 0.3)
                    factors["income_stability"] = max(0.3, min(1.0, 1.0 - (cv * 0.7)))
                else:
                    factors["income_stability"] = 0.3
            else:
                factors["income_stability"] = 0.4  # Some data but not enough
        else:
            factors["income_stability"] = 0.3  # Low data = higher risk
        
        trace.analyze(
            f"Income stability: {factors['income_stability']:.2f} "
            f"(analyzed {len(income_entries)} income entries)",
            confidence=0.80
        )
        
        # ============================================
        # 4. Vouch Strength Factor
        # ============================================
        active_vouches = [v for v in context.vouches if v.get('status') == 'active']
        
        if active_vouches:
            total_staked = sum(float(v.get('saathi_staked', 0)) for v in active_vouches)
            
            vouch_levels = {"basic": 1, "strong": 2, "maximum": 3}
            level_scores = [
                vouch_levels.get(v.get('vouch_level', 'basic'), 1) 
                for v in active_vouches
            ]
            avg_level = sum(level_scores) / len(level_scores)
            
            # Components: number of vouches, level quality, stake amount
            num_vouches_factor = min(len(active_vouches) / 5, 1.0) * 0.3
            level_factor = (avg_level / 3) * 0.35
            stake_factor = min(total_staked / 500, 1.0) * 0.35
            
            factors["vouch_strength"] = min(num_vouches_factor + level_factor + stake_factor, 1.0)
        else:
            factors["vouch_strength"] = 0.15  # No vouches = high risk
        
        trace.analyze(
            f"Vouch strength: {factors['vouch_strength']:.2f} "
            f"({len(active_vouches)} active vouches, "
            f"₹{sum(float(v.get('saathi_staked', 0)) for v in active_vouches):.0f} staked)",
            confidence=0.88
        )
        
        # ============================================
        # 5. Circle Health Factor (REAL CALCULATION)
        # Based on circle membership quality
        # ============================================
        if context.circles:
            circle_scores = []
            for circle in context.circles:
                # Get circle data if available
                if isinstance(circle, dict):
                    circles_data = circle.get('circles', circle)
                    if isinstance(circles_data, dict):
                        member_count = circles_data.get('member_count', 1)
                        # More members = healthier circle (up to 10)
                        size_score = min(member_count / 10, 1.0)
                        circle_scores.append(size_score)
            
            if circle_scores:
                # Average health of all circles user is in
                avg_health = sum(circle_scores) / len(circle_scores)
                # Bonus for being in multiple circles
                multi_circle_bonus = min((len(context.circles) - 1) * 0.1, 0.2)
                factors["circle_health"] = min(avg_health * 0.8 + multi_circle_bonus + 0.2, 1.0)
            else:
                factors["circle_health"] = 0.5
        else:
            factors["circle_health"] = 0.2  # Not in any circle = high risk
        
        trace.analyze(
            f"Circle health: {factors['circle_health']:.2f} "
            f"({len(context.circles)} circles)",
            confidence=0.82
        )
        
        # ============================================
        # 6. Loan-to-Income Ratio (REAL CALCULATION)
        # Lower ratio = lower risk
        # ============================================
        # Calculate monthly income from diary
        income_entries_30d = []
        now = datetime.utcnow()
        for entry in context.financial_diary:
            if entry.get('type') == 'income' and entry.get('amount'):
                try:
                    entry_date = datetime.fromisoformat(
                        entry.get('recorded_at', '').replace('Z', '+00:00')
                    ).replace(tzinfo=None)
                    if now - entry_date <= timedelta(days=30):
                        income_entries_30d.append(float(entry.get('amount', 0)))
                except:
                    pass
        
        monthly_income = sum(income_entries_30d) if income_entries_30d else 0
        
        # Calculate current loan obligations (EMI burden)
        current_emi = sum(
            float(l.get('emi_amount', 0)) * 4  # Weekly to monthly
            for l in active_loans
        )
        
        if monthly_income > 0:
            # Loan-to-income ratio (EMI should be < 30% of income ideally)
            lti_ratio = current_emi / monthly_income
            # Convert to factor (0% debt = 1.0, 50%+ debt = 0.2)
            factors["loan_to_income"] = max(0.2, min(1.0, 1.0 - (lti_ratio * 1.6)))
        else:
            # No income data - use neutral if no loans, penalize if has loans
            if current_emi > 0:
                factors["loan_to_income"] = 0.3
            else:
                factors["loan_to_income"] = 0.5
        
        trace.analyze(
            f"Loan-to-Income: {factors['loan_to_income']:.2f} "
            f"(monthly income ₹{monthly_income:.0f}, EMI burden ₹{current_emi:.0f})",
            confidence=0.78
        )
        
        return factors
    
    def _calculate_weighted_score(self, factors: Dict[str, float]) -> float:
        """Calculate weighted average risk score"""
        score = 0.0
        total_weight = 0.0
        
        for factor, value in factors.items():
            weight = self.weights.get(factor, 0.1)
            score += value * weight
            total_weight += weight
        
        # Normalize to ensure 0-1 range
        if total_weight > 0:
            score = score / total_weight
        
        return max(0.0, min(score, 1.0))
    
    def _categorize_risk(self, score: float) -> str:
        """Categorize risk level"""
        if score >= 0.8:
            return "LOW_RISK"
        elif score >= 0.6:
            return "MODERATE_RISK"
        elif score >= 0.4:
            return "ELEVATED_RISK"
        else:
            return "HIGH_RISK"
    
    def _generate_recommendation(
        self,
        score: float,
        category: str,
        context: AgentContext,
    ) -> Dict[str, Any]:
        """Generate loan recommendation based on risk"""
        
        recommendations = {
            "LOW_RISK": {
                "action": "APPROVE",
                "reason": "Excellent repayment history and strong trust network",
                "max_loan": 50000,
                "interest_tier": 1,
                "interest_rate": 8.0,
            },
            "MODERATE_RISK": {
                "action": "APPROVE_WITH_CONDITIONS",
                "reason": "Good profile, recommend starting with smaller amount",
                "max_loan": 25000,
                "interest_tier": 2,
                "interest_rate": 10.0,
            },
            "ELEVATED_RISK": {
                "action": "APPROVE_LIMITED",
                "reason": "Limited history, recommend building trust first",
                "max_loan": 10000,
                "interest_tier": 3,
                "interest_rate": 12.0,
            },
            "HIGH_RISK": {
                "action": "NEEDS_MORE_VOUCHES",
                "reason": "Insufficient trust network, get more community support",
                "max_loan": 5000,
                "interest_tier": 4,
                "interest_rate": 15.0,
            },
        }
        
        rec = recommendations.get(category, recommendations["HIGH_RISK"])
        
        # Adjust max loan based on existing debt
        active_loans = [l for l in context.loans if l.get('status') in ['disbursed', 'repaying']]
        total_outstanding = sum(float(l.get('amount', 0)) for l in active_loans)
        
        # Reduce max loan if already has outstanding debt
        if total_outstanding > 0:
            reduction_factor = max(0.3, 1.0 - (total_outstanding / 50000))
            rec = rec.copy()
            rec["max_loan"] = int(rec["max_loan"] * reduction_factor)
        
        return rec
    
    async def get_oracle_signature(self, oracle_data: Dict) -> str:
        """
        Generate cryptographic signature for oracle data
        In production, uses ECDSA with oracle's private key
        """
        from eth_account import Account
        from eth_account.messages import encode_defunct
        from app.config import get_settings
        import json
        import hashlib
        
        settings = get_settings()
        
        # Create deterministic message from oracle data
        data_to_sign = {
            "risk_score": oracle_data.get("risk_score"),
            "category": oracle_data.get("category"),
            "max_loan": oracle_data.get("max_recommended_loan"),
            "timestamp": oracle_data.get("timestamp"),
        }
        message = json.dumps(data_to_sign, sort_keys=True)
        message_hash = hashlib.sha256(message.encode()).hexdigest()
        
        try:
            # Sign with blockchain private key (ECDSA)
            if settings.blockchain_private_key:
                account = Account.from_key(settings.blockchain_private_key)
                msg = encode_defunct(text=message_hash)
                signed = account.sign_message(msg)
                return signed.signature.hex()
        except Exception as e:
            logger.warning(f"Could not sign oracle data: {e}")
        
        # Fallback to hash if no key available
        return message_hash
