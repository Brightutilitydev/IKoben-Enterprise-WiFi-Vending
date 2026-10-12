from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.schemas.plan import PlanResponse

class VoucherBase(BaseModel):
    pin: str
    status: str
    plan_id: int

class VoucherValidateRequest(BaseModel):
    pin: str
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    link_login_only: Optional[str] = None

class VoucherValidateResponse(BaseModel):
    status: str
    message: str
    voucher: Optional['VoucherResponse'] = None
    # the frontend needs to know where to post if success
    login_url: Optional[str] = None 
    mikrotik_username: Optional[str] = None
    mikrotik_password: Optional[str] = None

class VoucherResponse(VoucherBase):
    id: int
    mac_address: Optional[str]
    activation_time: Optional[datetime]
    expiry_time: Optional[datetime]
    bytes_used: int
    uptime_used: int
    
    plan: Optional[PlanResponse] = None

    model_config = ConfigDict(from_attributes=True)
