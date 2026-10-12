import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import AsyncSessionLocal
from app.models.voucher import Voucher
from app.models.user_session import UserSession
from app.services.routeros import router_service

logger = logging.getLogger(__name__)

async def run_reconciliation():
    while True:
        try:
            logger.info("Starting usage reconciliation...")
            await _reconcile()
        except Exception as e:
            logger.error(f"Reconciliation error: {e}")
        
        # Poll every 60 seconds
        await asyncio.sleep(60)

async def _reconcile():
    # 1. Fetch active sessions and users from RouterOS
    active_sessions_raw = await router_service.get_active_sessions()
    user_stats_raw = await router_service.get_user_stats()
    
    # Create fast lookups
    # user_stats typically has 'bytes-in', 'bytes-out', 'uptime' (as string)
    router_users = {u['name']: u for u in user_stats_raw if 'name' in u}
    
    async with AsyncSessionLocal() as db:
        # Get all ACTIVE vouchers
        result = await db.execute(select(Voucher).options(selectinload(Voucher.plan)).where(Voucher.status == "ACTIVE"))
        active_vouchers = result.scalars().all()
        
        now = datetime.utcnow()
        
        for voucher in active_vouchers:
            pin = voucher.pin
            stats = router_users.get(pin)
            
            # Reconcile usage if available
            if stats:
                bytes_in = int(stats.get('bytes-in', 0))
                bytes_out = int(stats.get('bytes-out', 0))
                total_bytes = bytes_in + bytes_out
                
                # MikroTik tracks total bytes for the user profile since it was created/reset.
                # Since we don't reset unless we explicitly clear counters, we can safely sync this total
                # back to the DB `bytes_used`.
                if total_bytes > voucher.bytes_used:
                    voucher.bytes_used = total_bytes
            
            # Check depletion / expiry
            depleted = False
            
            # 1. Check Data Depletion
            if voucher.plan.data_mb:
                limit_bytes = voucher.plan.data_mb * 1024 * 1024
                if voucher.bytes_used >= limit_bytes:
                    logger.info(f"Voucher {pin} depleted data limit.")
                    depleted = True
            
            # 2. Check Calendar Validity
            # If the voucher is active but activation_time is null, set it
            if not voucher.activation_time:
                voucher.activation_time = now
                if voucher.plan.validity_days:
                    voucher.expiry_time = voucher.activation_time + timedelta(days=voucher.plan.validity_days)
            
            if voucher.expiry_time and now > voucher.expiry_time:
                logger.info(f"Voucher {pin} has expired based on calendar.")
                depleted = True

            # If depleted, disable on router and update DB
            if depleted:
                voucher.status = "DEPLETED"
                await router_service.disconnect_user(pin)
                
            db.add(voucher)
            
        await db.commit()
        logger.info("Reconciliation complete.")
