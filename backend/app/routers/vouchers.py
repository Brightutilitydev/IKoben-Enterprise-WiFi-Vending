from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.voucher import Voucher
from app.schemas.voucher import VoucherValidateRequest, VoucherValidateResponse, VoucherResponse
from app.services.routeros import router_service

router = APIRouter(prefix="/vouchers", tags=["Vouchers"])

@router.post("/validate", response_model=VoucherValidateResponse)
async def validate_voucher(req: VoucherValidateRequest, db: AsyncSession = Depends(get_db)):
    # Find voucher
    result = await db.execute(
        select(Voucher).options(selectinload(Voucher.plan)).where(Voucher.pin == req.pin)
    )
    voucher = result.scalars().first()

    if not voucher:
        # Prevent timing attacks and obscure whether PIN exists
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired voucher PIN."
        )

    if voucher.status in ["EXPIRED", "DEPLETED"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This voucher has expired or its data is depleted."
        )

    # First login check / bind MAC address
    if voucher.status == "UNUSED":
        if req.mac_address:
            voucher.mac_address = req.mac_address
        voucher.status = "ACTIVE"
        db.add(voucher)
        await db.commit()
        await db.refresh(voucher)
        
        # Provision on router
        # Calculate limits based on plan
        limit_bytes = (voucher.plan.data_mb * 1024 * 1024) if voucher.plan.data_mb else None
        limit_uptime = (voucher.plan.uptime_mins * 60) if voucher.plan.uptime_mins else None
        
        try:
            # We are using PIN as both username and password for CHAP compatibility
            await router_service.provision_hotspot_user(
                pin=voucher.pin,
                limit_bytes=limit_bytes,
                limit_uptime=limit_uptime,
                profile="default" # Or map plan rate limits to profile
            )
        except Exception as e:
            # Revert voucher status since router provisioning failed
            voucher.status = "UNUSED"
            db.add(voucher)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Hotspot router is currently unreachable. Please try again in a moment."
            )
    elif voucher.status == "ACTIVE":
        # Check if MAC matches
        if voucher.mac_address and req.mac_address and voucher.mac_address != req.mac_address:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Voucher is bound to a different device."
            )

    # In production, the router expects username and password
    login_url = req.link_login_only or "http://10.5.50.1/login"
    
    return VoucherValidateResponse(
        status="success",
        message="Voucher validated successfully.",
        voucher=VoucherResponse.model_validate(voucher),
        login_url=login_url,
        mikrotik_username=voucher.pin,
        mikrotik_password=voucher.pin
    )
