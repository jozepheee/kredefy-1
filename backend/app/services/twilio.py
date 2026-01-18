"""
Twilio Service - WhatsApp and Voice
"""

from twilio.rest import Client
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class TwilioService:
    """Twilio client for WhatsApp and Voice"""
    
    def __init__(self):
        self.client = Client(
            settings.twilio_account_sid,
            settings.twilio_auth_token,
        )
        self.whatsapp_number = settings.twilio_whatsapp_number
    
    async def send_whatsapp(self, to: str, message: str) -> str:
        """Send WhatsApp message"""
        try:
            # Handle 'from' number - may or may not have whatsapp: prefix
            from_number = self.whatsapp_number
            if not from_number.startswith("whatsapp:"):
                from_number = f"whatsapp:{from_number}"
            
            # Handle 'to' number - may or may not have whatsapp: prefix
            to_number = to
            if not to_number.startswith("whatsapp:"):
                to_number = f"whatsapp:{to_number}"
            
            msg = self.client.messages.create(
                body=message,
                from_=from_number,
                to=to_number,
            )
            logger.info(f"WhatsApp sent to {to}: {msg.sid}")
            return msg.sid
        except Exception as e:
            logger.error(f"WhatsApp send failed: {e}")
            raise
    
    async def send_otp(self, phone: str, otp: str, language: str = "en") -> str:
        """Send OTP via WhatsApp"""
        messages = {
            "en": f"Your Kredefy OTP is: {otp}. Valid for 10 minutes.",
            "hi": f"आपका Kredefy OTP है: {otp}। 10 मिनट के लिए वैध।",
            "ml": f"നിങ്ങളുടെ Kredefy OTP: {otp}. 10 മിനിറ്റ് വരെ സാധുത.",
        }
        return await self.send_whatsapp(phone, messages.get(language, messages["en"]))
    
    async def send_payment_reminder(
        self,
        phone: str,
        amount: float,
        due_date: str,
        payment_link: str,
        language: str = "en",
    ) -> str:
        """Send EMI payment reminder"""
        messages = {
            "en": f"Reminder: ₹{amount} EMI due on {due_date}. Pay here: {payment_link}",
            "hi": f"रिमाइंडर: ₹{amount} EMI {due_date} को देय है। यहाँ भुगतान करें: {payment_link}",
            "ml": f"ഓർമ്മപ്പെടുത്തൽ: ₹{amount} EMI {due_date}-ന് അടയ്ക്കണം. ഇവിടെ അടയ്ക്കുക: {payment_link}",
        }
        return await self.send_whatsapp(phone, messages.get(language, messages["en"]))
    
    async def send_loan_approved(
        self,
        phone: str,
        amount: float,
        language: str = "en",
    ) -> str:
        """Notify user loan is approved"""
        messages = {
            "en": f"Great news! Your loan of ₹{amount} has been approved. Money will arrive shortly.",
            "hi": f"खुशखबरी! आपका ₹{amount} का ऋण स्वीकृत हो गया है। पैसे जल्द आ जाएंगे।",
            "ml": f"സന്തോഷവാർത്ത! നിങ്ങളുടെ ₹{amount} വായ്പ അംഗീകരിച്ചു. പണം ഉടൻ എത്തും.",
        }
        return await self.send_whatsapp(phone, messages.get(language, messages["en"]))


twilio_service = TwilioService()
