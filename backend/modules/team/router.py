from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from backend.database import DBSession
from backend.modules.auth import schemas as auth_schemas
from backend.modules.auth import service as auth_service
from backend.modules.catalog import schemas as catalog_schemas
from backend.modules.team import repository
from backend.modules.team import schemas as team_schemas
from backend.modules.team import service as team_service


CurrentUser = Annotated[
    auth_schemas.User,
    Depends(auth_service.get_current_active_user),
]

router = APIRouter(
    prefix="/api/team",
    tags=["Team"],
)


@router.get(
    "/players",
    response_model=list[team_schemas.UserFootballer],
)
async def get_my_footballers(
    db: DBSession,
    current_user: CurrentUser,
) -> list[team_schemas.UserFootballer]:
    try:
        owned_footballers = await team_service.get_user_footballers(
            db,
            current_user.id,
        )
    except repository.InvalidTeamOwnerIdError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    except repository.TeamOwnerNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except repository.TeamRepositoryError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось получить футболистов пользователя.",
        ) from error

    response: list[team_schemas.UserFootballer] = []
    for owned in owned_footballers:
        footballer = catalog_schemas.Footballer.model_validate(
            owned.footballer
        )
        response.append(
            team_schemas.UserFootballer(
                **footballer.model_dump(),
                character_type_id=owned.character_type_id,
            )
        )

    return response
