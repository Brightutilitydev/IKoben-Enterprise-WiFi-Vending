import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.voucher import Voucher
from app.models.plan import Plan

async def seed_voucher():
    async with AsyncSessionLocal() as session:
        from sqlalchemy.future import select
        # Get first plan
        result = await session.execute(select(Plan))
        plan = result.scalars().first()
        
        if not plan:
            print("No plans found.")
            return

        v = Voucher(pin="TEST12345678", plan_id=plan.id)
        session.add(v)
        await session.commit()
        print(f"Created TEST12345678 voucher for plan {plan.name}")

if __name__ == "__main__":
    asyncio.run(seed_voucher())
