from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from backend.database import DBSession
from backend.modules.auth import schemas as auth_schemas
from backend.modules.auth import service as auth_service
from backend.modules.catalog import schemas as catalog_schemas
from backend.modules.lineup import repository
from backend.modules.lineup import rules
from backend.modules.lineup import schemas as lineup_schemas
from backend.modules.lineup import service as lineup_service
from backend.modules.team import repository as team_repository


CurrentUser = Annotated[
    auth_schemas.User,
    Depends(auth_service.get_current_active_user),
]

router = APIRouter(
    prefix="/api/lineup",
    tags=["Lineup"],
)


@router.get(
    "",
    response_model=lineup_schemas.InitialLineupResponse,
)
async def get_initial_lineup(
    db: DBSession,
    current_user: CurrentUser,
) -> lineup_schemas.InitialLineupResponse:
    try:
        user_bus, owned_footballers = (
            await lineup_service.get_initial_lineup(
                db,
                current_user.id,
            )
        )
    except (
        repository.InvalidUserBusDataError,
        team_repository.InvalidTeamOwnerIdError,
    ) as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except team_repository.TeamOwnerNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except repository.BusNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Автобус по умолчанию не настроен.",
        ) from error
    except (
        repository.UserBusRepositoryError,
        team_repository.TeamRepositoryError,
    ) as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось загрузить данные игры.",
        ) from error

    players = []
    for owned in owned_footballers:
        footballer = catalog_schemas.Footballer.model_validate(
            owned.footballer
        )
        players.append(
            lineup_schemas.LineupFootballerResponse(
                **footballer.model_dump(),
                character_type_id=owned.character_type_id,
                slot_id=owned.slot_id,
            )
        )

    return lineup_schemas.InitialLineupResponse(
        bus_id=user_bus.bus_id,
        players=players,
    )


@router.get(
    "/summary",
    response_model=lineup_schemas.LineupSummaryResponse,
)
async def get_lineup_summary(
    db: DBSession,
    current_user: CurrentUser,
) -> lineup_schemas.LineupSummaryResponse:
    try:
        user_bus, placed_players = (
            await lineup_service.get_lineup_summary(
                db,
                current_user.id,
            )
        )
    except repository.InvalidUserBusDataError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except repository.BusNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Автобус по умолчанию не настроен.",
        ) from error
    except repository.LineupRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось получить готовность расстановки.",
        ) from error

    required_players = rules.MAX_LINEUP_SIZE
    return lineup_schemas.LineupSummaryResponse(
        bus_id=user_bus.bus_id,
        placed_players=placed_players,
        required_players=required_players,
        is_ready=placed_players == required_players,
    )


@router.get(
    "/bus",
    response_model=lineup_schemas.UserBusResponse,
)
async def get_bus(
    db: DBSession,
    current_user: CurrentUser,
) -> lineup_schemas.UserBusResponse:
    try:
        user_bus = await lineup_service.get_or_create_user_bus(
            db,
            current_user.id,
        )
    except repository.InvalidUserBusDataError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except repository.BusNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Автобус по умолчанию не настроен.",
        ) from error
    except repository.UserBusRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось получить автобус пользователя.",
        ) from error

    return lineup_schemas.UserBusResponse.model_validate(user_bus)


@router.put(
    "/bus",
    response_model=lineup_schemas.UserBusResponse,
)
async def save_bus(
    db: DBSession,
    payload: lineup_schemas.BusUpsertRequest,
    current_user: CurrentUser,
) -> lineup_schemas.UserBusResponse:
    try:
        user_bus = await lineup_service.save_user_bus(
            db,
            current_user.id,
            payload.bus_id,
        )
    except repository.InvalidUserBusDataError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except repository.BusNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except repository.UserBusRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось сохранить автобус пользователя.",
        ) from error

    return lineup_schemas.UserBusResponse.model_validate(user_bus)


@router.put(
    "/slots",
    response_model=lineup_schemas.LineupSlotsResponse,
)
async def replace_lineup_slots(
    db: DBSession,
    payload: lineup_schemas.ReplaceLineupSlotsRequest,
    current_user: CurrentUser,
) -> lineup_schemas.LineupSlotsResponse:
    footballer_slots = {
        player.footballer_id: player.slot_id
        for player in payload.players
    }

    try:
        footballers = await lineup_service.replace_user_lineup_slots(
            db,
            current_user.id,
            footballer_slots,
        )
    except repository.InvalidLineupDataError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except repository.FootballerNotOwnedError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except repository.LineupRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось сохранить расстановку футболистов.",
        ) from error

    return lineup_schemas.LineupSlotsResponse(
        players=[
            lineup_schemas.FootballerSlot.model_validate(footballer)
            for footballer in footballers
        ]
    )


@router.put(
    "/players/{footballer_id}/slot",
    response_model=lineup_schemas.FootballerSlot,
)
async def set_footballer_slot(
    footballer_id: int,
    db: DBSession,
    payload: lineup_schemas.SetFootballerSlotRequest,
    current_user: CurrentUser,
) -> lineup_schemas.FootballerSlot:
    try:
        footballer = await lineup_service.set_user_footballer_slot(
            db,
            current_user.id,
            footballer_id,
            payload.slot_id,
        )
    except repository.InvalidLineupDataError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except repository.FootballerNotOwnedError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except repository.LineupRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось сохранить место футболиста.",
        ) from error

    return lineup_schemas.FootballerSlot.model_validate(footballer)


@router.delete(
    "/players/{footballer_id}/slot",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def clear_footballer_slot(
    footballer_id: int,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    try:
        await lineup_service.clear_user_footballer_slot(
            db,
            current_user.id,
            footballer_id,
        )
    except repository.InvalidLineupDataError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except repository.FootballerNotOwnedError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except repository.LineupRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось убрать футболиста из автобуса.",
        ) from error


@router.delete(
    "/slots",
    response_model=lineup_schemas.ClearLineupSlotsResponse,
)
async def clear_lineup_slots(
    db: DBSession,
    current_user: CurrentUser,
) -> lineup_schemas.ClearLineupSlotsResponse:
    try:
        removed_count = await lineup_service.clear_user_lineup_slots(
            db,
            current_user.id,
        )
    except repository.InvalidLineupDataError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except repository.LineupRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось очистить расстановку футболистов.",
        ) from error

    return lineup_schemas.ClearLineupSlotsResponse(
        removed_count=removed_count,
    )
