import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.logging import logger
from backend.database import DBSession
from backend.modules.auth import mailer, repository, schemas
from backend.modules.auth.models import EmailVerificationChallenge
from backend.modules.auth.validators import (
    normalize_username,
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

    # Legacy accounts without a local password cannot authenticate.
    if user.hashed_password is None:
        return False

    if not verify_password(password, user.hashed_password):
        return False
    return user


async def create_new_user(
    db: AsyncSession,
    new_user: schemas.CreateUser,
):
    challenge_id, email, verification_digest = _decode_registration_token(
        new_user.registration_token
    )
    challenge = await repository.get_email_challenge_by_id(
        db,
        challenge_id,
        for_update=True,
    )
    if (
        challenge is None
        or challenge.email != email
        or challenge.code_digest != verification_digest
        or challenge.verified_at is None
        or challenge.consumed_at is not None
    ):
        logger.warning(
            "Registration confirmation rejected",
            extra={
                "event": "auth.registration_rejected",
                "reason": "invalid_confirmation",
            },
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Подтверждение email недействительно или уже использовано.",
        )

    existing_user = await repository.get_user_by_username_or_email(
        db,
        new_user.username,
        email,
    )
    if existing_user is not None:
        logger.warning(
            "Registration identity conflict",
            extra={
                "event": "auth.registration_rejected",
                "reason": "identity_conflict",
            },
        )
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
        email,
        hashed_password,
    )

    if user is None:
        logger.warning(
            "Registration identity conflict",
            extra={
                "event": "auth.registration_rejected",
                "reason": "identity_conflict",
            },
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Пользователь с таким никнеймом или email уже существует."
            ),
        )

    challenge.consumed_at = _utc_now()
    try:
        await chests_service.grant_start_chests(db, user.id)
    except chests_repository.ChestRepositoryError as error:
        await db.rollback()
        logger.exception(
            "Starter chests creation failed during registration",
            extra={
                "event": "auth.registration_failed",
                "reason": "starter_chests_failed",
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось создать стартовые сундуки.",
        ) from error

    logger.info(
        "User registration completed",
        extra={
            "event": "auth.registration_completed",
            "user_id": user.id,
        },
    )
    return user


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _code_digest(challenge_id: str, code: str) -> str:
    payload = f"{challenge_id}:{code}".encode()
    return hmac.new(
        settings.secret_key.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()


def _decoy_challenge_id(email: str) -> str:
    digest = hmac.new(
        settings.secret_key.encode(),
        f"registration-decoy:{email}".encode(),
        hashlib.sha256,
    ).digest()
    return str(uuid.UUID(bytes=digest[:16], version=4))


def _email_code_sent(challenge_id: str) -> schemas.EmailCodeSent:
    return schemas.EmailCodeSent(
        challenge_id=challenge_id,
        expires_in_seconds=settings.email_code_expire_minutes * 60,
        resend_after_seconds=settings.email_code_resend_seconds,
    )


def _registration_token(
    challenge_id: str,
    email: str,
    verification_digest: str,
) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.registration_token_expire_minutes
    )
    return jwt.encode(
        {
            "sub": challenge_id,
            "email": email,
            "purpose": "registration",
            "verification": verification_digest,
            "exp": expires_at,
        },
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def _decode_registration_token(token: str) -> tuple[str, str, str]:
    exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Подтверждение email недействительно или истекло.",
    )
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        challenge_id = payload.get("sub")
        email = payload.get("email")
        verification_digest = payload.get("verification")
        if (
            payload.get("purpose") != "registration"
            or not isinstance(challenge_id, str)
            or not isinstance(email, str)
            or not isinstance(verification_digest, str)
        ):
            raise exception
    except (InvalidTokenError, ValueError):
        raise exception
    return challenge_id, email, verification_digest


async def request_registration_code(
    db: AsyncSession,
    email: str,
) -> schemas.EmailCodeSent:
    logger.info(
        "Registration code requested",
        extra={"event": "auth.registration_code_requested"},
    )
    if await repository.get_user_by_email(db, email) is not None:
        logger.info(
            "Registration code delivery suppressed",
            extra={
                "event": "auth.registration_code_suppressed",
                "reason": "existing_account",
            },
        )
        return _email_code_sent(_decoy_challenge_id(email))

    now = _utc_now()
    challenge = await repository.get_email_challenge_by_email(
        db,
        email,
        for_update=True,
    )

    if challenge is None:
        challenge = EmailVerificationChallenge(
            id=str(uuid.uuid4()),
            email=email,
            code_digest="",
            failed_attempts=0,
            send_count=1,
            window_started_at=now,
            last_sent_at=now,
            expires_at=now,
        )
        db.add(challenge)
    else:
        resend_at = challenge.last_sent_at + timedelta(
            seconds=settings.email_code_resend_seconds
        )
        if now < resend_at:
            logger.info(
                "Registration code delivery suppressed",
                extra={
                    "event": "auth.registration_code_suppressed",
                    "reason": "resend_cooldown",
                },
            )
            return _email_code_sent(challenge.id)

        if now >= challenge.window_started_at + timedelta(hours=1):
            challenge.window_started_at = now
            challenge.send_count = 0
            challenge.failed_attempts = 0
        if challenge.failed_attempts >= settings.email_code_max_attempts:
            logger.warning(
                "Registration code delivery suppressed",
                extra={
                    "event": "auth.registration_code_suppressed",
                    "reason": "attempt_limit",
                    "attempt_count": challenge.failed_attempts,
                },
            )
            return _email_code_sent(challenge.id)
        if challenge.send_count >= settings.email_code_max_sends_per_hour:
            logger.warning(
                "Registration code delivery suppressed",
                extra={
                    "event": "auth.registration_code_suppressed",
                    "reason": "send_limit",
                },
            )
            return _email_code_sent(challenge.id)
        challenge.send_count += 1
        challenge.last_sent_at = now

    code = f"{secrets.randbelow(1_000_000):06d}"
    challenge.code_digest = _code_digest(challenge.id, code)
    challenge.expires_at = now + timedelta(
        minutes=settings.email_code_expire_minutes
    )
    challenge.verified_at = None
    challenge.consumed_at = None

    try:
        await mailer.send_registration_code(email, code)
        await db.commit()
    except mailer.MailDeliveryError as error:
        await db.rollback()
        logger.exception(
            "Registration email delivery failed",
            extra={"event": "auth.registration_email_failed"},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Не удалось отправить код. Попробуйте позже.",
        ) from error

    logger.info(
        "Registration code email sent",
        extra={"event": "auth.registration_code_sent"},
    )
    return _email_code_sent(challenge.id)


async def verify_registration_code(
    db: AsyncSession,
    challenge_id: str,
    code: str,
) -> schemas.EmailVerified:
    challenge = await repository.get_email_challenge_by_id(
        db,
        challenge_id,
        for_update=True,
    )
    now = _utc_now()
    if challenge is None or challenge.expires_at < now:
        logger.warning(
            "Registration code rejected",
            extra={
                "event": "auth.registration_code_rejected",
                "reason": "invalid_or_expired",
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код недействителен или срок его действия истёк.",
        )
    if challenge.verified_at is not None or challenge.consumed_at is not None:
        logger.warning(
            "Registration code rejected",
            extra={
                "event": "auth.registration_code_rejected",
                "reason": "already_used",
            },
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот код уже использован.",
        )
    if challenge.failed_attempts >= settings.email_code_max_attempts:
        logger.warning(
            "Registration code rejected",
            extra={
                "event": "auth.registration_code_rejected",
                "reason": "attempt_limit",
                "attempt_count": challenge.failed_attempts,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Превышено количество попыток. Запросите новый код позже.",
        )

    expected_digest = _code_digest(challenge.id, code)
    if not hmac.compare_digest(challenge.code_digest, expected_digest):
        challenge.failed_attempts += 1
        await db.commit()
        logger.warning(
            "Registration code rejected",
            extra={
                "event": "auth.registration_code_rejected",
                "reason": "incorrect_code",
                "attempt_count": challenge.failed_attempts,
            },
        )
        if challenge.failed_attempts >= settings.email_code_max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Превышено количество попыток. Запросите новый код позже.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный код.",
        )

    challenge.verified_at = now
    await db.commit()
    logger.info(
        "Registration email verified",
        extra={"event": "auth.registration_email_verified"},
    )
    return schemas.EmailVerified(
        registration_token=_registration_token(
            challenge.id,
            challenge.email,
            challenge.code_digest,
        )
    )


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
