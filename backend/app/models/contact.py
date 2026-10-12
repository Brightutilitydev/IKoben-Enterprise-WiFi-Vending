from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.sql import func
from app.db.base import Base

class ContactSetting(Base):
    __tablename__ = "contact_settings"

    id = Column(Integer, primary_key=True, index=True)
    phone_primary = Column(String, nullable=True) # e.g. "+234 801 234 5678"
    phone_secondary = Column(String, nullable=True) # e.g. "+234 809 876 5432"
    whatsapp_number = Column(String, nullable=True) # e.g. "2348012345678"
    support_email = Column(String, nullable=True)
    physical_location = Column(String, nullable=True) # e.g. "Front Desk, Main Reception"
    payment_instructions = Column(Text, nullable=True) # e.g. "Transfer to OPay / Kuda 1234567890 or pay cash at desk"
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
