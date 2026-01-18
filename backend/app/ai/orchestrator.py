"""
Agent Orchestrator - Multi-Agent Collaboration System
Coordinates all AI agents for complex decisions
"""

from typing import Dict, Any, List, Optional
from app.ai.engine import BaseAgent, AgentContext, AgentResult, ReasoningTrace
from app.ai.agents.nova import NovaAgent
from app.ai.agents.risk_oracle import RiskOracleAgent
from app.ai.agents.fraud_guard import FraudGuardAgent
from app.ai.agents.loan_advisor import LoanAdvisorAgent
from app.ai.agents.trust_analyzer import TrustAnalyzerAgent
from app.ai.agents.action_agent import ActionAgent
from app.services.supabase import supabase_service
from app.services.mastra import mastra_service
import asyncio
import logging
from datetime import datetime
from app.config import get_settings

settings = get_settings()

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Master Orchestrator - Coordinates multi-agent collaboration
    
    This is what makes Kredefy's AI special:
    1. Visible reasoning traces for every decision
    2. Multi-agent collaboration for complex tasks
    3. Automatic agent handoff based on context
    4. Complete decision audit trail
    """
    
    def __init__(self):
        # Initialize all agents
        self.agents: Dict[str, BaseAgent] = {
            "Nova": NovaAgent(),
            "RiskOracle": RiskOracleAgent(),
            "FraudGuard": FraudGuardAgent(),
            "LoanAdvisor": LoanAdvisorAgent(),
            "TrustAnalyzer": TrustAnalyzerAgent(),
            "ActionAgent": ActionAgent(),
        }
        
        # Define agent workflows for complex tasks
        self.workflows = {
            "loan_request": ["FraudGuard", "RiskOracle", "LoanAdvisor", "ActionAgent"],
            "trust_inquiry": ["TrustAnalyzer", "ActionAgent"],
            "vouch_request": ["FraudGuard", "TrustAnalyzer"],
            "emergency_request": ["FraudGuard", "RiskOracle", "ActionAgent"],
        }
    
    async def build_context(self, user_id: str) -> AgentContext:
        """Build complete agent context from database"""
        profile = await supabase_service.get_profile(user_id)
        vouches = await supabase_service.get_vouches_received(user_id)
        loans = await supabase_service.get_user_loans(user_id)
        circles = await supabase_service.get_user_circles(user_id)
        diary = await supabase_service.get_diary_entries(user_id, 50)
        
        return AgentContext(
            user_id=user_id,
            user_profile=profile or {},
            trust_score=profile.get("trust_score", 0) if profile else 0,
            saathi_balance=float(profile.get("saathi_balance", 0)) if profile else 0,
            language=profile.get("language", "en") if profile else "en",
            circles=circles,
            loans=loans,
            vouches=vouches,
            financial_diary=diary,
        )
    
    async def process_message(
        self,
        user_id: str,
        message: str,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Process user message with full AI pipeline
        Returns response with all reasoning traces
        """
        start_time = datetime.utcnow()
        
        # Build context
        context = await self.build_context(user_id)
        context.current_request = message
        context.language = language
        
        all_traces = []
        
        # Try Mastra first for enhanced reasoning
        if settings.mastra_service_url:
            mastra_result = await mastra_service.chat(
                user_id=user_id,
                message=message,
                language=language,
                context={
                    "trustScore": context.trust_score,
                    "saathiBalance": context.saathi_balance,
                    "activeLoans": len([l for l in context.loans if l.get('status') == 'active']),
                }
            )
            if mastra_result.get("success"):
                trace = ReasoningTrace(
                    trace_id=f"Mastra_{datetime.utcnow().timestamp()}",
                    agent_name="Mastra-Nova",
                    task=f"Respond to: {message[:30]}...",
                )
                trace.observe(f"Mastra service received request in {language}")
                
                # Convert Mastra reasoning to our format
                for step in mastra_result.get("reasoning", []):
                    trace.analyze(f"Using tool {step['tool']}: {step['output']}")
                
                trace.conclude(mastra_result["response"])
                all_traces.append(trace)
                
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                return {
                    "response": mastra_result["response"],
                    "audio_url": None,
                    "reasoning_traces": [t.to_display(language) for t in all_traces],
                    "reasoning_traces_raw": [t.model_dump() for t in all_traces],
                    "agents_used": ["Mastra-Nova"],
                    "intent": mastra_result.get("intent", "chat"),
                    "duration_ms": duration_ms,
                }

        # Fallback to local agents
        nova_result = await self.agents["Nova"].execute(context)
        context.agent_results["Nova"] = nova_result.result
        
        all_traces = [nova_result.reasoning_trace]
        
        # Check if specialized agents needed
        if nova_result.next_agent:
            next_agent_name = nova_result.next_agent
            
            # Determine full workflow
            intent = nova_result.result.get("intent", "")
            workflow = self.workflows.get(intent, [next_agent_name])
            
            # Execute workflow agents
            for agent_name in workflow:
                if agent_name in self.agents:
                    agent = self.agents[agent_name]
                    result = await agent.execute(context)
                    context.agent_results[agent_name] = result.result
                    all_traces.append(result.reasoning_trace)
        
        # Calculate total time
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # Generate final response based on all agent results
        final_response = await self._synthesize_response(context, all_traces, language)
        
        return {
            "response": final_response.get("message"),
            "message": final_response.get("message"), # Redundant but safe
            "action": final_response.get("action"),
            "target": final_response.get("target"),
            "guide_steps": final_response.get("guide_steps"),
            "screen": final_response.get("screen"), # If used
            "data": final_response.get("data"),
            "audio_url": None,  # Would integrate ElevenLabs
            "reasoning_traces": [t.to_display(language) for t in all_traces],
            "reasoning_traces_raw": [t.model_dump() for t in all_traces],
            "agents_used": [t.agent_name for t in all_traces],
            "intent": nova_result.result.get("intent"),
            "duration_ms": duration_ms,
        }
    
    async def process_loan_request(
        self,
        user_id: str,
        amount: float,
        purpose: str,
        circle_id: str,
    ) -> Dict[str, Any]:
        """
        Full AI pipeline for loan requests
        Runs: FraudGuard → RiskOracle → LoanAdvisor
        """
        context = await self.build_context(user_id)
        context.current_request = f"Loan request: ₹{amount} for {purpose}"
        
        results = {}
        all_traces = []
        
        # Try Mastra workflow first
        if settings.mastra_service_url:
            mastra_result = await mastra_service.run_loan_workflow(
                user_id=user_id,
                loan_amount=amount,
                purpose=purpose,
                user_data={
                    "trustScore": context.trust_score,
                    "completedLoans": len([l for l in context.loans if l.get('status') == 'completed']),
                    "defaultedLoans": len([l for l in context.loans if l.get('status') == 'defaulted']),
                    "activeVouches": len([v for v in context.vouches if v.get('status') == 'active']),
                    "recentRequests": 1, 
                    "accountAgeDays": 30, # dummy values for now
                }
            )
            
            if mastra_result.get("success"):
                # Use Mastra result!
                return {
                    "approved": mastra_result["result"].get("approved", False),
                    "approved_amount": mastra_result["result"].get("approved_amount", 0),
                    "requested_amount": amount,
                    "risk_category": mastra_result["result"].get("risk_category"),
                    "recommendation": mastra_result["result"].get("recommendation", {}),
                    "reasoning_traces": [f"Mastra Workflow: {s['step']}" for s in mastra_result.get("steps", [])],
                }

        # Step 1: Fraud Check
        logger.info(f"Running FraudGuard for loan request")
        fraud_result = await self.agents["FraudGuard"].execute(context)
        results["fraud_check"] = fraud_result.result
        all_traces.append(fraud_result.reasoning_trace)
        
        if fraud_result.result.get("verdict") == "BLOCK":
            return {
                "approved": False,
                "reason": "Security check failed",
                "reasoning_traces": [t.to_display() for t in all_traces],
            }
        
        # Step 2: Risk Assessment
        logger.info(f"Running RiskOracle for loan request")
        risk_result = await self.agents["RiskOracle"].execute(context)
        results["risk_assessment"] = risk_result.result
        all_traces.append(risk_result.reasoning_trace)
        
        # Step 3: Loan Advice
        logger.info(f"Running LoanAdvisor for loan request")
        advisor_result = await self.agents["LoanAdvisor"].execute(context)
        results["loan_advice"] = advisor_result.result
        all_traces.append(advisor_result.reasoning_trace)
        
        # Synthesize final decision
        recommendation = advisor_result.result.get("recommendation", {})
        can_borrow = recommendation.get("can_borrow", False)
        
        if can_borrow:
            max_approved = min(
                amount,
                recommendation.get("max_amount", 0),
                risk_result.result.get("recommendation", {}).get("max_loan", 0),
            )
            
            return {
                "approved": True,
                "approved_amount": max_approved,
                "requested_amount": amount,
                "risk_category": risk_result.result.get("risk_category"),
                "recommendation": recommendation,
                "reasoning_traces": [t.to_display() for t in all_traces],
                "reasoning_traces_raw": [t.model_dump() for t in all_traces],
            }
        else:
            return {
                "approved": False,
                "requested_amount": amount,
                "reason": recommendation.get("reason"),
                "advice": recommendation.get("advice"),
                "suggested_action": recommendation.get("suggested_action"),
                "reasoning_traces": [t.to_display() for t in all_traces],
            }
    
    async def process_vouch_request(
        self,
        voucher_id: str,
        vouchee_id: str,
        circle_id: str,
        vouch_level: str,
    ) -> Dict[str, Any]:
        """
        AI analysis for vouch requests
        Checks for fraud and analyzes trust network
        """
        context = await self.build_context(vouchee_id)
        context.current_request = f"Vouch request: {vouch_level} level"
        
        all_traces = []
        
        # Fraud check on the vouchee
        fraud_result = await self.agents["FraudGuard"].execute(context)
        all_traces.append(fraud_result.reasoning_trace)
        
        if fraud_result.result.get("verdict") == "BLOCK":
            return {
                "recommended": False,
                "reason": "Security concerns with this user",
                "reasoning_traces": [t.to_display() for t in all_traces],
            }
        
        # Trust analysis
        trust_result = await self.agents["TrustAnalyzer"].execute(context)
        all_traces.append(trust_result.reasoning_trace)
        
        vouch_quality = trust_result.result.get("vouch_quality", {})
        
        return {
            "recommended": fraud_result.result.get("verdict") != "BLOCK",
            "vouchee_trust_score": context.trust_score,
            "vouch_quality_grade": vouch_quality.get("grade", "C"),
            "reasoning_traces": [t.to_display() for t in all_traces],
        }
    
    async def _synthesize_response(
        self,
        context: AgentContext,
        traces: List[ReasoningTrace],
        language: str,
    ) -> Dict[str, Any]:
        """Synthesize final response from all agent results"""
        
        response_payload = {"message": "How can I help you today?"}
        
        # Check ActionAgent first for proactive "Doer" actions
        action_result = context.agent_results.get("ActionAgent", {})
        if action_result.get("action"):
            # We have a concrete action to perform!
            response_payload = {
                "message": action_result.get("message", "I'm on it!"),
                "action": action_result.get("action"),
                "target": action_result.get("target"),
                "data": action_result.get("state"), # Pre-fill data
                "guide_steps": action_result.get("guide_steps")
            }
            # If there is also a text message from Nova/Advisor, prepend/append it?
            # For now, ActionAgent's message takes precedence or we combine.
            
        # Get Nova's response if available and no specific action overrides
        elif context.agent_results.get("Nova", {}).get("response"):
            response_payload = {"message": context.agent_results["Nova"]["response"]}
        
        # Build response from other agents if no text yet
        elif context.agent_results.get("LoanAdvisor", {}).get("recommendation"):
            rec = context.agent_results["LoanAdvisor"]["recommendation"]
            msg = rec.get("explanation", "You can apply for a loan!") if rec.get("can_borrow") else rec.get("advice", "Let me help you qualify.")
            response_payload = {"message": msg}
            
        elif context.agent_results.get("TrustAnalyzer", {}).get("bharosa_visual"):
            visual = context.agent_results["TrustAnalyzer"]["bharosa_visual"]
            response_payload = {"message": f"{visual['display']} - {visual['message']}"}

        return response_payload
    
    def get_all_traces(self) -> List[ReasoningTrace]:
        """Get all reasoning traces from all agents"""
        all_traces = []
        for agent in self.agents.values():
            all_traces.extend(agent.traces)
        return all_traces


# Singleton instance
orchestrator = AgentOrchestrator()
