"""
Fraud Guard Agent - Real-time Fraud Detection
Uses pattern analysis and behavioral AI
"""

from typing import Dict, Any, List
from app.ai.engine import BaseAgent, AgentContext, AgentResult, ReasoningTrace, ThoughtType
from app.services.groq import groq_service
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class FraudGuardAgent(BaseAgent):
    """
    FraudGuard - AI security system for detecting fraud
    
    Detection Capabilities:
    - Velocity abuse (too many requests)
    - Collusion patterns (circle members conspiring)
    - Identity anomalies
    - Behavioral deviation
    - Sybil attacks (fake accounts)
    """
    
    def __init__(self):
        super().__init__(
            name="FraudGuard",
            description="AI-powered fraud detection and prevention"
        )
        
        # Fraud detection thresholds
        self.thresholds = {
            "max_loans_per_day": 3,
            "max_loan_amount_new_user": 10000,
            "min_circle_age_days": 7,
            "suspicious_vouch_ratio": 0.8,  # Too many vouches from same person
            "rapid_trust_growth": 20,  # Points per day
        }
    
    async def execute(self, context: AgentContext) -> AgentResult:
        """Perform comprehensive fraud analysis"""
        trace = self.create_trace(f"Fraud check for user {context.user_id[:8]}...")
        
        try:
            # Initialize fraud signals
            fraud_signals: List[Dict] = []
            risk_level = 0.0
            
            # Step 1: Check velocity patterns
            trace.observe(
                f"Analyzing activity patterns: {len(context.loans)} loans, "
                f"{len(context.vouches)} vouches",
                confidence=0.95
            )
            
            velocity_check = await self._check_velocity(context)
            if velocity_check['suspicious']:
                fraud_signals.append(velocity_check)
                risk_level += velocity_check['risk_weight']
                trace.analyze(
                    f"🚨 Velocity anomaly: {velocity_check['reason']}",
                    confidence=0.9
                )
            
            # Step 2: Check collusion patterns
            collusion_check = await self._check_collusion(context)
            if collusion_check['suspicious']:
                fraud_signals.append(collusion_check)
                risk_level += collusion_check['risk_weight']
                trace.analyze(
                    f"🚨 Collusion pattern: {collusion_check['reason']}",
                    confidence=0.85
                )
            
            # Step 3: Check behavioral anomalies
            behavior_check = await self._check_behavioral_anomalies(context)
            if behavior_check['suspicious']:
                fraud_signals.append(behavior_check)
                risk_level += behavior_check['risk_weight']
                trace.analyze(
                    f"🚨 Behavioral anomaly: {behavior_check['reason']}",
                    confidence=0.8
                )
            
            # Step 4: Check Sybil indicators
            sybil_check = await self._check_sybil_attack(context)
            if sybil_check['suspicious']:
                fraud_signals.append(sybil_check)
                risk_level += sybil_check['risk_weight']
                trace.analyze(
                    f"🚨 Sybil indicator: {sybil_check['reason']}",
                    confidence=0.75
                )
            
            # Step 5: Determine verdict
            risk_level = min(risk_level, 1.0)
            
            if risk_level >= 0.8:
                verdict = "BLOCK"
                trace.act("Blocking transaction - high fraud probability", confidence=0.92)
            elif risk_level >= 0.5:
                verdict = "REVIEW"
                trace.act("Flagging for manual review", confidence=0.85)
            elif risk_level >= 0.3:
                verdict = "WARN"
                trace.act("Proceed with warning", confidence=0.88)
            else:
                verdict = "CLEAR"
                trace.act("No fraud signals detected", confidence=0.9)
            
            trace.conclude(
                f"Verdict: {verdict} (risk: {risk_level:.2%}, signals: {len(fraud_signals)})",
                confidence=0.88
            )
            
            context.add_trace(trace)
            
            return AgentResult(
                agent_name=self.name,
                success=True,
                result={
                    "verdict": verdict,
                    "risk_level": risk_level,
                    "fraud_signals": fraud_signals,
                    "can_proceed": verdict in ["CLEAR", "WARN"],
                },
                reasoning_trace=trace,
                actions=[
                    {"type": "log_fraud_check", "verdict": verdict, "risk": risk_level}
                ] if verdict != "CLEAR" else []
            )
            
        except Exception as e:
            trace.reflect(f"Fraud check failed: {str(e)}", confidence=0.3)
            return AgentResult(
                agent_name=self.name,
                success=False,
                result={"error": str(e), "verdict": "REVIEW"},
                reasoning_trace=trace,
            )
    
    async def _check_velocity(self, context: AgentContext) -> Dict:
        """Check for velocity abuse"""
        recent_loans = [
            l for l in context.loans
            if self._is_recent(l.get('created_at'), hours=24)
        ]
        
        if len(recent_loans) > self.thresholds['max_loans_per_day']:
            return {
                "type": "velocity",
                "suspicious": True,
                "reason": f"{len(recent_loans)} loan requests in 24h (max: {self.thresholds['max_loans_per_day']})",
                "risk_weight": 0.3,
            }
        
        return {"type": "velocity", "suspicious": False, "risk_weight": 0}
    
    async def _check_collusion(self, context: AgentContext) -> Dict:
        """Check for collusion patterns in circles"""
        # Check if same people keep vouching for each other
        voucher_ids = [v.get('voucher_id') for v in context.vouches]
        
        if voucher_ids:
            most_common = max(set(voucher_ids), key=voucher_ids.count)
            ratio = voucher_ids.count(most_common) / len(voucher_ids)
            
            if ratio > self.thresholds['suspicious_vouch_ratio']:
                return {
                    "type": "collusion",
                    "suspicious": True,
                    "reason": f"{ratio:.0%} of vouches from single user",
                    "risk_weight": 0.4,
                }
        
        return {"type": "collusion", "suspicious": False, "risk_weight": 0}
    
    async def _check_behavioral_anomalies(self, context: AgentContext) -> Dict:
        """Check for unusual behavioral patterns"""
        # Check rapid trust score growth
        # In production, would check trust_score_history table
        
        if context.trust_score > 80 and len(context.loans) < 2:
            return {
                "type": "behavior",
                "suspicious": True,
                "reason": "High trust score with minimal loan history",
                "risk_weight": 0.25,
            }
        
        return {"type": "behavior", "suspicious": False, "risk_weight": 0}
    
    async def _check_sybil_attack(self, context: AgentContext) -> Dict:
        """Check for Sybil attack indicators (fake accounts)"""
        # Check if user has many vouches but circles are all new
        if context.circles:
            new_circles = [c for c in context.circles if self._is_recent(c.get('created_at'), days=7)]
            
            if len(new_circles) == len(context.circles) and len(context.vouches) > 5:
                return {
                    "type": "sybil",
                    "suspicious": True,
                    "reason": "Many vouches but all circles are new",
                    "risk_weight": 0.35,
                }
        
        return {"type": "sybil", "suspicious": False, "risk_weight": 0}
    
    def _is_recent(self, timestamp_str: str, hours: int = 0, days: int = 0) -> bool:
        """Check if timestamp is within recent period"""
        if not timestamp_str:
            return False
        try:
            ts = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            delta = timedelta(hours=hours, days=days)
            return datetime.utcnow() - ts.replace(tzinfo=None) < delta
        except:
            return False
