"""Business operations for a user's bus and footballer placement."""

from collections.abc import Mapping

from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.lineup import repository
from backend.modules.lineup import rules
from backend.modules.lineup.models import UserBus
from backend.modules.team import service as team_service
from backend.modules.team.models import UserFootballer


async def get_initial_lineup(
    db: AsyncSession,
    user_id: int,
) -> tuple[UserBus, list[UserFootballer]]:
    """Return every user-specific value needed to start the game."""

    user_bus = await get_or_create_user_bus(db, user_id)
    footballers = await team_service.get_user_footballers(db, user_id)
    return user_bus, footballers


async def get_lineup_summary(
    db: AsyncSession,
    user_id: int,
) -> tuple[UserBus, int]:
    """Return the selected bus and current placement count."""

    user_bus = await get_or_create_user_bus(db, user_id)
    placed_players = await repository.count_user_lineup_slots(
        db,
        user_id,
    )
    return user_bus, placed_players


async def get_or_create_user_bus(
    db: AsyncSession,
    user_id: int,
) -> UserBus:
    """Return the selected bus or persist the default bus for a new user."""

    user_bus = await repository.get_user_bus(db, user_id)
    if user_bus is not None:
        return user_bus

    return await repository.upsert_user_bus(
        db,
        user_id,
        rules.DEFAULT_BUS_ID,
    )


async def save_user_bus(
    db: AsyncSession,
    user_id: int,
    bus_id: int,
) -> UserBus:
    """Save the selected bus and clear slots if its type changed."""

    return await repository.upsert_user_bus(db, user_id, bus_id)


async def replace_user_lineup_slots(
    db: AsyncSession,
    user_id: int,
    footballer_slots: Mapping[int, int],
) -> list[UserFootballer]:
    """Replace the complete saved placement of a user's footballers."""

    return await repository.replace_user_lineup_slots(
        db,
        user_id,
        footballer_slots,
    )


async def set_user_footballer_slot(
    db: AsyncSession,
    user_id: int,
    footballer_id: int,
    slot_id: int,
) -> UserFootballer:
    """Assign one owned footballer to a bus slot."""

    return await repository.set_user_footballer_slot(
        db,
        user_id,
        footballer_id,
        slot_id,
    )


async def clear_user_footballer_slot(
    db: AsyncSession,
    user_id: int,
    footballer_id: int,
) -> UserFootballer:
    """Remove one owned footballer from its saved slot."""

    return await repository.clear_user_footballer_slot(
        db,
        user_id,
        footballer_id,
    )


async def clear_user_lineup_slots(
    db: AsyncSession,
    user_id: int,
) -> int:
    """Remove all owned footballers from their saved slots."""

    return await repository.clear_user_lineup_slots(db, user_id)
