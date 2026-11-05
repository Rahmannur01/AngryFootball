from pathlib import Path

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

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
from backend.modules.team.router import router as team_router


PROJECT_DIR = Path(__file__).resolve().parents[1]
PUBLIC_DIR = PROJECT_DIR / "public"

from backend.database import Base, engine


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
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        yield
    finally:
        await engine.dispose()
        logger.info(
            "Application shutdown",
            extra={"event": "application.shutdown"},
        )


app = FastAPI(lifespan=lifespan)
app.add_middleware(RequestLoggingMiddleware)

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
def root():
    return RedirectResponse(url="/static/frontend/home.html")
