from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.models.admin import Admin
from app.models.plan import Plan
from app.models.contact import ContactSetting
from app.core.security import get_password_hash

async def init_db_data():
    async with AsyncSessionLocal() as session:
        # 1. Seed Admin if none exists
        res = await session.execute(select(Admin).where(Admin.username == "admin"))
        if not res.scalars().first():
            admin = Admin(
                username="admin",
                password_hash=get_password_hash("ikoben2026"),
                role="superadmin"
            )
            session.add(admin)

        # 2. Seed Plans if none exist
        res_plans = await session.execute(select(Plan))
        if not res_plans.scalars().first():
            plans = [
                Plan(name="1 Hour Unlimited", price=200, uptime_mins=60, validity_days=1, rate_limit="5M/5M", description="Fast unlimited 1 hour plan", is_active=True),
                Plan(name="1Gb Daily Bundle", price=250, data_mb=1024, validity_days=1, rate_limit="2M/3M", description="1GB valid for 24 hours from first login", is_active=True),
                Plan(name="7 Days 5GB", price=1500, data_mb=5120, validity_days=7, rate_limit="10M/10M", description="5GB for a week", is_active=True),
            ]
            session.add_all(plans)

        # 3. Seed Contact if none exists
        res_contact = await session.execute(select(ContactSetting))
        if not res_contact.scalars().first():
            contact = ContactSetting(
                phone_primary="+234 800 000 0000",
                whatsapp_number="2348000000000",
                physical_location="Front Reception Desk",
                payment_instructions="Pay cash at the reception desk or contact the admin for account details."
            )
            session.add(contact)

        await session.commit()
