from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    "sqlite+aiosqlite:///./app.db",
)

SessionFactory = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
)


async def get_db():
    async with SessionFactory() as session:
        yield session


DBSession = Annotated[AsyncSession, Depends(get_db)]