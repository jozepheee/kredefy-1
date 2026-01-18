"""
Quadratic Voting for Loan Approvals
Fair democratic voting where small voices matter
"""

import math
from typing import List, Dict, Any
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class QuadraticVotingService:
    """
    Implements Quadratic Voting for loan approvals
    
    Formula: Total Vote Power = sum(sqrt(tokens_spent))
    
    This ensures:
    - Small stakeholders have voice
    - Prevents plutocracy (rich dominating)
    - Encourages broad participation
    """
    
    def __init__(self, quorum_percentage: float = 50.0):
        self.quorum_percentage = quorum_percentage
    
    def calculate_vote_power(self, tokens_spent: int) -> float:
        """
        Calculate vote power using quadratic formula
        More tokens = more power, but with diminishing returns
        """
        if tokens_spent <= 0:
            return 0.0
        return math.sqrt(tokens_spent)
    
    def tally_votes(self, votes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Tally votes for a loan request
        
        votes: [
            {"voter_id": "...", "tokens_spent": 10, "vote": "for"},
            {"voter_id": "...", "tokens_spent": 5, "vote": "against"},
        ]
        """
        for_power = 0.0
        against_power = 0.0
        total_voters = len(votes)
        
        for vote in votes:
            power = self.calculate_vote_power(vote["tokens_spent"])
            if vote["vote"] == "for":
                for_power += power
            elif vote["vote"] == "against":
                against_power += power
        
        total_power = for_power + against_power
        approval_percentage = (for_power / total_power * 100) if total_power > 0 else 0
        
        # Check quorum
        quorum_met = total_voters >= 3  # At least 3 voters required
        
        result = {
            "for_power": round(for_power, 2),
            "against_power": round(against_power, 2),
            "total_power": round(total_power, 2),
            "approval_percentage": round(approval_percentage, 2),
            "total_voters": total_voters,
            "quorum_met": quorum_met,
            "approved": quorum_met and approval_percentage >= self.quorum_percentage,
        }
        
        logger.info(f"Quadratic vote tally: {result}")
        return result
    
    def simulate_vote_impact(
        self, 
        current_votes: List[Dict[str, Any]], 
        new_tokens: int,
        vote_direction: str
    ) -> Dict[str, Any]:
        """
        Simulate how a new vote would affect the outcome
        Useful for showing users their potential impact
        """
        # Current state
        current_result = self.tally_votes(current_votes)
        
        # Add hypothetical vote
        simulated_votes = current_votes + [{
            "voter_id": "simulated",
            "tokens_spent": new_tokens,
            "vote": vote_direction
        }]
        new_result = self.tally_votes(simulated_votes)
        
        return {
            "current_approval": current_result["approval_percentage"],
            "new_approval": new_result["approval_percentage"],
            "your_vote_power": self.calculate_vote_power(new_tokens),
            "impact": new_result["approval_percentage"] - current_result["approval_percentage"],
            "would_approve": new_result["approved"],
        }


# Singleton
quadratic_voting_service = QuadraticVotingService()
