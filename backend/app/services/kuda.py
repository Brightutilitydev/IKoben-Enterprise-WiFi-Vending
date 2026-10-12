import logging
import uuid
import hashlib
import hmac

from app.core.config import settings

logger = logging.getLogger(__name__)

class KudaService:
    def __init__(self):
        self.api_key = settings.KUDA_API_KEY
        self.secret = settings.KUDA_SECRET

    async def create_virtual_account(self, reference: str, amount: float):
        """
        Mock implementation for creating a dynamic virtual account.
        In production, this makes a request to Kuda API.
        """
        logger.info(f"Kuda: Requesting virtual account for ref {reference}, amount {amount}")
        # Return mock virtual account details
        return {
            "account_number": "1234567890",
            "bank_name": "Kuda Bank",
            "account_name": "IKoben Wi-Fi Vending",
            "expires_in": 1800 # 30 mins
        }

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify the Kuda webhook signature.
        Kuda typically uses HMAC SHA256 of the payload using the webhook secret.
        """
        if not self.secret:
            logger.warning("Kuda secret is not configured, skipping signature verification!")
            return True # In development only

        expected_signature = hmac.new(
            self.secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Compare securely
        return hmac.compare_digest(expected_signature, signature)

kuda_service = KudaService()
