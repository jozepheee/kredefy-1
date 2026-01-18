"""
Loan Advisor Agent - Intelligent Loan Recommendations
Personalized advice considering user's complete situation
"""

from typing import Dict, Any, List
from decimal import Decimal
from app.ai.engine import BaseAgent, AgentContext, AgentResult, ReasoningTrace, ThoughtType
from app.services.groq import groq_service
import logging

logger = logging.getLogger(__name__)


class LoanAdvisorAgent(BaseAgent):
    """
    Loan Advisor - AI expert for loan guidance
    
    Capabilities:
    - Personalized loan amount recommendations
    - EMI affordability analysis
    - Tenure optimization
    - Alternative suggestions when loan not possible
    - Explains everything in simple terms
    """
    
    def __init__(self):
        super().__init__(
            name="LoanAdvisor",
            description="Personalized loan guidance expert"
        )
    
    async def execute(self, context: AgentContext) -> AgentResult:
        """Analyze user situation and provide loan advice"""
        trace = self.create_trace(f"Loan advice for user {context.user_id[:8]}...")
        
        try:
            # Step 1: Analyze income from financial diary
            trace.observe(
                f"Analyzing: trust_score={context.trust_score}, "
                f"diary_entries={len(context.financial_diary)}, "
                f"active_loans={len([l for l in context.loans if l.get('status') == 'active'])}",
                confidence=0.95
            )
            
            income_analysis = self._analyze_income(context)
            trace.analyze(
                f"Monthly income estimate: ₹{income_analysis['estimated_monthly']:.0f} "
                f"(confidence: {income_analysis['confidence']:.0%})",
                confidence=income_analysis['confidence']
            )
            
            # Step 2: Calculate safe borrowing limit
            current_emi_burden = self._calculate_current_emi(context)
            safe_emi = income_analysis['estimated_monthly'] * 0.3 - current_emi_burden
            
            trace.analyze(
                f"Safe new EMI: ₹{max(safe_emi, 0):.0f}/week "
                f"(30% income rule, minus existing ₹{current_emi_burden:.0f})",
                confidence=0.85
            )
            
            # Step 3: Determine max loan based on trust score
            trust_multiplier = self._get_trust_multiplier(context.trust_score)
            base_limit = 5000 + (context.trust_score * 450)  # ₹5000 base + ₹450 per trust point
            max_loan = min(base_limit * trust_multiplier, 50000)
            
            trace.hypothesize(
                f"Max loan eligibility: ₹{max_loan:.0f} "
                f"(trust multiplier: {trust_multiplier}x)",
                confidence=0.82
            )
            
            # Step 4: Check if user can afford it
            if safe_emi <= 0:
                trace.reflect(
                    "User already has high EMI burden - recommend paying off existing loans first",
                    confidence=0.9
                )
                recommendation = {
                    "can_borrow": False,
                    "reason": "existing_emi_too_high",
                    "advice": "Pay off current loans first to qualify for new loan",
                    "suggested_action": "wait",
                }
            elif context.trust_score < 20:
                trace.reflect(
                    "Trust score too low - recommend building trust first",
                    confidence=0.88
                )
                recommendation = {
                    "can_borrow": False,
                    "reason": "trust_too_low",
                    "advice": "Get vouches from circle members to build trust",
                    "suggested_action": "get_vouches",
                }
            else:
                # Calculate recommended loan parameters
                recommended_amount = min(max_loan, safe_emi * 10 * 4)  # 10 weeks, 4 EMIs
                recommended_tenure_weeks = 10
                recommended_emi = recommended_amount / recommended_tenure_weeks
                
                trace.act(
                    f"Recommending: ₹{recommended_amount:.0f} for {recommended_tenure_weeks} weeks "
                    f"(₹{recommended_emi:.0f}/week EMI)",
                    confidence=0.87
                )
                
                recommendation = {
                    "can_borrow": True,
                    "max_amount": max_loan,
                    "recommended_amount": recommended_amount,
                    "recommended_tenure_weeks": recommended_tenure_weeks,
                    "recommended_emi": recommended_emi,
                    "explanation": self._explain_in_simple_terms(
                        recommended_amount, recommended_tenure_weeks, recommended_emi, context.language
                    ),
                }
            
            trace.conclude(
                f"Recommendation: {'Can borrow ₹' + str(recommendation.get('recommended_amount', 0)) if recommendation['can_borrow'] else 'Not recommended now'}",
                confidence=0.88
            )
            
            context.add_trace(trace)
            
            return AgentResult(
                agent_name=self.name,
                success=True,
                result={
                    "recommendation": recommendation,
                    "income_analysis": income_analysis,
                    "trust_score": context.trust_score,
                },
                reasoning_trace=trace,
            )
            
        except Exception as e:
            trace.reflect(f"Advice generation failed: {str(e)}", confidence=0.3)
            return AgentResult(
                agent_name=self.name,
                success=False,
                result={"error": str(e)},
                reasoning_trace=trace,
            )
    
    def _analyze_income(self, context: AgentContext) -> Dict[str, Any]:
        """Analyze income from financial diary"""
        income_entries = [
            e for e in context.financial_diary
            if e.get('type') == 'income'
        ]
        
        if not income_entries:
            return {
                "estimated_monthly": 10000,  # Conservative default
                "confidence": 0.3,
                "source": "default",
            }
        
        # Calculate average monthly income
        total = sum(float(e.get('amount', 0)) for e in income_entries[-30:])
        months = min(len(income_entries) / 10, 3)  # Assume ~10 entries/month
        
        if months > 0:
            monthly = total / months
            confidence = min(0.5 + (len(income_entries) * 0.02), 0.9)
        else:
            monthly = total
            confidence = 0.4
        
        return {
            "estimated_monthly": monthly,
            "confidence": confidence,
            "source": "diary_analysis",
            "entries_analyzed": len(income_entries),
        }
    
    def _calculate_current_emi(self, context: AgentContext) -> float:
        """Calculate current EMI burden"""
        active_loans = [l for l in context.loans if l.get('status') in ['disbursed', 'repaying']]
        total_emi = sum(float(l.get('emi_amount', 0)) for l in active_loans)
        return total_emi
    
    def _get_trust_multiplier(self, trust_score: int) -> float:
        """Get loan limit multiplier based on trust"""
        if trust_score >= 80:
            return 2.0
        elif trust_score >= 60:
            return 1.5
        elif trust_score >= 40:
            return 1.0
        elif trust_score >= 20:
            return 0.5
        else:
            return 0.25
    
    def _explain_in_simple_terms(
        self,
        amount: float,
        weeks: int,
        emi: float,
        language: str,
    ) -> str:
        """Explain loan in simple terms - Amma ko samjhao mode"""
        total_return = amount * 1.1  # 10% interest
        extra = total_return - amount
        
        explanations = {
            "en": f"Take ₹{amount:.0f}. Every week, give back ₹{emi:.0f}. "
                  f"After {weeks} weeks, done! Total you return: ₹{total_return:.0f} "
                  f"(₹{extra:.0f} extra for the help).",
            "hi": f"₹{amount:.0f} लीजिए। हर हफ्ते ₹{emi:.0f} वापस दीजिए। "
                  f"{weeks} हफ्ते बाद खत्म! कुल वापसी: ₹{total_return:.0f} "
                  f"(मदद के लिए ₹{extra:.0f} एक्स्ट्रा)।",
            "ml": f"₹{amount:.0f} എടുക്കുക. എല്ലാ ആഴ്ചയും ₹{emi:.0f} തിരികെ നൽകുക. "
                  f"{weeks} ആഴ്ച കഴിഞ്ഞാൽ തീർന്നു! ആകെ: ₹{total_return:.0f} "
                  f"(സഹായത്തിന് ₹{extra:.0f} അധികം)."
        }
        
        return explanations.get(language, explanations["en"])
