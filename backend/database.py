from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from backend.core.config import settings


class Base(DeclarativeBase):
    pass


def _application_database_url(url: str) -> str:
    if url.startswith("sqlite://"):
        return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


engine = create_async_engine(
    _application_database_url(settings.database_url),
    echo=False,
)

SessionFactory = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
)


async def get_db():
    async with SessionFactory() as session:
        yield session


DBSession = Annotated[AsyncSession, Depends(get_db)]
