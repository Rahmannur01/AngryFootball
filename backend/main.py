from pathlib import Path

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

import backend.modules.model_registry  # Registers every ORM model.
from backend.core.config import settings
from backend.core.logging import (
    RequestLoggingMiddleware,
    configure_logging,
    logger,
)
from backend.modules.auth.router import router as auth_router
from backend.modules.chests.router import router as chests_router
from backend.modules.lineup.router import router as lineup_router
from backend.modules.lineup.models import Bus
from backend.modules.team.router import router as team_router


PROJECT_DIR = Path(__file__).resolve().parents[1]
PUBLIC_DIR = PROJECT_DIR / "public"

from backend.database import SessionFactory, engine


INITIAL_BUSES = (
    {"id": 1, "code": "Bus_constructor_1", "name": "Автобус 1"},
    {"id": 2, "code": "Bus_constructor_2", "name": "Автобус 2"},
    {"id": 3, "code": "Bus_constructor_3", "name": "Автобус 3"},
    {"id": 4, "code": "Bus_constructor_4", "name": "Автобус 4"},
)


async def ensure_bus_catalog() -> None:
    async with SessionFactory() as session:
        existing = list((await session.scalars(select(Bus))).all())
        existing_ids = {bus.id for bus in existing}
        existing_codes = {bus.code for bus in existing}

        for bus in INITIAL_BUSES:
            if bus["id"] in existing_ids or bus["code"] in existing_codes:
                continue
            session.add(Bus(**bus))

        await session.commit()


configure_logging(
    level=settings.log_level,
    log_file=settings.log_file,
    max_bytes=settings.log_max_bytes,
    backup_count=settings.log_backup_count,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        logger.info(
            "Application startup",
            extra={"event": "application.startup"},
        )
        await ensure_bus_catalog()
        yield
    finally:
        await engine.dispose()
        logger.info(
            "Application shutdown",
            extra={"event": "application.shutdown"},
        )


# ContestBot removes the public ``/angryfootball`` prefix before proxying the
# request here. Keep the prefix in settings for generated public URLs, but do
# not set it as Starlette's routing root: mounted applications such as
# StaticFiles would otherwise only match paths that still contain the prefix.
app = FastAPI(lifespan=lifespan)
app.add_middleware(RequestLoggingMiddleware)

settings.avatar_dir.mkdir(parents=True, exist_ok=True)
app.mount(
    "/static/avatars",
    StaticFiles(directory=settings.avatar_dir),
    name="avatars",
)
app.mount(
    "/static",
    StaticFiles(directory=PUBLIC_DIR, html=True),
    name="static",
)
app.include_router(auth_router)
app.include_router(chests_router)
app.include_router(team_router)
app.include_router(lineup_router)


@app.get("/")
async def root():
    return RedirectResponse(
        url=f"{settings.root_path}/static/frontend/index.html"
    )


@app.get("/api/config")
async def get_config():
    return {
        "google_client_id": settings.google_client_id,
        "telegram_bot_username": settings.telegram_bot_username,
        "dev_mode": settings.dev_mode
    }
