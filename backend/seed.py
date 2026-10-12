import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.plan import Plan

async def seed_plans():
    async with AsyncSessionLocal() as session:
        # Check if plans exist
        from sqlalchemy.future import select
        result = await session.execute(select(Plan))
        existing = result.scalars().all()
        if existing:
            print("Plans already seeded.")
            return

        plans = [
            Plan(name="1 Hour Unlimited", price=200, uptime_mins=60, validity_days=1, rate_limit="5M/5M", description="Fast unlimited 1 hour plan"),
            Plan(name="24 Hours 1GB", price=500, data_mb=1024, validity_days=1, rate_limit="10M/10M", description="1GB for 24 hours"),
            Plan(name="7 Days 5GB", price=1500, data_mb=5120, validity_days=7, rate_limit="10M/10M", description="5GB for a week"),
        ]
        
        session.add_all(plans)
        await session.commit()
        print("Successfully seeded initial plans.")

if __name__ == "__main__":
    asyncio.run(seed_plans())
