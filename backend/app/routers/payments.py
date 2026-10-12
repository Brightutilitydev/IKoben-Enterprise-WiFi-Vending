import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.db.session import get_db
from app.models.plan import Plan
from app.models.transaction import Transaction
from app.models.voucher import Voucher
from app.schemas.payment import PaymentInitiateRequest, PaymentInitiateResponse, PaymentStatusResponse
from app.services.kuda import kuda_service

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/initiate", response_model=PaymentInitiateResponse)
async def initiate_payment(req: PaymentInitiateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).where(Plan.id == req.plan_id))
    plan = result.scalars().first()
    
    if not plan or not plan.is_active:
        raise HTTPException(status_code=404, detail="Plan not found or inactive")

    reference = f"KOBEN-{uuid.uuid4().hex[:10].upper()}"
    
    # In production, call Kuda
    account_details = await kuda_service.create_virtual_account(reference, plan.price)

    # Save pending transaction
    tx = Transaction(
        kuda_reference=reference,
        amount=plan.price,
        plan_id=plan.id,
        status="PENDING"
    )
    db.add(tx)
    await db.commit()
    
    return PaymentInitiateResponse(
        reference=reference,
        amount=plan.price,
        **account_details
    )

@router.get("/{reference}/status", response_model=PaymentStatusResponse)
async def get_payment_status(reference: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Transaction).options(selectinload(Transaction.voucher)).where(Transaction.kuda_reference == reference))
    tx = result.scalars().first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    pin = tx.voucher.pin if tx.voucher else None
    
    return PaymentStatusResponse(
        status=tx.status,
        voucher_pin=pin
    )

@router.post("/webhook")
async def kuda_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    # Kuda normally sends signature in a header
    signature = request.headers.get("x-kuda-signature") or request.headers.get("webhook-signature")
    
    if signature and not kuda_service.verify_webhook_signature(payload, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = await request.json()
    
    # Mock extracting details from Kuda Webhook payload
    reference = data.get("reference")
    status = data.get("status") # e.g. "success"
    
    # For testing, we allow an undocumented test endpoint to trigger this manually if no signature
    if not reference:
        return {"status": "ignored"}

    if status == "success":
        # Find transaction
        result = await db.execute(select(Transaction).where(Transaction.kuda_reference == reference))
        tx = result.scalars().first()
        
        if not tx:
            return {"status": "transaction not found"}

        if tx.status == "SUCCESS":
            return {"status": "already processed"}

        from app.services.voucher_service import generate_unique_pin
        # Issue Voucher
        pin = await generate_unique_pin(db, 12)
        new_voucher = Voucher(
            pin=pin,
            plan_id=tx.plan_id,
            status="UNUSED"
        )
        db.add(new_voucher)
        await db.flush() # Get voucher ID
        
        tx.status = "SUCCESS"
        tx.paid_at = datetime.utcnow()
        tx.voucher_id = new_voucher.id
        
        await db.commit()
        return {"status": "voucher issued"}

    return {"status": "ignored"}
