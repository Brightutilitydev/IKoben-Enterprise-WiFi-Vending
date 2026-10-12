from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional

from app.db.session import get_db
from app.models.admin import Admin
from app.models.voucher import Voucher
from app.models.transaction import Transaction
from app.schemas.admin import Token, DashboardStats
from app.core.security import verify_password, create_access_token
import jwt
from jwt.exceptions import PyJWTError as JWTError
from app.core.security import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/admin", tags=["Admin"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")

async def get_current_admin(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    result = await db.execute(select(Admin).where(Admin.username == username))
    admin = result.scalars().first()
    if admin is None:
        raise credentials_exception
    return admin

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Admin).where(Admin.username == form_data.username))
    admin = result.scalars().first()
    
    if not admin or not verify_password(form_data.password, admin.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    access_token = create_access_token(subject=admin.username)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(current_admin: Admin = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    # Total vouchers
    v_res = await db.execute(select(func.count(Voucher.id)))
    total_vouchers = v_res.scalar() or 0
    
    # Active sessions (vouchers currently active)
    a_res = await db.execute(select(func.count(Voucher.id)).where(Voucher.status == "ACTIVE"))
    active_sessions = a_res.scalar() or 0
    
    # Total revenue (from SUCCESS transactions)
    r_res = await db.execute(select(func.sum(Transaction.amount)).where(Transaction.status == "SUCCESS"))
    total_revenue = r_res.scalar() or 0.0
    
    # Recent transactions
    tx_res = await db.execute(select(Transaction).order_by(Transaction.id.desc()).limit(5))
    recent_transactions = tx_res.scalars().all()
    
    return {
        "total_vouchers": total_vouchers,
        "active_sessions": active_sessions,
        "total_revenue": total_revenue,
        "recent_transactions": [
            {"reference": t.kuda_reference, "amount": t.amount, "status": t.status} for t in recent_transactions
        ]
    }

@router.get("/network/status")
async def get_network_status(current_admin: Admin = Depends(get_current_admin)):
    from app.services.routeros import router_service
    ether1_up = await router_service.get_interface_status("ether1")
    sessions = await router_service.get_active_sessions()
    
    # Check API health (if we could get sessions, API is up, else down)
    api_health = "Online" if type(sessions) is list else "Offline"
    
    formatted_sessions = []
    if isinstance(sessions, list):
        for s in sessions:
            formatted_sessions.append({
                "id": s.get(".id"),
                "user": s.get("user"),
                "mac_address": s.get("mac-address"),
                "address": s.get("address"),
                "uptime": s.get("uptime"),
                "bytes_in": s.get("bytes-in"),
                "bytes_out": s.get("bytes-out")
            })
            
    return {
        "api_status": api_health,
        "wan_status": "Up" if ether1_up else "Down",
        "active_sessions": formatted_sessions
    }

@router.delete("/network/sessions/{session_id}")
async def kill_session(session_id: str, current_admin: Admin = Depends(get_current_admin)):
    from app.services.routeros import router_service
    # Revert asterisk in URL encoding if necessary
    actual_id = f"*{session_id}" if not session_id.startswith("*") else session_id
    await router_service.remove_active_session_by_id(actual_id)
    return {"status": "session removed"}

@router.get("/vouchers")
async def list_vouchers(status: str = None, db: AsyncSession = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    from app.models.voucher import Voucher
    query = select(Voucher)
    if status:
        query = query.where(Voucher.status == status)
    result = await db.execute(query.order_by(Voucher.id.desc()))
    vouchers = result.scalars().all()
    return vouchers

from pydantic import BaseModel
class BatchVoucherReq(BaseModel):
    plan_id: int
    count: int

@router.post("/vouchers/batch")
async def batch_generate_vouchers(req: BatchVoucherReq, db: AsyncSession = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    from app.services.voucher_service import generate_unique_pin
    from app.models.voucher import Voucher
    from app.models.plan import Plan
    
    plan_res = await db.execute(select(Plan).where(Plan.id == req.plan_id))
    plan = plan_res.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    generated = []
    for _ in range(req.count):
        pin = await generate_unique_pin(db, 12)
        v = Voucher(pin=pin, plan_id=plan.id, status="UNUSED")
        db.add(v)
        generated.append(pin)
        
    await db.commit()
    return {"status": "success", "count": req.count, "pins": generated}

@router.post("/vouchers/{voucher_id}/revoke")
async def revoke_voucher(voucher_id: int, db: AsyncSession = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    from app.models.voucher import Voucher
    from app.services.routeros import router_service
    result = await db.execute(select(Voucher).where(Voucher.id == voucher_id))
    v = result.scalars().first()
    if not v:
        raise HTTPException(status_code=404, detail="Voucher not found")
        
    v.status = "DEPLETED"
    db.add(v)
    await db.commit()
    
    # Remove from router completely
    await router_service.remove_user_completely(v.pin)
    return {"status": "revoked"}

@router.get("/transactions")
async def list_transactions(db: AsyncSession = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    from app.models.transaction import Transaction
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(Transaction).options(selectinload(Transaction.voucher)).order_by(Transaction.id.desc()))
    txs = result.scalars().all()
    
    data = []
    for tx in txs:
        data.append({
            "id": tx.id,
            "reference": tx.kuda_reference,
            "amount": tx.amount,
            "status": tx.status,
            "created_at": tx.created_at,
            "voucher_pin": tx.voucher.pin if tx.voucher else None
        })
    return data

class PlanCreate(BaseModel):
    name: str
    description: str
    price: float
    data_mb: Optional[int] = None
    uptime_mins: Optional[int] = None
    validity_days: Optional[int] = None
    rate_limit: str = "2M/2M"

@router.get("/plans")
async def list_all_plans(db: AsyncSession = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    from app.models.plan import Plan
    result = await db.execute(select(Plan).order_by(Plan.id.asc()))
    return result.scalars().all()

@router.post("/plans")
async def create_plan(req: PlanCreate, db: AsyncSession = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    from app.models.plan import Plan
    if not req.data_mb and not req.uptime_mins and not req.validity_days:
        raise HTTPException(
            status_code=400,
            detail="At least one limit must be specified: data_mb, uptime_mins, or validity_days."
        )
    p = Plan(**req.model_dump(), is_active=True)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return {"status": "success", "id": p.id}

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    data_mb: Optional[int] = None
    uptime_mins: Optional[int] = None
    validity_days: Optional[int] = None
    rate_limit: Optional[str] = None
    is_active: Optional[bool] = None

@router.put("/plans/{plan_id}")
async def update_plan(plan_id: int, req: PlanUpdate, db: AsyncSession = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    from app.models.plan import Plan
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "Plan not found")
    
    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(p, field, val)
    
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return {"status": "success", "id": p.id}

@router.put("/plans/{plan_id}/toggle")
async def toggle_plan(plan_id: int, db: AsyncSession = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    from app.models.plan import Plan
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "Plan not found")
    p.is_active = not p.is_active
    db.add(p)
    await db.commit()
    return {"status": "success", "is_active": p.is_active}

@router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: int, db: AsyncSession = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    from app.models.plan import Plan
    from app.models.voucher import Voucher
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "Plan not found")
    
    # Clean up associated vouchers
    v_res = await db.execute(select(Voucher).where(Voucher.plan_id == plan_id))
    for v in v_res.scalars().all():
        await db.delete(v)
        
    await db.delete(p)
    await db.commit()
    return {"status": "success", "message": "Plan deleted successfully"}
