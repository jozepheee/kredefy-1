"""
Quick test for Groq API connection
"""
import os
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_groq():
    from groq import Groq
    
    api_key = os.getenv("GROQ_API_KEY")
    print(f"GROQ_API_KEY present: {bool(api_key)}")
    print(f"GROQ_API_KEY starts with: {api_key[:10] if api_key else 'N/A'}...")
    
    if not api_key:
        print("❌ No GROQ_API_KEY found in .env file!")
        return
    
    try:
        client = Groq(api_key=api_key)
        
        print("\n🔄 Testing Groq API connection...")
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": "Say 'Hello from Groq!' in exactly 5 words."}
            ],
            max_tokens=50
        )
        
        reply = response.choices[0].message.content
        print(f"\n✅ Groq API is working!")
        print(f"📝 Response: {reply}")
        
    except Exception as e:
        print(f"\n❌ Groq API Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_groq())
