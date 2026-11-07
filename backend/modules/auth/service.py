import re
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.database import DBSession
from backend.modules.auth import repository, schemas
from backend.modules.auth import rules as auth_rules
from backend.modules.auth.validators import (
    normalize_email,
    normalize_username,
    validate_email_length,
    validate_password,
    validate_username,
)
from backend.modules.chests import repository as chests_repository
from backend.modules.chests import service as chests_service


password_hash = PasswordHash.recommended()
DUMMY_HASH = password_hash.hash("dummypassword")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return password_hash.hash(password)


async def authenticate_user(
    db: AsyncSession,
    username: str,
    password: str,
):
    try:
        username = validate_username(normalize_username(username))
        password = validate_password(password)
    except ValueError:
        verify_password("invalid-password", DUMMY_HASH)
        return False

    user = await repository.get_user_by_username(db, username)
    if not user:
        verify_password(password, DUMMY_HASH)
        return False

    # OAuth users don't have password
    if user.hashed_password is None:
        return False

    if not verify_password(password, user.hashed_password):
        return False
    return user


async def create_new_user(
    db: AsyncSession,
    new_user: schemas.CreateUser,
):
    existing_user = await repository.get_user_by_username_or_email(
        db,
        new_user.username,
        str(new_user.email),
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Пользователь с таким никнеймом или email уже существует."
            ),
        )

    hashed_password = get_password_hash(new_user.password)
    user = await repository.add_new_user(
        db,
        new_user.username,
        str(new_user.email),
        hashed_password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Пользователь с таким никнеймом или email уже существует."
            ),
        )

    try:
        await chests_service.grant_start_chests(db, user.id)
    except chests_repository.ChestRepositoryError as error:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось создать стартовые сундуки.",
        ) from error

    return user


def _oauth_username_base(preferred: str, provider_id: str) -> str:
    candidate = re.sub(r"[^\w-]", "", preferred, flags=re.UNICODE)
    candidate = candidate[:auth_rules.USERNAME_MAX_LENGTH]
    if len(candidate) < auth_rules.USERNAME_MIN_LENGTH:
        candidate = f"user{provider_id}"
    return candidate[:auth_rules.USERNAME_MAX_LENGTH]


async def _available_oauth_username(
    db: AsyncSession,
    preferred: str,
    provider_id: str,
) -> str:
    base = _oauth_username_base(preferred, provider_id)
    if await repository.get_user_by_username(db, base) is None:
        return base

    for counter in range(2, 10_000):
        suffix = str(counter)
        candidate = (
            f"{base[:auth_rules.USERNAME_MAX_LENGTH - len(suffix)]}{suffix}"
        )
        if await repository.get_user_by_username(db, candidate) is None:
            return candidate

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Не удалось подобрать свободный никнейм.",
    )


async def get_or_create_oauth_user(
    db: AsyncSession,
    user_info: dict,
):
    provider = user_info["provider"]
    provider_id = str(user_info["provider_id"])

    if provider == "google":
        user = await repository.get_user_by_google_id(db, provider_id)
    elif provider == "telegram":
        user = await repository.get_user_by_telegram_id(db, int(provider_id))
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неизвестный OAuth-провайдер.",
        )

    if user is not None:
        return user

    email = user_info.get("email")
    if email and user_info.get("email_verified"):
        email = validate_email_length(normalize_email(email))
    else:
        email = None
    if provider == "google" and email and user_info.get("email_verified"):
        user = await repository.get_user_by_email(db, email)
        if user is not None:
            user.google_id = provider_id
            user.provider = user.provider or provider
            user.avatar_url = user.avatar_url or user_info.get("avatar_url")
            await db.commit()
            return user

    username = await _available_oauth_username(
        db,
        user_info.get("username") or f"user{provider_id}",
        provider_id,
    )
    user = await repository.add_new_user(
        db,
        username=username,
        email=email,
        google_id=provider_id if provider == "google" else None,
        telegram_id=int(provider_id) if provider == "telegram" else None,
        provider=provider,
        avatar_url=user_info.get("avatar_url"),
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Не удалось создать пользователя OAuth.",
        )

    try:
        await chests_service.grant_start_chests(db, user.id)
    except chests_repository.ChestRepositoryError as error:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось создать стартовые сундуки.",
        ) from error

    return user


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm,
    )


async def get_current_user(
    db: DBSession,
    token: Annotated[str, Depends(oauth2_scheme)],
) -> schemas.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = schemas.TokenData(user_id=int(user_id))
    except (InvalidTokenError, ValueError):
        raise credentials_exception

    current_user = await repository.get_user_by_id(
        db,
        token_data.user_id,
    )
    if current_user is None:
        raise credentials_exception

    return schemas.User(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        disabled=current_user.disabled,
        avatar_url=current_user.avatar_url,
        provider=current_user.provider,
        created_date=current_user.created_date,
    )


async def get_current_active_user(
    current_user: Annotated[
        schemas.User,
        Depends(get_current_user),
    ],
) -> schemas.User:
    if current_user.disabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    return current_user
