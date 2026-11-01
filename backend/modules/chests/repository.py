from datetime import UTC, datetime
from typing import Sequence

from sqlalchemy import func, insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.auth.models import UserDB
from backend.modules.catalog.models import Footballer
from backend.modules.chests import rules
from backend.modules.chests.models import ChestReward, ChestStatus, UserChest


class ChestRepositoryError(RuntimeError):
    """Base error for invalid chest persistence operations."""


class ChestOwnerNotFoundError(ChestRepositoryError):
    """Raised when a chest owner does not exist."""


class StarterChestsAlreadyExistError(ChestRepositoryError):
    """Raised when a user has already received starter chests."""


class InvalidStarterRewardsError(ChestRepositoryError):
    """Raised when starter rewards do not exist in the catalog."""


class InvalidStarterChestStateError(ChestRepositoryError):
    """Raised when the starter chest set is incomplete or inconsistent."""


class InvalidChestRevealStateError(ChestRepositoryError):
    """Raised when a chest cannot be marked as revealed."""


def _validate_positive_id(value: int, field_name: str) -> None:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f"{field_name} должен быть положительным числом")


def _validate_start_rewards(
    rewards: Sequence[tuple[int, int | None]],
) -> list[tuple[int, int | None]]:
    validated_rewards = list(rewards)

    if len(validated_rewards) != rules.START_PACK_SIZE:
        raise ValueError(
            "Стартовый набор должен содержать "
            f"ровно {rules.START_PACK_SIZE} футболистов"
        )

    for footballer_id, character_type_id in validated_rewards:
        _validate_positive_id(footballer_id, "footballer_id")
        if character_type_id is not None:
            _validate_positive_id(character_type_id, "character_type_id")
            if character_type_id not in rules.CHARACTER_TYPE_IDS:
                raise ValueError(
                    f"Неизвестный character_type_id={character_type_id}"
                )

    footballer_ids = [
        footballer_id
        for footballer_id, _ in validated_rewards
    ]
    if len(set(footballer_ids)) != len(footballer_ids):
        raise ValueError(
            "Стартовый набор не должен содержать повторяющихся футболистов"
        )

    return validated_rewards


def _validate_chest_ids(chest_ids: Sequence[int]) -> list[int]:
    validated_ids = list(chest_ids)

    if not validated_ids:
        raise ValueError("Нужно передать хотя бы один chest_id")

    for chest_id in validated_ids:
        _validate_positive_id(chest_id, "chest_id")

    if len(set(validated_ids)) != len(validated_ids):
        raise ValueError("Список chest_id не должен содержать повторения")

    return validated_ids


async def create_start_chests(
    db: AsyncSession,
    user_id: int,
) -> list[UserChest]:
    """Create 11 empty starter chests for a user."""

    _validate_positive_id(user_id, "user_id")

    precheck_statement = select(
        select(UserDB.id)
        .where(UserDB.id == user_id)
        .exists()
        .label("user_exists"),
        select(UserChest.id)
        .where(
            UserChest.user_id == user_id,
            UserChest.chest_type == "starter",
        )
        .exists()
        .label("starter_chests_exist"),
    )

    granted_at = datetime.now(UTC)
    chests_statement = (
        insert(UserChest)
        .values(
            [
                {
                    "user_id": user_id,
                    "chest_type": "starter",
                    "status": ChestStatus.AVAILABLE,
                    "granted_at": granted_at,
                }
                for _ in range(rules.START_PACK_SIZE)
            ]
        )
        .returning(UserChest)
    )

    try:
        precheck = (await db.execute(precheck_statement)).one()

        if not precheck.user_exists:
            raise ChestOwnerNotFoundError(
                f"Пользователь с id={user_id} не найден"
            )
        if precheck.starter_chests_exist:
            raise StarterChestsAlreadyExistError(
                "Стартовые сундуки уже были выданы пользователю"
            )
        chests = list((await db.scalars(chests_statement)).all())
        if len(chests) != rules.START_PACK_SIZE:
            raise ChestRepositoryError(
                "Не удалось создать полный набор стартовых сундуков"
            )

        await db.commit()
    except (ChestRepositoryError, SQLAlchemyError):
        await db.rollback()
        raise

    return chests


async def get_user_chests(
    db: AsyncSession,
    user_id: int,
) -> list[UserChest]:
    """Return every chest owned by a user without exposing rewards."""

    _validate_positive_id(user_id, "user_id")
    return list(
        (
            await db.scalars(
                select(UserChest)
                .where(UserChest.user_id == user_id)
                .order_by(UserChest.id)
            )
        ).all()
    )


async def get_user_start_chests(
    db: AsyncSession,
    user_id: int,
) -> list[UserChest]:
    """Return every starter chest owned by a user."""

    _validate_positive_id(user_id, "user_id")
    return list(
        (
            await db.scalars(
                select(UserChest)
                .where(
                    UserChest.user_id == user_id,
                    UserChest.chest_type == "starter",
                )
                .order_by(UserChest.id)
            )
        ).all()
    )


async def get_start_chest_rewards(
    db: AsyncSession,
    user_id: int,
) -> list[tuple[int, datetime | None, int | None, Footballer]]:
    """Return the footballers already assigned to starter chests."""

    _validate_positive_id(user_id, "user_id")
    statement = (
        select(
            UserChest.id,
            UserChest.revealed_at,
            ChestReward.character_type_id,
            Footballer,
        )
        .join(ChestReward, ChestReward.chest_id == UserChest.id)
        .join(Footballer, Footballer.id == ChestReward.footballer_id)
        .where(
            UserChest.user_id == user_id,
            UserChest.chest_type == "starter",
            UserChest.status == ChestStatus.OPENED,
        )
        .order_by(UserChest.id)
    )
    rows = (await db.execute(statement)).all()
    return [
        (chest_id, revealed_at, character_type_id, footballer)
        for chest_id, revealed_at, character_type_id, footballer in rows
    ]


async def mark_chests_as_revealed(
    db: AsyncSession,
    user_id: int,
    chest_ids: Sequence[int],
) -> list[UserChest]:
    """Mark opened user chests as revealed in one idempotent update."""

    _validate_positive_id(user_id, "user_id")
    validated_chest_ids = _validate_chest_ids(chest_ids)
    revealed_at = datetime.now(UTC)

    reward_exists = (
        select(ChestReward.id)
        .where(ChestReward.chest_id == UserChest.id)
        .exists()
    )
    reveal_statement = (
        update(UserChest)
        .where(
            UserChest.id.in_(validated_chest_ids),
            UserChest.user_id == user_id,
            UserChest.status == ChestStatus.OPENED,
            reward_exists,
        )
        .values(
            revealed_at=func.coalesce(
                UserChest.revealed_at,
                revealed_at,
            )
        )
        .returning(UserChest)
        .execution_options(synchronize_session=False)
    )

    try:
        revealed_chests = list(
            (await db.scalars(reveal_statement)).all()
        )

        if len(revealed_chests) != len(validated_chest_ids):
            raise InvalidChestRevealStateError(
                "Некоторые сундуки не найдены, не принадлежат пользователю "
                "или ещё не открыты"
            )

        await db.commit()
    except (ChestRepositoryError, SQLAlchemyError):
        await db.rollback()
        raise

    revealed_by_id = {chest.id: chest for chest in revealed_chests}
    return [revealed_by_id[chest_id] for chest_id in validated_chest_ids]


async def open_all_available_chests(
    db: AsyncSession,
    user_id: int,
    start_rewards: Sequence[tuple[int, int | None]],
) -> list[ChestReward]:
    """Assign rewards and atomically open all 11 starter chests."""

    _validate_positive_id(user_id, "user_id")
    validated_rewards = _validate_start_rewards(start_rewards)
    footballer_ids = [
        footballer_id
        for footballer_id, _ in validated_rewards
    ]
    opened_at = datetime.now(UTC)

    footballers_count = (
        select(func.count(Footballer.id))
        .where(Footballer.id.in_(footballer_ids))
        .scalar_subquery()
    )
    reward_exists = (
        select(ChestReward.id)
        .where(ChestReward.chest_id == UserChest.id)
        .exists()
    )
    available_chests_statement = (
        select(
            UserChest.id,
            reward_exists.label("reward_exists"),
            footballers_count.label("footballers_count"),
        )
        .where(
            UserChest.user_id == user_id,
            UserChest.chest_type == "starter",
            UserChest.status == ChestStatus.AVAILABLE,
        )
        .order_by(UserChest.id)
    )

    try:
        available_chests = list(
            (await db.execute(available_chests_statement)).all()
        )

        if not available_chests:
            await db.commit()
            return []

        if len(available_chests) != rules.START_PACK_SIZE:
            raise InvalidStarterChestStateError(
                "Должно быть ровно "
                f"{rules.START_PACK_SIZE} доступных стартовых сундуков"
            )
        if any(chest.reward_exists for chest in available_chests):
            raise InvalidStarterChestStateError(
                "У доступного сундука уже существует награда"
            )
        if available_chests[0].footballers_count != rules.START_PACK_SIZE:
            raise InvalidStarterRewardsError(
                "Не все футболисты стартового набора найдены в каталоге"
            )

        chest_ids = [chest.id for chest in available_chests]
        rewards_statement = (
            insert(ChestReward)
            .values(
                [
                    {
                        "chest_id": chest_id,
                        "footballer_id": footballer_id,
                        "character_type_id": character_type_id,
                    }
                    for chest_id, (footballer_id, character_type_id) in zip(
                        chest_ids,
                        validated_rewards,
                        strict=True,
                    )
                ]
            )
            .returning(ChestReward)
        )
        rewards = list((await db.scalars(rewards_statement)).all())

        if len(rewards) != rules.START_PACK_SIZE:
            raise ChestRepositoryError(
                "Не удалось сохранить все награды стартовых сундуков"
            )

        open_statement = (
            update(UserChest)
            .where(
                UserChest.id.in_(chest_ids),
                UserChest.status == ChestStatus.AVAILABLE,
            )
            .values(
                status=ChestStatus.OPENED,
                opened_at=opened_at,
            )
            .returning(UserChest.id)
            .execution_options(synchronize_session=False)
        )
        opened_chest_ids = list((await db.scalars(open_statement)).all())

        if set(opened_chest_ids) != set(chest_ids):
            raise InvalidStarterChestStateError(
                "Не удалось открыть все стартовые сундуки"
            )

        await db.commit()
    except (ChestRepositoryError, SQLAlchemyError):
        await db.rollback()
        raise

    return rewards
