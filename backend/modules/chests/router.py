from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from backend.database import DBSession
from backend.modules.auth import schemas as auth_schemas
from backend.modules.auth import service as auth_service
from backend.modules.chests import repository
from backend.modules.chests import schemas as chests_schemas
from backend.modules.chests import service as chests_service


CurrentUser = Annotated[
    auth_schemas.User,
    Depends(auth_service.get_current_active_user),
]

router = APIRouter(
    prefix="/api/chests",
    tags=["Chests"],
)


@router.get("", response_model=chests_schemas.ChestsResponse,)
async def get_chests(db: DBSession, current_user: CurrentUser) -> chests_schemas.ChestsResponse:
    try:
        chests = await chests_service.get_user_chests(
            db,
            current_user.id,
        )
    except repository.InvalidStarterChestStateError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    except repository.ChestRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось получить стартовые сундуки.",
        ) from error

    return chests_schemas.ChestsResponse(chests=chests)


@router.post("/open-start-pack", response_model=chests_schemas.OpenedStarterChestsResponse,)
async def open_start_pack(db: DBSession, current_user: CurrentUser) -> chests_schemas.OpenedStarterChestsResponse:
    try:
        rewards = await chests_service.open_start_chests(
            db,
            current_user.id,
        )
    except chests_service.StarterPackUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except repository.InvalidStarterChestStateError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    except repository.InvalidStarterRewardsError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось сохранить награды стартового набора.",
        ) from error
    except repository.ChestRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось открыть стартовые сундуки.",
        ) from error

    return chests_schemas.OpenedStarterChestsResponse(
        rewards=[
            chests_schemas.StarterChestReward(
                chest_id=chest_id,
                revealed_at=revealed_at,
                character_type_id=character_type_id,
                footballer=footballer,
            )
            for chest_id, revealed_at, character_type_id, footballer in rewards
        ]
    )


@router.patch("/revealed", response_model=chests_schemas.ChestsResponse,)
async def reveal_chests(db: DBSession, payload: chests_schemas.RevealChestsRequest, current_user: CurrentUser,) -> chests_schemas.ChestsResponse:
    try:
        chests = await chests_service.mark_chests_as_revealed(
            db,
            current_user.id,
            payload.chest_ids,
        )
    except repository.InvalidChestRevealStateError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    except repository.ChestRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось сохранить просмотренные сундуки.",
        ) from error

    return chests_schemas.ChestsResponse(chests=chests)
