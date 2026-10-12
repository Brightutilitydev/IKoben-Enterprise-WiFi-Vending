import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.models.admin import Admin
from app.core.security import get_password_hash

async def seed_admin():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Admin).where(Admin.username == "admin"))
        existing = result.scalars().first()
        if existing:
            print("Admin already exists.")
            return

        admin = Admin(
            username="admin",
            password_hash=get_password_hash("ikoben2026"),
            role="superadmin"
        )
        session.add(admin)
        await session.commit()
        print("Superadmin created: admin / ikoben2026")

if __name__ == "__main__":
    asyncio.run(seed_admin())
