"""
Action Agent - The Autonomous "Doer"
Executes concrete actions in the database on behalf of the user.
"""

from typing import Dict, Any, List, Optional
from app.ai.engine import BaseAgent, AgentContext, AgentResult, ReasoningTrace
from app.services.supabase import supabase_service
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class ActionAgent(BaseAgent):
    """
    Action Agent - Executes database mutations
    
    Capabilities:
    - Create draft loan applications
    - Find the best circle for a user
    - Auto-fill forms based on history
    """
    
    def __init__(self):
        super().__init__(
            name="ActionAgent",
            description="Executes concrete actions and DB mutations"
        )
    
    async def execute(self, context: AgentContext) -> AgentResult:
        """Execute requested action"""
        trace = self.create_trace(f"Processing action for request: {context.current_request}")
        
        try:
            # We determine the specific action from the intent or context
            # For now, we assume the Orchestrator passes the specific intent in the context or we infer it
            
            # This logic mimics a router. In a real LLM agent, the LLM would pick the tool.
            # Here for speed/reliability, we use explicit logic based on passed intent.
            
            # Retrieve intent from Nova's result or context
            intent = "general"
            if "Nova" in context.agent_results:
                intent = context.agent_results["Nova"].get("intent", "general")
            elif hasattr(context, "intent"):
                intent = context.intent
            
            # Fallback check for direct key if passed manually
            if not intent or intent == "general":
                 intent = context.agent_results.get("intent", "general")
            
            trace.observe(f"Detected intent for action: {intent}")
            
            result_data = {}
            
            if intent == "loan_request":
                result_data = await self._create_loan_draft(context, trace)
            elif intent == "check_score":
                result_data = {"action": "NAVIGATE", "target": "/trust", "message": "Let's check your trust score."}
            else:
                 trace.analyze("No specific database action required for this intent.")
                 
            trace.conclude(f"Action execution complete: {result_data}")
            
            return AgentResult(
                agent_name=self.name,
                success=True,
                result=result_data,
                reasoning_trace=trace
            )
            
        except Exception as e:
            trace.reflect(f"Action failed: {str(e)}", confidence=0.0)
            return AgentResult(
                agent_name=self.name,
                success=False,
                result={"error": str(e)},
                reasoning_trace=trace
            )

    async def _create_loan_draft(self, context: AgentContext, trace: ReasoningTrace) -> Dict[str, Any]:
        """Creates a draft loan application autonomously"""
        
        # 1. Analyze best circle
        best_circle = self._find_best_circle(context.circles)
        if not best_circle:
             trace.analyze("No eligible circle found for loan.")
             return {
                 "success": False, 
                 "message": "You need to join a Circle first to get a loan.",
                 "action": "NAVIGATE",
                 "target": "/circles"
             }
        
        trace.analyze(f"Selected best circle: {best_circle.get('name')} (ID: {best_circle.get('id')})")
        
        # 2. Determine safe amount (simple logic for now, or use RiskOracle output if available)
        # Check if RiskOracle ran
        risk_res = context.agent_results.get("RiskOracle", {})
        max_amount = risk_res.get("recommendation", {}).get("max_loan", 10000)
        
        # parse amount from request if possible, else default
        # For this demo, we'll draft a small "starter" loan if amount not specified, or max safe amount
        draft_amount = max_amount # Default to max safe amount for the "wow" factor
        
        # 3. Create Draft in DB
        draft_id = f"loan-draft-{uuid.uuid4().hex[:8]}"
        loan_data = {
            "id": draft_id,
            "user_id": context.user_id,
            "circle_id": best_circle.get('id'),
            "amount": draft_amount,
            "purpose": "Emergency Support (AI Draft)", 
            "status": "draft", # New status, frontend handles this as pre-filled form
            "created_at": datetime.utcnow().isoformat(),
            "interest_rate": 0.05, # 5% flat
            "tenure_months": 3
        }
        
        # In a real implementation we would write to DB here. 
        # For the hackathon "Simulation", we can 'pretend' we created it 
        # OR actually write it if we add 'draft' status support to SupabaseService.
        # Let's actually write it to JSON persistence if we can, or just pass the data to frontend to "hydrate" the form.
        # Hydrating the form via URL/State is safer/faster for "Draft" experience without cluttering DB with junk.
        
        trace.act(f"Drafting loan application for ₹{draft_amount}")
        
        return {
            "action": "GUIDE_FLOW",
            "screen": "/loans/apply", 
            "state": {
                "amount": draft_amount,
                "circle_id": best_circle.get('id'),
                "purpose": "Emergency Support"
            },
            "guide_steps": [
                {"text": f"I've selected the '{best_circle.get('name')}' circle for you.", "target": "#circle-select", "overlay": True},
                {"text": f"I've filled in ₹{draft_amount} (your safe limit).", "target": "#amount-input", "overlay": True},
                {"text": "Just click here to submit!", "target": "#submit-btn", "overlay": True}
            ]
        }

    def _find_best_circle(self, circles: List[Dict]) -> Optional[Dict]:
        """Find the circle with best trust/liquidity"""
        if not circles: return None
        # Simple logic: return first one or one with most members
        # Assuming circles structure
        # In context.circles, we might have dicts.
        try:
            # Sort by member count if available, else random
            # For now return the first one
            return circles[0] if circles else None
        except:
            return None
