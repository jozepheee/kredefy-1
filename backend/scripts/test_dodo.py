import os
import sys
import asyncio
from decimal import Decimal
from dotenv import load_dotenv

# Add the current directory to path
sys.path.append(os.getcwd())

load_dotenv()

from app.services.dodo import dodo_service

print("="*50)
print("🚀 KREDEFY DODO PAYMENTS DIAGNOSTIC")
print("="*50)

async def test_dodo():
    try:
        print("\n📡 Testing Checkout Session Creation...")
        result = await dodo_service.create_checkout_session(
            amount=Decimal("100.00"),
            description="Diagnostic Test Payment",
            customer_phone="+919999999999",
            metadata={"test": "true"}
        )
        
        print(f"✅ SUCCESS: Checkout ID: {result['checkout_id']}")
        print(f"🔗 URL: {result['checkout_url']}")
        
    except Exception as e:
        print(f"\n❌ ERROR: Dodo API failed!")
        print(f"📝 Details: {str(e)}")
        print("\n💡 TIP: Check your DODO_API_KEY and DODO_BASE_URL in .env")

if __name__ == "__main__":
    asyncio.run(test_dodo())
print("="*50)
