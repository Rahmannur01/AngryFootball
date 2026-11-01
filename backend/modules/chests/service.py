"""Business logic for generating and opening chests."""

from datetime import datetime
from random import SystemRandom

from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.catalog import repository as catalog_crud
from backend.modules.catalog.models import Footballer
from backend.modules.chests import repository, rules
from backend.modules.chests.models import UserChest
from backend.modules.team import repository as team_repository
from backend.modules.team import service as team_service


class StarterPackUnavailableError(RuntimeError):
    """Raised when the catalog cannot provide a complete starter pack."""


_character_type_random = SystemRandom()


def assign_character_types(
    footballers: list[Footballer],
) -> list[tuple[int, int | None]]:
    """Assign a persisted gameplay body type to every starter reward."""

    available_types: dict[str, list[int]] = {}
    assignments: list[tuple[int, int | None]] = []

    for footballer in footballers:
        position = footballer.position
        if position == "Goalkeeper":
            assignments.append((footballer.id, None))
            continue

        allowed_types = rules.CHARACTER_TYPE_IDS_BY_POSITION.get(position or "")
        if not allowed_types:
            raise StarterPackUnavailableError(
                f"Для позиции {position!r} не настроены типы персонажей"
            )

        position_types = available_types.get(position)
        if not position_types:
            position_types = list(allowed_types)
            _character_type_random.shuffle(position_types)
            available_types[position] = position_types

        assignments.append((footballer.id, position_types.pop()))

    return assignments


async def get_start_pack(db: AsyncSession) -> list[Footballer]:
    start_pack: list[Footballer] = []

    for position, count in rules.START_PACK_POSITION_RULES.items():
        footballers = await catalog_crud.get_random_footballers_by_position(
            db,
            position,
            count,
        )
        if len(footballers) != count:
            raise StarterPackUnavailableError(
                f"Недостаточно футболистов позиции {position}"
            )
        start_pack.extend(footballers)

    if len({footballer.id for footballer in start_pack}) != rules.START_PACK_SIZE:
        raise StarterPackUnavailableError(
            "Стартовый набор содержит повторяющихся футболистов"
        )

    return start_pack


async def grant_start_chests(
    db: AsyncSession,
    user_id: int,
) -> list[UserChest]:
    return await repository.create_start_chests(db, user_id)


def _validate_start_chests(chests: list[UserChest]) -> None:
    if len(chests) != rules.START_PACK_SIZE:
        raise repository.InvalidStarterChestStateError(
            "У пользователя должен быть полный стартовый набор из "
            f"{rules.START_PACK_SIZE} сундуков"
        )


async def ensure_start_chests(
    db: AsyncSession,
    user_id: int,
    existing_chests: list[UserChest] | None = None,
) -> list[UserChest]:
    start_chests = existing_chests
    if start_chests is None:
        start_chests = await repository.get_user_start_chests(
            db,
            user_id,
        )

    if start_chests:
        _validate_start_chests(start_chests)
        return start_chests

    try:
        return await repository.create_start_chests(db, user_id)
    except repository.StarterChestsAlreadyExistError:
        start_chests = await repository.get_user_start_chests(
            db,
            user_id,
        )
        _validate_start_chests(start_chests)
        return start_chests


async def get_user_chests(
    db: AsyncSession,
    user_id: int,
) -> list[UserChest]:
    chests = await repository.get_user_chests(db, user_id)
    start_chests = [
        chest
        for chest in chests
        if chest.chest_type == "starter"
    ]
    ensured_start_chests = await ensure_start_chests(
        db,
        user_id,
        start_chests,
    )

    if not start_chests:
        chests.extend(ensured_start_chests)

    return sorted(chests, key=lambda chest: chest.id)


async def mark_chests_as_revealed(
    db: AsyncSession,
    user_id: int,
    chest_ids: list[int],
) -> list[UserChest]:
    try:
        return await team_service.acquire_chest_footballers(
            db,
            user_id,
            chest_ids,
        )
    except team_repository.InvalidTeamAcquisitionError as error:
        raise repository.InvalidChestRevealStateError(str(error)) from error
    except team_repository.TeamRepositoryError as error:
        raise repository.ChestRepositoryError(
            "Не удалось добавить награды сундуков в команду"
        ) from error


async def open_start_chests(
    db: AsyncSession,
    user_id: int,
) -> list[tuple[int, datetime | None, int | None, Footballer]]:
    await ensure_start_chests(db, user_id)

    existing_rewards = await repository.get_start_chest_rewards(
        db,
        user_id,
    )
    if existing_rewards:
        if len(existing_rewards) != rules.START_PACK_SIZE:
            raise repository.InvalidStarterChestStateError(
                "Стартовый набор содержит неполный список наград"
            )
        return [
            reward
            for reward in existing_rewards
            if reward[1] is None
        ]

    footballers = await get_start_pack(db)
    start_rewards = assign_character_types(footballers)

    rewards = await repository.open_all_available_chests(
        db,
        user_id,
        start_rewards,
    )

    footballers_by_id = {
        footballer.id: footballer
        for footballer in footballers
    }
    return [
        (
            reward.chest_id,
            None,
            reward.character_type_id,
            footballers_by_id[reward.footballer_id],
        )
        for reward in sorted(rewards, key=lambda reward: reward.chest_id)
    ]
