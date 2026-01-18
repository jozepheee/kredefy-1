"""
Nova Agent - The Friendly AI Financial Buddy
Primary user-facing agent with multilingual support
"""

from typing import Dict, Any, List
from app.ai.engine import BaseAgent, AgentContext, AgentResult, ReasoningTrace, ThoughtType
from app.services.groq import groq_service
from app.config import get_settings
import json
import logging

logger = logging.getLogger(__name__)
settings = get_settings()


class NovaAgent(BaseAgent):
    """
    Nova - The user's personal financial AI assistant
    
    Capabilities:
    - Natural conversation in Hindi, Malayalam, English
    - Loan guidance and EMI explanations
    - Trust score insights
    - Financial coaching with empathy
    - Voice interaction support
    """
    
    def __init__(self):
        super().__init__(
            name="Nova",
            description="Friendly AI financial buddy who speaks your language"
        )
        self.personality_prompts = self._load_personality_prompts()
    
    def _load_personality_prompts(self) -> Dict[str, str]:
        """Load language-specific personality prompts"""
        return {
            "en": """You are Nova (नोवा), a warm and caring AI financial assistant for Kredefy.
You help poor and middle-class Indians manage money, get loans, and build trust.

YOUR PERSONALITY:
- Speak like a helpful neighbor, not a bank
- Use simple words, avoid jargon
- Be encouraging but honest
- Show empathy for financial struggles
- Celebrate small wins

WHEN EXPLAINING:
- EMI: "You pay ₹550 every week, 10 times total = ₹5500"
- Interest: "For every ₹100 you borrow, return ₹110"
- Trust Score: "7 out of 10 people in your circle trust you"

NEVER:
- Use percentages or complex math
- Judge someone's financial situation
- Recommend loans they can't afford""",
            
            "hi": """आप Nova (नोवा) हैं, Kredefy के लिए एक मिलनसार AI सहायक।
आप गरीब और मध्यम वर्ग के भारतीयों की मदद करते हैं।

आपका स्वभाव:
- पड़ोसी की तरह बात करें, बैंक की तरह नहीं
- सरल शब्दों का उपयोग करें
- हौसला बढ़ाएं लेकिन ईमानदार रहें
- आर्थिक कठिनाइयों के प्रति सहानुभूति दिखाएं

समझाते समय:
- EMI: "हर हफ्ते ₹550 दें, 10 बार = कुल ₹5500"
- ब्याज: "₹100 उधार लें, ₹110 वापस करें"
- भरोसा: "10 में से 7 लोग आप पर भरोसा करते हैं"

कभी नहीं:
- प्रतिशत या जटिल गणित का उपयोग करें
- किसी की आर्थिक स्थिति पर फैसला सुनाएं""",
            
            "ml": """നിങ്ങൾ Nova (നോവ) ആണ്, Kredefy-യുടെ സൗഹൃദ AI സഹായി.
ദരിദ്രരെയും ഇടത്തരക്കാരെയും സഹായിക്കുന്നു.

നിങ്ങളുടെ സ്വഭാവം:
- അയൽക്കാരനെ പോലെ സംസാരിക്കുക
- ലളിതമായ വാക്കുകൾ ഉപയോഗിക്കുക
- പ്രോത്സാഹിപ്പിക്കുക, എന്നാൽ സത്യസന്ധമായിരിക്കുക

വിശദീകരിക്കുമ്പോൾ:
- EMI: "എല്ലാ ആഴ്ചയും ₹550 അടയ്ക്കുക, 10 തവണ = ₹5500"
- പലിശ: "₹100 കടം വാങ്ങുക, ₹110 തിരികെ നൽകുക"
- വിശ്വാസം: "10-ൽ 7 പേർ നിങ്ങളെ വിശ്വസിക്കുന്നു\""""
        }
    
    async def execute(self, context: AgentContext) -> AgentResult:
        """Process user message and generate response"""
        trace = self.create_trace(f"Respond to: {context.current_request[:50]}...")
        
        try:
            # Step 1: Understand context
            trace.observe(
                f"User (trust score: {context.trust_score}, language: {context.language}) says: '{context.current_request}'",
                confidence=0.95
            )
            
            # Step 2: Analyze intent
            intent = await self._detect_intent(context.current_request, context.language)
            trace.analyze(
                f"Detected intent: {intent['intent']} (entities: {intent.get('entities', {})})",
                confidence=intent.get('confidence', 0.8)
            )
            
            # Step 3: Check if specialized agent needed
            if intent['intent'] in ['loan_request', 'loan_inquiry']:
                trace.hypothesize(
                    "User asking about loans - will consult LoanAdvisor agent",
                    confidence=0.85
                )
                return AgentResult(
                    agent_name=self.name,
                    success=True,
                    result={"needs_specialist": True, "intent": intent['intent']},
                    reasoning_trace=trace,
                    next_agent="LoanAdvisor"
                )
            
            if intent['intent'] in ['trust_score', 'reputation']:
                trace.hypothesize(
                    "User asking about trust - will consult TrustAnalyzer agent",
                    confidence=0.85
                )
                return AgentResult(
                    agent_name=self.name,
                    success=True,
                    result={"needs_specialist": True, "intent": intent['intent']},
                    reasoning_trace=trace,
                    next_agent="TrustAnalyzer"
                )
            
            # Step 4: Generate response
            trace.act(
                f"Generating empathetic response in {context.language}",
                confidence=0.9
            )
            
            response = await self._generate_response(context, intent)
            
            trace.conclude(
                f"Response ready: {response[:100]}...",
                confidence=0.88
            )
            
            context.add_trace(trace)
            
            return AgentResult(
                agent_name=self.name,
                success=True,
                result={
                    "response": response,
                    "intent": intent['intent'],
                    "language": context.language,
                },
                reasoning_trace=trace,
            )
            
        except Exception as e:
            trace.reflect(f"Error occurred: {str(e)}", confidence=0.3)
            return AgentResult(
                agent_name=self.name,
                success=False,
                result={"error": str(e)},
                reasoning_trace=trace,
            )
    
    async def _detect_intent(self, message: str, language: str) -> Dict[str, Any]:
        """Detect user intent using Groq LLM"""
        prompt = f"""Analyze this message and return JSON with intent and entities:
Message: "{message}"

Possible intents:
- greeting (hi, hello, namaste)
- loan_request (want loan, need money urgently)
- loan_inquiry (what is EMI, how much can I borrow)
- balance_check (my balance, SAATHI tokens)
- trust_score (my score, bharosa, trust level)
- payment_reminder (when is EMI due)
- emergency (urgent, hospital, emergency fund)
- general_question (anything else)

Return ONLY valid JSON: {{"intent": "...", "confidence": 0.0-1.0, "entities": {{}}}}
"""
        
        response = await groq_service.chat(prompt)
        try:
            # Parse JSON from response
            json_str = response.strip()
            if "```" in json_str:
                json_str = json_str.split("```")[1].replace("json", "").strip()
            return json.loads(json_str)
        except:
            return {"intent": "general_question", "confidence": 0.5}
    
    async def _generate_response(self, context: AgentContext, intent: Dict) -> str:
        """Generate contextual response"""
        system_prompt = self.personality_prompts.get(context.language, self.personality_prompts["en"])
        
        # Summarize financial diary
        recent_expenses = [d for d in context.financial_diary if d.get('type') == 'expense'][:5]
        expense_summary = ", ".join([f"₹{d.get('amount')} for {d.get('category', 'other')}" for d in recent_expenses])
        
        # Build context string
        ctx_info = f"""
USER CONTEXT:
- Name: {context.user_profile.get('full_name', 'Friend')}
- Trust Score: {context.trust_score}/100 ({context.trust_score // 10} out of 10 people trust them)
- SAATHI Balance: {context.saathi_balance} tokens
- Active Loans: {len([l for l in context.loans if l.get('status') == 'active' or l.get('status') == 'repaying'])}
- Circles: {len(context.circles)}
- Recent Activity: {expense_summary or 'No recent transactions'}

USER MESSAGE: {context.current_request}
DETECTED INTENT: {intent['intent']}

Generate a warm, helpful response in {context.language}. 
If they have active loans or low balance, offer proactive advice with empathy.
Keep it short (2-3 sentences).
"""
        
        return await groq_service.chat(ctx_info, system_prompt, context.language)
    
    async def explain_in_simple_terms(
        self,
        concept: str,
        amount: float = None,
        tenure_weeks: int = None,
        language: str = "en",
    ) -> str:
        """Explain financial concepts in simple terms - Amma ko samjhao mode"""
        
        explanations = {
            "emi": {
                "en": f"You pay ₹{amount:.0f} every week. After {tenure_weeks} weeks, you're done!",
                "hi": f"हर हफ्ते ₹{amount:.0f} दें। {tenure_weeks} हफ्ते बाद खत्म!",
                "ml": f"എല്ലാ ആഴ്ചയും ₹{amount:.0f} അടയ്ക്കുക. {tenure_weeks} ആഴ്ച കഴിഞ്ഞാൽ തീർന്നു!",
            },
            "interest": {
                "en": f"Borrow ₹{amount:.0f}, return ₹{amount * 1.1:.0f}. Extra ₹{amount * 0.1:.0f} is the cost of borrowing.",
                "hi": f"₹{amount:.0f} लें, ₹{amount * 1.1:.0f} वापस करें। ₹{amount * 0.1:.0f} उधार का खर्चा है।",
                "ml": f"₹{amount:.0f} കടം വാങ്ങുക, ₹{amount * 1.1:.0f} തിരികെ നൽകുക. ₹{amount * 0.1:.0f} കടത്തിന്റെ ചെലവ്.",
            },
            "trust_score": {
                "en": "Your trust score shows how many people believe in you. Higher = bigger loans possible.",
                "hi": "भरोसा स्कोर बताता है कितने लोग आप पर विश्वास करते हैं। ज्यादा = बड़ा लोन मिल सकता है।",
                "ml": "വിശ്വാസ സ്കോർ എത്ര പേർ നിങ്ങളെ വിശ്വസിക്കുന്നു എന്ന് കാണിക്കുന്നു. കൂടുതൽ = വലിയ വായ്പ സാധ്യം.",
            },
        }
        
        return explanations.get(concept, {}).get(language, "I'll explain simply...")
