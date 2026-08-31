import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, dashboard, drawings, masters, reports, standards
from app.core.config import settings
from app.db.session import engine
from app.models import Base

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # MVP bootstrap. Swap for Alembic migrations before production.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    description="AI Drawing Inspection Standard Generator & Inspection Report System",
    docs_url="/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.project_name}


for router in (auth.router, masters.router, drawings.router, standards.router,
               reports.router, dashboard.router):
    app.include_router(router, prefix=settings.api_prefix)
