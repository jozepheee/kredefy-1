import asyncio
import sys
import os

# Add the backend directory to sys.path so we can import 'app'
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..'))
sys.path.append(backend_dir)

from app.ai.orchestrator import orchestrator
from app.config import get_settings

settings = get_settings()

async def test_nova():
    print(f"--- STARTING DIAGNOSTIC ---")
    print(f"Checking Settings: API Key present? {'YES' if settings.groq_api_key else 'NO'}")
    
    user_id = "test-user-id"
    message = "Hello, can you help me?"
    
    print(f"\n--- TESTING ORCHESTRATOR ---")
    try:
        # Mocking the build_context part might be needed if database is not reachable
        # But let's try to run it 'raw' first to see if it hits the NameError in imports/init
        
        # We need to minimally mock the database calls if we don't want to depend on DB
        # But the User's error is 'NameError: name 'settings' is not defined' which is a code error
        # likely happening before DB calls or during logic execution.
        
        result = await orchestrator.process_message(
            user_id=user_id,
            message=message,
            language="en"
        )
        print(f"\n[SUCCESS] Response received:")
        print(f"Message: {result['response']}")
        print(f"Traces: {len(result['reasoning_traces'])}")
    except Exception as e:
        print(f"\n[FAILURE] CRITICAL ERROR CAUGHT:")
        print(f"Type: {type(e).__name__}")
        print(f"Message: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_nova())
