"""Business operations for footballers owned by game users."""

from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.chests.models import UserChest
from backend.modules.team import repository
from backend.modules.team.models import UserFootballer


async def get_user_footballers(
    db: AsyncSession,
    user_id: int,
) -> list[UserFootballer]:
    """Return the persistent footballer collection of a user."""

    return await repository.get_user_footballers(db, user_id)


async def acquire_chest_footballers(
    db: AsyncSession,
    user_id: int,
    chest_ids: Sequence[int],
) -> list[UserChest]:
    """Persist chest rewards as owned footballers in one transaction."""

    return await repository.acquire_chest_footballers(
        db,
        user_id,
        chest_ids,
    )
