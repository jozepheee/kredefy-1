"""
Mastra AI Service - Advanced Multi-Agent Orchestration
Integrates with the specialized Mastra Node.js service
"""

import httpx
import logging
from typing import Optional, Dict, Any, List
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class MastraService:
    """Mastra AI client for multi-agent collaboration"""
    
    def __init__(self):
        self.base_url = settings.mastra_service_url or "http://localhost:4000"
        self.timeout = 60.0 # Agentic workflows can be slow
    
    async def chat(self, user_id: str, message: str, language: str = "en", context: Dict = None) -> Dict[str, Any]:
        """Chat with Nova via Mastra service"""
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"[MASTRA] Sending chat request to {self.base_url}/agents/nova/chat")
                response = await client.post(
                    f"{self.base_url}/agents/nova/chat",
                    json={
                        "userId": user_id,
                        "message": message,
                        "language": language,
                        "context": context or {}
                    },
                    timeout=self.timeout
                )
                response.raise_for_status()
                result = response.json()
                logger.info(f"[MASTRA] Chat response received: success={result.get('success', 'N/A')}")
                return result
            except httpx.ConnectError as e:
                logger.warning(f"[MASTRA] Service unavailable (Fallback to local): {e}")
                return {"success": False, "error": "Mastra service unavailable", "fallback": True}
            except Exception as e:
                logger.error(f"[MASTRA] Chat failed: {e}")
                return {"success": False, "error": str(e)}

    async def assess_risk(self, user_id: str, loan_amount: float, user_data: Dict) -> Dict[str, Any]:
        """Assess loan risk via Mastra RiskOracle"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/agents/risk-oracle/assess",
                    json={
                        "userId": user_id,
                        "loanAmount": loan_amount,
                        "userData": user_data
                    },
                    timeout=self.timeout
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Mastra risk assessment failed: {e}")
                return {"success": False, "error": str(e)}

    async def check_fraud(self, user_data: Dict, patterns: List[str] = None) -> Dict[str, Any]:
        """Check for fraud via Mastra FraudGuard"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/agents/fraud-guard/check",
                    json={
                        "userData": user_data,
                        "patterns": patterns or []
                    },
                    timeout=self.timeout
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Mastra fraud check failed: {e}")
                return {"success": False, "error": str(e)}

    async def run_loan_workflow(self, user_id: str, loan_amount: float, purpose: str, user_data: Dict) -> Dict[str, Any]:
        """Run full agentic loan workflow via Mastra"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/workflows/loan-request",
                    json={
                        "userId": user_id,
                        "loanAmount": loan_amount,
                        "purpose": purpose,
                        "userData": user_data
                    },
                    timeout=self.timeout
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Mastra loan workflow failed: {e}")
                return {"success": False, "error": str(e)}

mastra_service = MastraService()
