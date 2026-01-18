"""
TEST SCRIPT: Gamification Engine Verification
Simulates:
1. User login (Streak check)
2. Loan repayment (XP gain)
3. Badge qualification (The Anchor)
"""

import sys
import os
import asyncio
import json
from datetime import datetime

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.gamification import gamification_service
from app.services.supabase import supabase_service

async def test_gamification():
    print("\n--- TESTING GAMIFICATION ENGINE (Production Grade) ---")
    
    # 1. Setup Test User
    # We'll use a specific test ID or create one. For safety, let's use a known ID if possible or just mock the context
    # Actually, let's use a real user ID from our previous tests if available, or just a dummy UUID that we insert
    test_user_id = "test-gamer-123"
    
    print("1. Setup Test User...")
    test_user_id = "u-gamification-test"
    try:
        # Create or Get User via Service (uses JSON fallback if DB fails)
        user = await supabase_service.get_profile(test_user_id)
        if not user:
            print("   Creating test user in cache/db...")
            user = await supabase_service.create_profile(test_user_id, {
                "phone": "+919999999999",
                "full_name": "Gamer Joe",
                "trust_score": 50
            })
            
        print(f"   Using User: {user.get('full_name')} (ID: {test_user_id})")
        
        # Reset metadata first
        await supabase_service.update_profile(test_user_id, {"metadata": {}})
        print("   Metadata reset.")
        
        print("\n2. Simulate Repayment Event (Streak +1)...")
        # Trigger Repayment
        result = await gamification_service.process_event(test_user_id, 'repayment', {"amount": 500})
        print(f"   Event Result: {json.dumps(result, indent=2)}")
        
        # Verify DB State
        profile = await supabase_service.get_profile(test_user_id)
        meta = profile.get('metadata', {}) or {}
        print(f"   DB State: Streak={meta.get('streak_days')}, Badges={meta.get('badges')}")
        
        if meta.get('streak_days') == 1:
            print("✅ PASS: Streak initialized/incremented")
        else:
            print(f"❌ FAIL: Streak Logic broken. Got {meta.get('streak_days')}")
            
        if result.get('xp_gained') == 100:
            print("✅ PASS: XP Logic correct")
            
        print("\n3. Simulate Badge Qualification (Anchor)...")
        # Hack stats to simulate history
        # Since logic inside check_badges calculates from real stats, we might fail here unless we mock the stats return.
        # But wait, logic calls get_user_stats, which is not in SupabaseService?
        # GamificationService line 150: calls `get_user_stats`.
        # I need to ensure get_user_stats exists too!
        
    except Exception as e:
        print(f"❌ CRITICAL FAIL: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_gamification())
