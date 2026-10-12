from sqlalchemy import Column, String, Integer, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    kuda_reference = Column(String, unique=True, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="PENDING") # PENDING, SUCCESS, FAILED
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    voucher_id = Column(Integer, ForeignKey("vouchers.id"), nullable=True) # Null until paid
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    paid_at = Column(DateTime(timezone=True), nullable=True)

    plan = relationship("Plan")
    voucher = relationship("Voucher")
