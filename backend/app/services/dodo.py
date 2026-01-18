"""
Dodo Payments Service - Real Integration
"""

import hmac
import hashlib
import json
from typing import Optional, Dict, Any
from decimal import Decimal
import httpx
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class DodoPaymentsService:
    """Dodo Payments API client"""
    
    def __init__(self):
        self.api_key = settings.dodo_api_key
        self.base_url = settings.dodo_base_url
        self.webhook_secret = settings.dodo_webhook_secret
        self.is_sandbox = "test" in str(self.api_key).lower() or not self.api_key
    
    @property
    def is_configured(self) -> bool:
        """Check if service is properly configured with credentials"""
        return bool(self.api_key)
    
    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
    
    async def create_checkout_session(
        self,
        amount: Decimal,
        description: str = "",
        product_name: str = "Kredefy Payment",
        customer_phone: Optional[str] = None,
        metadata: Optional[Dict] = None,
        success_url: str = "https://kredefy.com/payment/success",
        cancel_url: str = "https://kredefy.com/payment/cancel",
    ) -> Dict[str, Any]:
        """Create checkout session for payment"""
        if not self.is_configured:
            logger.warning("Dodo Payments not configured - simulating session")
            return {
                "checkout_id": "sim_check_12345",
                "checkout_url": f"{cancel_url}?simulated=true&amount={amount}",
                "simulated": True
            }

        async with httpx.AsyncClient() as client:
            # Dodo Payments V1 schema
            payload = {
                "amount": int(amount * 100), # to paise
                "currency": "INR",
                "product": {
                    "name": product_name,
                    "description": description or f"Payment for {product_name}",
                },
                "success_url": success_url,
                "cancel_url": cancel_url,
                "metadata": metadata or {},
            }
            
            if customer_phone:
                payload["customer"] = {"phone": customer_phone}
            
            try:
                response = await client.post(
                    f"{self.base_url}/checkout",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "checkout_id": data.get("id"),
                    "checkout_url": data.get("url") or data.get("checkout_url"),
                    "simulated": False
                }
            except Exception as e:
                logger.error(f"Dodo API error: {e}")
                raise
    
    async def create_payment_link(
        self,
        amount: Decimal,
        description: str = "",
        customer_phone: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Create shareable payment link"""
        async with httpx.AsyncClient() as client:
            payload = {
                "amount": int(amount * 100),
                "currency": "INR",
                "description": description,
            }
            if customer_phone:
                payload["customer_phone"] = customer_phone
            if metadata:
                payload["metadata"] = metadata
            
            response = await client.post(
                f"{self.base_url}/payment-links",
                json=payload,
                headers=self._get_headers(),
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "payment_link_id": data.get("id"),
                "payment_url": data.get("url"),
            }
    
    async def create_payout(
        self,
        amount: Decimal,
        recipient_upi_id: str,
        recipient_name: str,
        metadata: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Create payout to borrower UPI"""
        async with httpx.AsyncClient() as client:
            payload = {
                "amount": int(amount * 100),
                "currency": "INR",
                "recipient": {
                    "type": "upi",
                    "upi_id": recipient_upi_id,
                    "name": recipient_name,
                },
            }
            if metadata:
                payload["metadata"] = metadata
            
            response = await client.post(
                f"{self.base_url}/payouts",
                json=payload,
                headers=self._get_headers(),
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "payout_id": data.get("id"),
                "status": data.get("status"),
            }
    
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature"""
        expected = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(signature, expected)


dodo_service = DodoPaymentsService()
