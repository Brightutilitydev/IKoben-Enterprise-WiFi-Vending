import secrets
import string
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

async def generate_unique_pin(db: AsyncSession, length: int = 12) -> str:
    """Generate a secure, unique numeric PIN verified against the database."""
    from app.models.voucher import Voucher
    alphabet = string.digits
    
    while True:
        pin = ''.join(secrets.choice(alphabet) for i in range(length))
        # Check DB
        result = await db.execute(select(Voucher).where(Voucher.pin == pin))
        if not result.scalars().first():
            return pin
