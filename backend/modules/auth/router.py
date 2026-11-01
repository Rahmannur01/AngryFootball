from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from backend.core.config import settings
from backend.database import DBSession
from backend.modules.auth import schemas, service


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
        data={"sub": user.username},
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
        data={"sub": user.username},
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
