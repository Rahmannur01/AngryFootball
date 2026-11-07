import secrets
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm

from backend.core.config import settings
from backend.database import DBSession
from backend.modules.auth import oauth, repository, schemas, service


router = APIRouter(
    prefix="/api/auth",
    tags=["Auth"],
)


@router.post(
    "/register",
    response_model=schemas.Token,
    status_code=status.HTTP_201_CREATED,
)
async def register_new_user(
    db: DBSession,
    user_data: schemas.CreateUser,
) -> schemas.Token:
    user = await service.create_new_user(db, user_data)
    access_token_expires = timedelta(
        minutes=settings.access_token_expire_minutes
    )
    access_token = service.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires,
    )

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
    )


@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    db: DBSession,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> schemas.Token:
    user = await service.authenticate_user(
        db,
        form_data.username,
        form_data.password,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(
        minutes=settings.access_token_expire_minutes
    )
    access_token = service.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires,
    )
    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
    )


@router.get("/profile", response_model=schemas.User)
async def read_users_me(
    current_user: Annotated[
        schemas.User,
        Depends(service.get_current_active_user),
    ],
) -> schemas.User:
    return current_user


@router.post("/oauth/google", response_model=schemas.Token)
async def google_oauth_login(
    db: DBSession,
    token_data: schemas.OAuthToken,
) -> schemas.Token:
    user_info = await oauth.GoogleOAuth.get_user_info(token_data.access_token)
    user = await service.get_or_create_oauth_user(db, user_info)

    # Create access token
    access_token_expires = timedelta(
        minutes=settings.access_token_expire_minutes
    )
    access_token = service.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires,
    )

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
    )


@router.post("/oauth/telegram", response_model=schemas.Token)
async def telegram_oauth_login(
    db: DBSession,
    auth_data: schemas.TelegramAuthData,
) -> schemas.Token:
    user_info = await oauth.TelegramOAuth.verify_telegram_auth(
        auth_data.model_dump(exclude_none=True)
    )
    user = await service.get_or_create_oauth_user(db, user_info)

    # Create access token
    access_token_expires = timedelta(
        minutes=settings.access_token_expire_minutes
    )
    access_token = service.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires,
    )

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
    )


@router.post("/avatar/upload")
async def upload_avatar(
    db: DBSession,
    current_user: Annotated[
        schemas.User,
        Depends(service.get_current_active_user),
    ],
    file: UploadFile = File(...),
) -> dict:
    max_size = 5 * 1024 * 1024
    content = await file.read(max_size + 1)
    await file.close()
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Max size is 5MB",
        )

    extension = _image_extension(content)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image. Only JPEG, PNG, GIF, WEBP allowed",
        )

    settings.avatar_dir.mkdir(parents=True, exist_ok=True)
    filename = f"user_{current_user.id}_{secrets.token_hex(8)}{extension}"
    file_path = settings.avatar_dir / filename
    file_path.write_bytes(content)

    # Update user avatar URL
    avatar_url = (
        f"{settings.root_path.rstrip('/')}/static/avatars/{filename}"
    )
    user = await repository.get_user_by_id(db, current_user.id)
    if user:
        user.avatar_url = avatar_url
        await db.commit()

    return {"avatar_url": avatar_url}


def _image_extension(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if content.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if (
        len(content) >= 12
        and content.startswith(b"RIFF")
        and content[8:12] == b"WEBP"
    ):
        return ".webp"
    return None
