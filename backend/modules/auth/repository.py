from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.auth.models import UserDB


async def get_user_by_id(
    db: AsyncSession,
    user_id: int,
) -> UserDB | None:
    return await db.get(UserDB, user_id)


async def get_user_by_email(
    db: AsyncSession,
    user_email: str,
) -> UserDB | None:
    return await db.scalar(
        select(UserDB).where(UserDB.email == user_email)
    )


async def get_user_by_username(
    db: AsyncSession,
    username: str,
) -> UserDB | None:
    return await db.scalar(
        select(UserDB).where(UserDB.username == username)
    )


async def get_user_by_username_or_email(
    db: AsyncSession,
    username: str,
    email: str,
) -> UserDB | None:
    return await db.scalar(
        select(UserDB).where(
            or_(
                UserDB.username == username,
                UserDB.email == email,
            )
        )
    )


async def get_user_by_google_id(
    db: AsyncSession,
    google_id: str,
) -> UserDB | None:
    return await db.scalar(
        select(UserDB).where(UserDB.google_id == google_id)
    )


async def get_user_by_telegram_id(
    db: AsyncSession,
    telegram_id: int,
) -> UserDB | None:
    return await db.scalar(
        select(UserDB).where(UserDB.telegram_id == telegram_id)
    )
async def add_new_user(
    db: AsyncSession,
    username: str,
    email: str | None = None,
    hashed_password: str | None = None,
    google_id: str | None = None,
    telegram_id: int | None = None,
    provider: str | None = None,
    avatar_url: str | None = None,
) -> UserDB | None:
    user = UserDB(
        username=username,
        email=email,
        hashed_password=hashed_password,
        google_id=google_id,
        telegram_id=telegram_id,
        provider=provider,
        avatar_url=avatar_url,
        disabled=False,
    )

    try:
        db.add(user)
        await db.flush()
    except IntegrityError:
        await db.rollback()
        return None
    return user
