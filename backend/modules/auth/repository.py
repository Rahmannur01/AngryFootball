from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.auth.models import EmailVerificationChallenge, UserDB


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
        select(UserDB).where(func.lower(UserDB.email) == user_email.lower())
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
                func.lower(UserDB.email) == email.lower(),
            )
        )
    )


async def get_email_challenge_by_email(
    db: AsyncSession,
    email: str,
    *,
    for_update: bool = False,
) -> EmailVerificationChallenge | None:
    statement = select(EmailVerificationChallenge).where(
        EmailVerificationChallenge.email == email
    )
    if for_update:
        statement = statement.with_for_update()
    return await db.scalar(statement)


async def get_email_challenge_by_id(
    db: AsyncSession,
    challenge_id: str,
    *,
    for_update: bool = False,
) -> EmailVerificationChallenge | None:
    statement = select(EmailVerificationChallenge).where(
        EmailVerificationChallenge.id == challenge_id
    )
    if for_update:
        statement = statement.with_for_update()
    return await db.scalar(statement)


async def add_new_user(
    db: AsyncSession,
    username: str,
    email: str,
    hashed_password: str,
    avatar_url: str | None = None,
) -> UserDB | None:
    user = UserDB(
        username=username,
        email=email,
        hashed_password=hashed_password,
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
