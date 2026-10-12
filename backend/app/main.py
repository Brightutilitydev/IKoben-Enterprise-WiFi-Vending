from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
import asyncio
from app.routers import health, plans, vouchers, payments, admin, contact
from app.workers.reconciliation import run_reconciliation
from app.db.base import Base
from app.models.contact import ContactSetting
from app.db.session import engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    from app.db.init_db import init_db_data
    await init_db_data()
        
    # Start reconciliation background worker
    worker_task = asyncio.create_task(run_reconciliation())
    
    yield
    
    # Teardown
    worker_task.cancel()
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["http://localhost:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(plans.router, prefix=settings.API_V1_STR)
app.include_router(vouchers.router, prefix=settings.API_V1_STR)
app.include_router(payments.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(contact.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Welcome to IKoben Enterprise Wi-Fi Vending API"}
