from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaymentInitiateRequest(BaseModel):
    plan_id: int

class PaymentInitiateResponse(BaseModel):
    reference: str
    amount: float
    # Virtual account details for display
    account_number: Optional[str] = "1234567890" # Mock data
    bank_name: Optional[str] = "Kuda Bank"
    account_name: Optional[str] = "IKoben Wi-Fi Vending"

class PaymentStatusResponse(BaseModel):
    status: str # PENDING, SUCCESS, FAILED
    voucher_pin: Optional[str] = None
