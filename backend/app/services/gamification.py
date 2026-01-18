"""
Gamification Service - The "Sticky" Engine
Manages Circle Wars, Bharosa Streaks, and Badges.
"""

import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.services.supabase import supabase_service
import asyncio

logger = logging.getLogger(__name__)

class GamificationService:
    """
    Handles all game mechanics for Kredefy.
    Goal: Making financial discipline addictive.
    """
    
    BADGES_CONFIG = {
        "the_anchor": {
            "name": "The Anchor",
            "description": "Vouched for 5 people who successfully repaid.",
            "icon": "⚓",
            "xp": 500
        },
        "comeback_kid": {
            "name": "Comeback Kid",
            "description": "Recovered from low trust to >80 score.",
            "icon": "phoenix",
            "xp": 1000
        },
        "early_believer": {
            "name": "Early Believer",
            "description": "Joined in the first 1000 users.",
            "icon": "🚀",
            "xp": 100
        }
    }
    
    async def process_event(self, user_id: str, event_type: str, data: Dict = None):
        """Main entry point for gamification events"""
        logger.info(f"Processing gamification event: {event_type} for {user_id}")
        
        try:
            # 1. Update Streaks (Daily Login / Activity)
            if event_type in ['login', 'repayment', 'vouch']:
                await self._update_streak(user_id)
            
            # 2. Check for Badges
            new_badges = await self._check_badges(user_id, event_type)
            
            # 3. Update XP/Score
            xp_gain = self._calculate_xp(event_type, data)
            if xp_gain > 0:
                await self._award_xp(user_id, xp_gain)
                
            return {
                "streak_updated": True,
                "new_badges": new_badges,
                "xp_gained": xp_gain
            }
            
        except Exception as e:
            logger.error(f"Gamification failed: {e}")
            return {"error": str(e)}

    async def calculate_circle_leaderboard(self) -> List[Dict]:
        """
        Circle Wars Logic: Rank circles by 'Trust Velocity'
        Score = (Repayment Rate * 100) + (Vouch Activity * 10) - (Defaults * 500)
        """
        circles = await supabase_service.get_all_circles() # Need to implement this in supabase_service if missing
        
        leaderboard = []
        for circle in circles:
            score = 0
            # Fetch stats (mocked aggregation for now, simpler query in prod)
            members = await supabase_service.get_circle_members(circle['id'])
            
            # Simulated stats for demo depth
            repayment_rate = 0.95 # fetch real data
            active_vouches = len(members) * 2
            defaults = 0 
            
            score = (repayment_rate * 100) + (active_vouches * 10) - (defaults * 500)
            
            leaderboard.append({
                "circle_id": circle['id'],
                "name": circle['name'],
                "score": int(score),
                "rank": 0 # filled later
            })
            
        # Sort
        leaderboard.sort(key=lambda x: x['score'], reverse=True)
        
        # Assign ranks
        for i, item in enumerate(leaderboard):
            item['rank'] = i + 1
            
        return leaderboard

    async def _update_streak(self, user_id: str):
        """Maintain 'Bharosa Streak' logic"""
        profile = await supabase_service.get_profile(user_id)
        metadata = profile.get('metadata') or {}
        
        last_active = metadata.get('last_active_date')
        current_streak = metadata.get('streak_days', 0)
        
        today = datetime.utcnow().date()
        
        if not last_active:
            # First time
            new_streak = 1
        else:
            last_date = datetime.fromisoformat(last_active).date()
            if last_date == today:
                return # Already counted today
            elif last_date == today - timedelta(days=1):
                new_streak = current_streak + 1
            else:
                new_streak = 1 # Streak broken!
                
        # Update DB
        metadata['last_active_date'] = today.isoformat()
        metadata['streak_days'] = new_streak
        
        await supabase_service.update_profile(user_id, {"metadata": metadata})

    async def _check_badges(self, user_id: str, event_type: str) -> List[str]:
        """Check if user earned new badges"""
        awarded = []
        profile = await supabase_service.get_profile(user_id)
        current_badges = (profile.get('metadata') or {}).get('badges', [])
        
        # Example Check: The Anchor
        if "the_anchor" not in current_badges:
            # Check logic: count successful vouches
            stats = await supabase_service.get_user_stats(user_id)
            if stats.get('successful_vouches', 0) >= 5:
                awarded.append("the_anchor")
        
        if awarded:
            # Grant badges
            metadata = profile.get('metadata') or {}
            metadata['badges'] = current_badges + awarded
            await supabase_service.update_profile(user_id, {"metadata": metadata})
            
        return awarded

    def _calculate_xp(self, event_type: str, data: Dict) -> int:
        if event_type == 'repayment': return 100
        if event_type == 'vouch': return 50
        if event_type == 'login': return 10
        return 0

    async def _award_xp(self, user_id: str, amount: int):
        # In real app, increment XP column
        # For now, just logging or storing in metadata
        pass

gamification_service = GamificationService()
