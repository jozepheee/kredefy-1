"""
Trust Analyzer Agent - Deep Trust Network Analysis
Analyzes the social trust graph
"""

from typing import Dict, Any, List
from app.ai.engine import BaseAgent, AgentContext, AgentResult, ReasoningTrace, ThoughtType
import logging

logger = logging.getLogger(__name__)


class TrustAnalyzerAgent(BaseAgent):
    """
    Trust Analyzer - Deep analysis of trust networks
    
    Capabilities:
    - Trust graph visualization data
    - Vouch quality assessment
    - Circle health analysis
    - Trust score prediction
    - Reputation insights
    """
    
    def __init__(self):
        super().__init__(
            name="TrustAnalyzer",
            description="Deep trust network analysis and insights"
        )
    
    async def execute(self, context: AgentContext) -> AgentResult:
        """Analyze user's trust network"""
        trace = self.create_trace(f"Trust analysis for user {context.user_id[:8]}...")
        
        try:
            # Step 1: Analyze current trust components
            trace.observe(
                f"Trust score: {context.trust_score}, "
                f"Vouches received: {len(context.vouches)}, "
                f"Circles: {len(context.circles)}",
                confidence=0.95
            )
            
            # Step 2: Break down trust score components
            components = self._calculate_trust_components(context)
            trace.analyze(
                f"Trust breakdown - Base: {components['base']}, "
                f"Vouches: +{components['vouches']}, "
                f"Repayments: +{components['repayments']}, "
                f"Learning: +{components['learning']}",
                confidence=0.88
            )
            
            # Step 3: Analyze vouch quality
            vouch_quality = self._analyze_vouch_quality(context)
            trace.analyze(
                f"Vouch quality: {vouch_quality['grade']} - "
                f"{vouch_quality['strong_vouches']} strong, "
                f"{vouch_quality['basic_vouches']} basic",
                confidence=0.85
            )
            
            # Step 4: Predict future trust score
            prediction = self._predict_trust_trajectory(context)
            trace.hypothesize(
                f"30-day prediction: {prediction['predicted_score']} "
                f"({'+' if prediction['change'] > 0 else ''}{prediction['change']} change)",
                confidence=prediction['confidence']
            )
            
            # Step 5: Generate improvement tips
            tips = self._generate_improvement_tips(context, components)
            trace.act(
                f"Top tip: {tips[0]['tip']}" if tips else "No improvements needed",
                confidence=0.82
            )
            
            # Step 6: Calculate Bharosa Meter visual
            bharosa_visual = self._generate_bharosa_visual(context.trust_score)
            
            trace.conclude(
                f"Trust level: {bharosa_visual['level']} - {bharosa_visual['message']}",
                confidence=0.9
            )
            
            context.add_trace(trace)
            
            return AgentResult(
                agent_name=self.name,
                success=True,
                result={
                    "trust_score": context.trust_score,
                    "components": components,
                    "vouch_quality": vouch_quality,
                    "prediction": prediction,
                    "tips": tips,
                    "bharosa_visual": bharosa_visual,
                },
                reasoning_trace=trace,
            )
            
        except Exception as e:
            trace.reflect(f"Trust analysis failed: {str(e)}", confidence=0.3)
            return AgentResult(
                agent_name=self.name,
                success=False,
                result={"error": str(e)},
                reasoning_trace=trace,
            )
    
    def _calculate_trust_components(self, context: AgentContext) -> Dict[str, int]:
        """Break down trust score into components"""
        components = {
            "base": 10,  # Everyone starts with 10
            "vouches": 0,
            "repayments": 0,
            "learning": 0,
            "circle_participation": 0,
        }
        
        # Vouches contribution (5 points per active vouch received)
        active_vouches = [v for v in context.vouches if v.get('status') == 'active']
        components["vouches"] = min(len(active_vouches) * 5, 30)
        
        # Repayment contribution (10 points per completed loan)
        completed = [l for l in context.loans if l.get('status') == 'completed']
        components["repayments"] = min(len(completed) * 10, 40)
        
        # Circle participation (5 points per active circle)
        components["circle_participation"] = min(len(context.circles) * 5, 15)
        
        # Learning contribution (estimate from remaining score)
        accounted = sum(components.values())
        components["learning"] = max(0, context.trust_score - accounted)
        
        return components
    
    def _analyze_vouch_quality(self, context: AgentContext) -> Dict[str, Any]:
        """Analyze the quality of vouches received"""
        vouches = context.vouches
        
        strong = len([v for v in vouches if v.get('vouch_level') in ['strong', 'maximum']])
        basic = len([v for v in vouches if v.get('vouch_level') == 'basic'])
        
        total_staked = sum(float(v.get('saathi_staked', 0)) for v in vouches)
        
        if strong >= 3 and total_staked >= 200:
            grade = "A"
        elif strong >= 2 or total_staked >= 100:
            grade = "B"
        elif len(vouches) >= 2:
            grade = "C"
        else:
            grade = "D"
        
        return {
            "grade": grade,
            "strong_vouches": strong,
            "basic_vouches": basic,
            "total_staked": total_staked,
        }
    
    def _predict_trust_trajectory(self, context: AgentContext) -> Dict[str, Any]:
        """Predict trust score in 30 days"""
        current = context.trust_score
        
        # Positive factors
        active_vouches = len([v for v in context.vouches if v.get('status') == 'active'])
        active_loans = len([l for l in context.loans if l.get('status') in ['disbursed', 'repaying']])
        
        # Predict based on activity
        predicted_change = 0
        
        if active_loans > 0:
            predicted_change += 5  # Assume on-time payments
        
        if active_vouches > 0:
            predicted_change += 3  # Active trust network
        
        if len(context.circles) > 1:
            predicted_change += 2  # Multiple circles = more opportunity
        
        predicted = min(current + predicted_change, 100)
        
        return {
            "predicted_score": predicted,
            "change": predicted_change,
            "confidence": 0.7,
        }
    
    def _generate_improvement_tips(
        self,
        context: AgentContext,
        components: Dict[str, int],
    ) -> List[Dict[str, Any]]:
        """Generate actionable tips to improve trust"""
        tips = []
        
        if components["vouches"] < 20:
            tips.append({
                "tip": "Ask circle members to vouch for you",
                "potential_gain": "+5 to +15 points",
                "difficulty": "easy",
            })
        
        if components["repayments"] < 20 and len(context.loans) == 0:
            tips.append({
                "tip": "Take a small loan and repay on time",
                "potential_gain": "+10 points per loan",
                "difficulty": "medium",
            })
        
        if components["learning"] < 10:
            tips.append({
                "tip": "Complete financial literacy modules",
                "potential_gain": "+2 to +5 points per module",
                "difficulty": "easy",
            })
        
        if len(context.circles) < 2:
            tips.append({
                "tip": "Join or create another trust circle",
                "potential_gain": "+5 points",
                "difficulty": "easy",
            })
        
        return tips[:3]  # Top 3 tips
    
    def _generate_bharosa_visual(self, score: int) -> Dict[str, Any]:
        """Generate Bharosa Meter visual data"""
        dots = min(score // 10, 10)
        
        if score >= 80:
            level = "pakka_bharosa"
            level_name = "Pakka Bharosa"
            message = "You are highly trusted!"
            color = "green"
        elif score >= 60:
            level = "bhrosemand"
            level_name = "Bhrosemand"
            message = "People trust you well"
            color = "lime"
        elif score >= 40:
            level = "building"
            level_name = "Building Trust"
            message = "Keep going, almost there!"
            color = "yellow"
        elif score >= 20:
            level = "new"
            level_name = "New Member"
            message = "Get vouches to grow trust"
            color = "orange"
        else:
            level = "starting"
            level_name = "Just Started"
            message = "Join circles to begin"
            color = "gray"
        
        return {
            "score": score,
            "level": level,
            "level_name": level_name,
            "message": message,
            "color": color,
            "green_dots": dots,
            "gray_dots": 10 - dots,
            "display": f"{dots} out of 10 people trust you",
        }
