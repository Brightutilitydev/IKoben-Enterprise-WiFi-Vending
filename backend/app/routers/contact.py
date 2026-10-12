from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.models.contact import ContactSetting
from app.models.admin import Admin
from app.routers.admin import get_current_admin

router = APIRouter(prefix="/contact", tags=["Contact"])

class ContactSettingUpdate(BaseModel):
    phone_primary: Optional[str] = None
    phone_secondary: Optional[str] = None
    whatsapp_number: Optional[str] = None
    support_email: Optional[str] = None
    physical_location: Optional[str] = None
    payment_instructions: Optional[str] = None

@router.get("/")
async def get_contact_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ContactSetting).order_by(ContactSetting.id.asc()))
    contact = result.scalars().first()
    
    if not contact:
        # Create default fallback record
        contact = ContactSetting(
            phone_primary="+234 800 000 0000",
            phone_secondary="",
            whatsapp_number="2348000000000",
            support_email="",
            physical_location="Front Reception Desk",
            payment_instructions="Pay cash at the reception desk or contact the admin for account details."
        )
        db.add(contact)
        await db.commit()
        await db.refresh(contact)
        
    return {
        "phone_primary": contact.phone_primary or "",
        "phone_secondary": contact.phone_secondary or "",
        "whatsapp_number": contact.whatsapp_number or "",
        "support_email": contact.support_email or "",
        "physical_location": contact.physical_location or "",
        "payment_instructions": contact.payment_instructions or "",
        "updated_at": contact.updated_at
    }

@router.put("/")
async def update_contact_settings(
    req: ContactSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    result = await db.execute(select(ContactSetting).order_by(ContactSetting.id.asc()))
    contact = result.scalars().first()
    
    if not contact:
        contact = ContactSetting()
        db.add(contact)
        
    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(contact, field, val)
        
    await db.commit()
    await db.refresh(contact)
    return {
        "status": "success",
        "contact": {
            "phone_primary": contact.phone_primary or "",
            "phone_secondary": contact.phone_secondary or "",
            "whatsapp_number": contact.whatsapp_number or "",
            "support_email": contact.support_email or "",
            "physical_location": contact.physical_location or "",
            "payment_instructions": contact.payment_instructions or "",
            "updated_at": contact.updated_at
        }
    }
