import asyncio
import sys
import os
import json

# Add backend to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..'))
sys.path.append(backend_dir)

from app.ai.orchestrator import orchestrator
from app.config import get_settings

# Mock settings just in case
settings = get_settings()

async def test_hyper_agent():
    print("--- TESTING HYPER-AGENT (The Doer) ---")
    
    # 1. Simulate "I need a loan"
    user_id = "test-user-id"
    message = "I need a loan urgently"
    
    print(f"\nUser says: '{message}'")
    
    try:
        # We process the message through the orchestrator
        # The intent detection in Nova might default to 'general' without Groq
        # So we might need to FORCE the intent if we can't rely on Groq in this script environment
        # But let's see if the ActionAgent gets triggered.
        # Actually, NovaAgent._detect_intent uses Groq. If Groq is working (which we fixed), it should detect 'loan_request'.
        
        result = await orchestrator.process_message(
            user_id=user_id,
            message=message
        )
        
        print(f"\n[RESULT RAW]: {json.dumps(result, default=str)}")
        
        print(f"Message: {result.get('response')}")
        
        # Print traces
        print("\n[TRACES]:")
        for trace in result.get('reasoning_traces', []):
             print(f"- {trace}")

        
        if result.get('action'):
            print(f"Action: {result.get('action')}")
            print(f"Target: {result.get('target')}")
            print(f"Guide Steps: {len(result.get('guide_steps', []))}")
            for i, step in enumerate(result.get('guide_steps', [])):
                print(f"  Step {i+1}: {step['text']} -> {step.get('target')}")
                
            print("\n✅ HYPER-AGENT SUCCESS: Action triggered!")
        else:
            print("\n❌ HYPER-AGENT FAIL: No action returned. Intent might not have been detected.")
            print(f"Intent detected: {result.get('intent')}")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_hyper_agent())
