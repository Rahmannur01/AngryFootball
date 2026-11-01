from pathlib import Path

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

import backend.modules.model_registry  # Registers every ORM model.
from backend.modules.auth.router import router as auth_router
from backend.modules.chests.router import router as chests_router


PROJECT_DIR = Path(__file__).resolve().parents[1]
PUBLIC_DIR = PROJECT_DIR / "public"

from backend.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        yield
    finally:
        await engine.dispose()


app = FastAPI(lifespan=lifespan)

app.mount(
    "/static",
    StaticFiles(directory=PUBLIC_DIR, html=True),
    name="static",
)
app.include_router(auth_router)
app.include_router(chests_router)


@app.get("/")
def root():
    return RedirectResponse(url="/static/frontend/home.html")
