"""
Domain Services - Business Logic Layer
Separates business logic from API handlers
"""

from typing import Optional, List, Dict, Any
from decimal import Decimal
from uuid import UUID
from datetime import datetime
import logging

from app.services.supabase import supabase_service
from app.services import get_advanced_blockchain_service
from app.services.dodo import dodo_service
from app.services.twilio import twilio_service
from app.ai.orchestrator import orchestrator
from app.utils import retry_with_backoff, dodo_circuit, blockchain_circuit

logger = logging.getLogger(__name__)


class VouchingDomainService:
    """
    Domain service for vouching operations
    Handles all business logic for stake-to-vouch
    """
    
    VOUCH_LEVELS = {
        "basic": {"min_stake": 10, "max_stake": 50, "trust_impact": 5},
        "strong": {"min_stake": 50, "max_stake": 200, "trust_impact": 10},
        "maximum": {"min_stake": 200, "max_stake": 500, "trust_impact": 20},
    }
    
    async def create_vouch(
        self,
        voucher_id: UUID,
        vouchee_id: UUID,
        circle_id: UUID,
        vouch_level: str,
        saathi_amount: Decimal,
    ) -> Dict[str, Any]:
        """
        Create a vouch with all side effects
        
        Side effects:
        1. Deduct SAATHI from voucher
        2. Record vouch in database
        3. Update vouchee trust score
        4. Record on blockchain
        5. Record transaction history
        """
        # Validate vouch level
        if vouch_level not in self.VOUCH_LEVELS:
            raise ValueError(f"Invalid vouch level: {vouch_level}")
        
        level_config = self.VOUCH_LEVELS[vouch_level]
        
        # Validate stake amount
        if saathi_amount < level_config["min_stake"]:
            raise ValueError(
                f"Minimum stake for {vouch_level} is {level_config['min_stake']} SAATHI"
            )
        if saathi_amount > level_config["max_stake"]:
            raise ValueError(
                f"Maximum stake for {vouch_level} is {level_config['max_stake']} SAATHI"
            )
        
        # Check voucher balance
        profile = await supabase_service.get_profile(voucher_id)
        if not profile:
            raise ValueError("Voucher profile not found")
        
        current_balance = Decimal(str(profile.get("saathi_balance", 0)))
        if current_balance < saathi_amount:
            raise ValueError(
                f"Insufficient SAATHI. Need {saathi_amount}, have {current_balance}"
            )
        
        # Check if already vouching for this person
        existing_vouches = await supabase_service.get_vouches_given(voucher_id)
        if any(v["vouchee_id"] == str(vouchee_id) and v["status"] == "active" 
               for v in existing_vouches):
            raise ValueError("Already have an active vouch for this user")
        
        # Execute all operations
        try:
            # 1. Deduct SAATHI
            await supabase_service.update_saathi_balance(
                voucher_id, -float(saathi_amount)
            )
            
            # 2. Create vouch record
            vouch = await supabase_service.create_vouch({
                "voucher_id": str(voucher_id),
                "vouchee_id": str(vouchee_id),
                "circle_id": str(circle_id),
                "vouch_level": vouch_level,
                "saathi_staked": float(saathi_amount),
                "status": "active",
            })
            
            # 3. Update vouchee trust score
            trust_increase = level_config["trust_impact"]
            await supabase_service.update_trust_score(
                vouchee_id,
                trust_increase,
                f"Received {vouch_level} vouch",
            )
            
            # 4. Record transaction
            await supabase_service.create_saathi_transaction({
                "user_id": str(voucher_id),
                "type": "stake",
                "amount": float(saathi_amount),
                "reference_id": vouch["id"],
                "description": f"Staked for {vouch_level} vouch",
            })
            
            # 5. Blockchain (async, non-blocking)
            tx_hash = await self._record_on_blockchain(
                voucher_id, vouchee_id, saathi_amount
            )
            
            if tx_hash:
                vouch = await supabase_service.update_vouch_status(
                    vouch["id"], "active", tx_hash
                )
            
            logger.info(
                f"Vouch created: {voucher_id} → {vouchee_id}, "
                f"level={vouch_level}, stake={saathi_amount}"
            )
            
            return vouch
            
        except Exception as e:
            # Rollback: return SAATHI if vouch failed
            logger.error(f"Vouch creation failed, rolling back: {e}")
            try:
                await supabase_service.update_saathi_balance(
                    voucher_id, float(saathi_amount)
                )
            except Exception as rollback_error:
                logger.error(f"Rollback failed: {rollback_error}")
            raise
    
    @retry_with_backoff(max_retries=2, base_delay=1.0)
    async def _record_on_blockchain(
        self,
        voucher_id: UUID,
        vouchee_id: UUID,
        amount: Decimal,
    ) -> Optional[str]:
        """Record vouch on blockchain with retry"""
        voucher_profile = await supabase_service.get_profile(voucher_id)
        vouchee_profile = await supabase_service.get_profile(vouchee_id)
        
        if not voucher_profile or not vouchee_profile:
            return None
        
        voucher_wallet = voucher_profile.get("wallet_address")
        vouchee_wallet = vouchee_profile.get("wallet_address")
        
        if not voucher_wallet or not vouchee_wallet:
            return None
        
        async with blockchain_circuit:
            blockchain = get_advanced_blockchain_service()
            if blockchain and blockchain.is_configured:
                return await blockchain.stake_for_vouch(
                    voucher_wallet, vouchee_wallet, int(amount)
                )
            return None
    
    async def slash_vouch(
        self,
        vouch_id: UUID,
        default_loan_id: UUID,
        slash_percentage: int = 50,
    ) -> Dict[str, Any]:
        """
        Slash a vouch when vouchee defaults
        Burns staked SAATHI tokens
        """
        # Get vouch details
        vouches = await supabase_service.get_vouches_given(UUID("00000000-0000-0000-0000-000000000000"))
        vouch = next((v for v in vouches if v["id"] == str(vouch_id)), None)
        
        if not vouch:
            raise ValueError("Vouch not found")
        
        if vouch["status"] != "active":
            raise ValueError("Vouch is not active")
        
        staked_amount = Decimal(str(vouch["saathi_staked"]))
        slash_amount = staked_amount * Decimal(str(slash_percentage)) / 100
        
        # Update vouch status
        await supabase_service.update_vouch_status(vouch_id, "slashed")
        
        # Record slash transaction
        await supabase_service.create_saathi_transaction({
            "user_id": vouch["voucher_id"],
            "type": "slash",
            "amount": float(slash_amount),
            "reference_id": str(default_loan_id),
            "description": f"Slashed {slash_percentage}% for default",
        })
        
        # Decrease voucher trust score
        await supabase_service.update_trust_score(
            vouch["voucher_id"],
            -15,
            "Vouched for defaulter",
        )
        
        logger.warning(
            f"Vouch slashed: {vouch_id}, amount={slash_amount}, "
            f"reason=default on {default_loan_id}"
        )
        
        return {"slashed_amount": float(slash_amount)}


class LoanDomainService:
    """
    Domain service for loan operations
    Handles loan lifecycle with AI integration
    """
    
    async def request_loan(
        self,
        borrower_id: UUID,
        circle_id: UUID,
        amount: Decimal,
        purpose: str,
        tenure_days: int,
    ) -> Dict[str, Any]:
        """
        Create loan request with AI assessment
        """
        # 1. Run AI risk assessment
        ai_result = await orchestrator.process_loan_request(
            user_id=str(borrower_id),
            amount=float(amount),
            purpose=purpose,
            circle_id=str(circle_id),
        )
        
        if not ai_result.get("approved"):
            return {
                "success": False,
                "reason": ai_result.get("reason"),
                "advice": ai_result.get("advice"),
                "reasoning_traces": ai_result.get("reasoning_traces", []),
            }
        
        # 2. Calculate EMI
        approved_amount = Decimal(str(ai_result.get("approved_amount", amount)))
        weekly_emi = approved_amount / (tenure_days // 7)
        
        # 3. Create loan record
        loan = await supabase_service.create_loan({
            "borrower_id": str(borrower_id),
            "circle_id": str(circle_id),
            "amount": float(approved_amount),
            "purpose": purpose,
            "tenure_days": tenure_days,
            "emi_amount": float(weekly_emi),
            "status": "voting",
            "risk_category": ai_result.get("risk_category"),
        })
        
        # 4. Record on blockchain
        profile = await supabase_service.get_profile(borrower_id)
        blockchain = get_advanced_blockchain_service()
        if profile and profile.get("wallet_address") and blockchain and blockchain.is_configured:
            tx_hash = await blockchain.create_loan_record(
                loan["id"],
                profile["wallet_address"],
                int(approved_amount),
                tenure_days,
            )
            if tx_hash:
                loan = await supabase_service.update_loan(
                    loan["id"], {"blockchain_tx_hash": tx_hash}
                )
        
        return {
            "success": True,
            "loan": loan,
            "ai_analysis": ai_result,
        }
    
    async def disburse_loan(
        self,
        loan_id: UUID,
        admin_id: UUID,
    ) -> Dict[str, Any]:
        """
        Disburse approved loan via Dodo Payments
        """
        loan = await supabase_service.get_loan(loan_id)
        if not loan:
            raise ValueError("Loan not found")
        
        if loan["status"] != "approved":
            raise ValueError(f"Loan cannot be disbursed, status: {loan['status']}")
        
        borrower = await supabase_service.get_profile(loan["borrower_id"])
        if not borrower:
            raise ValueError("Borrower not found")
        
        # Create UPI ID from phone
        upi_id = f"{borrower['phone']}@upi"
        
        # Disburse via Dodo with circuit breaker
        async with dodo_circuit:
            payment = await dodo_service.create_payout(
                Decimal(str(loan["amount"])),
                upi_id,
                borrower.get("full_name", "User"),
                metadata={"loan_id": str(loan_id)},
            )
        
        # Update loan status
        loan = await supabase_service.update_loan(loan_id, {
            "status": "disbursed",
            "dodo_payment_id": payment.get("payout_id"),
            "disbursed_at": datetime.utcnow().isoformat(),
        })
        
        # Send notification
        try:
            await twilio_service.send_loan_approved(
                borrower["phone"],
                loan["amount"],
                borrower.get("language", "en"),
            )
        except Exception as e:
            logger.warning(f"Failed to send disbursement notification: {e}")
        
        return {
            "loan": loan,
            "payment": payment,
        }


class PaymentDomainService:
    """
    Domain service for payment operations
    """
    
    async def process_repayment(
        self,
        loan_id: UUID,
        amount: Decimal,
        dodo_payment_id: str,
    ) -> Dict[str, Any]:
        """
        Process a loan repayment
        Updates database, blockchain, and trust score
        """
        loan = await supabase_service.get_loan(loan_id)
        if not loan:
            raise ValueError("Loan not found")
        
        # 1. Create repayment record
        repayment = await supabase_service.create_repayment({
            "loan_id": str(loan_id),
            "amount": float(amount),
            "dodo_payment_id": dodo_payment_id,
            "status": "completed",
        })
        
        # 2. Record on blockchain
        blockchain = get_advanced_blockchain_service()
        tx_hash = None
        if blockchain and blockchain.is_configured:
            tx_hash = await blockchain.record_repayment(str(loan_id), int(amount))
        if tx_hash:
            await supabase_service.update_repayment(
                repayment["id"], {"blockchain_tx_hash": tx_hash}
            )
        
        # 3. Update trust score
        await supabase_service.update_trust_score(
            loan["borrower_id"],
            5,  # +5 for on-time repayment
            "On-time repayment",
            tx_hash,
        )
        
        # 4. Check if loan is fully repaid
        repayments = await supabase_service.get_loan_repayments(loan_id)
        total_repaid = sum(float(r["amount"]) for r in repayments)
        
        if total_repaid >= float(loan["amount"]) * 1.1:  # Principal + 10% interest
            await supabase_service.update_loan(loan_id, {"status": "completed"})
            if blockchain and blockchain.is_configured:
                await blockchain.mark_loan_completed(str(loan_id))
            
            # Release vouches
            # TODO: Implement vouch release logic
        
        return {
            "repayment": repayment,
            "total_repaid": total_repaid,
            "loan_status": loan["status"],
        }


# Singleton instances
vouching_service = VouchingDomainService()
loan_service = LoanDomainService()
payment_service = PaymentDomainService()
