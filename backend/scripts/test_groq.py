import os
import sys
from groq import Groq
from dotenv import load_dotenv

# Add the current directory to path so we can import app
sys.path.append(os.getcwd())

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

print("="*50)
print("🚀 KREDEFY GROQ DIAGNOSTIC")
print("="*50)

if not api_key:
    print("❌ ERROR: GROQ_API_KEY not found in .env")
    sys.exit(1)

print(f"🔑 API Key Found: {api_key[:10]}...{api_key[-5:]}")

try:
    print("\n📡 Connecting to Groq...")
    client = Groq(api_key=api_key)
    
    # Try a very small request first
    print("💬 Sending test message...")
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are Nova, the Kredefy assistant. Be ultra-concise.",
            },
            {
                "role": "user",
                "content": "Verify connection. Reply with 'Nova Online'.",
            }
        ],
        model="llama-3.3-70b-versatile", # Using latest stable model
        max_tokens=10,
    )
    
    response = chat_completion.choices[0].message.content
    print(f"✅ SUCCESS: Groq returned: '{response}'")
    print("\n🎉 Your Groq API key is working perfectly!")
    
except Exception as e:
    print(f"\n❌ ERROR: Groq API failed!")
    print(f"📝 Details: {str(e)}")
    
    if "api_key" in str(e).lower():
        print("\n💡 TIP: Your API key seems invalid. Please check if you copied it correctly from console.groq.com.")
    elif "model_not_found" in str(e).lower():
        print("\n💡 TIP: The model name might be wrong. Try 'llama3-8b-8192' or 'llama-3.1-70b-versatile'.")
    elif "rate_limit" in str(e).lower():
        print("\n💡 TIP: You hit a rate limit. Wait a minute and try again.")
    else:
        print("\n💡 TIP: Check your internet connection or firewall settings.")

print("="*50)
