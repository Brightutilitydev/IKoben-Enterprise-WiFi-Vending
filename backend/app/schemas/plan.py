from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class PlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    data_mb: Optional[int] = None
    uptime_mins: Optional[int] = None
    validity_days: Optional[int] = None
    rate_limit: str
    is_active: bool = True

class PlanCreate(PlanBase):
    pass

class PlanResponse(PlanBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
