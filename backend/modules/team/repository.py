"""Database access for footballers owned by game users."""

from datetime import UTC, datetime
from typing import Sequence

from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from backend.modules.auth.models import UserDB
from backend.modules.chests.models import ChestReward, ChestStatus, UserChest
from backend.modules.team.models import UserFootballer


class TeamRepositoryError(RuntimeError):
    """Base error for team persistence operations."""


class InvalidTeamOwnerIdError(TeamRepositoryError):
    """Raised when a user identifier has an invalid value."""


class TeamOwnerNotFoundError(TeamRepositoryError):
    """Raised when the requested team owner does not exist."""


class TeamReadError(TeamRepositoryError):
    """Raised when owned footballers cannot be read from the database."""


class InvalidTeamAcquisitionError(TeamRepositoryError):
    """Raised when chest rewards cannot be added to a user's team."""


class FootballerAlreadyOwnedError(InvalidTeamAcquisitionError):
    """Raised when another chest already granted the same footballer."""


class TeamWriteError(TeamRepositoryError):
    """Raised when an owned footballer cannot be persisted."""


def _validate_user_id(user_id: int) -> None:
    if (
        isinstance(user_id, bool)
        or not isinstance(user_id, int)
        or user_id <= 0
    ):
        raise InvalidTeamOwnerIdError(
            "user_id должен быть положительным целым числом"
        )


def _validate_chest_ids(chest_ids: Sequence[int]) -> list[int]:
    validated_ids = list(chest_ids)

    if not validated_ids:
        raise InvalidTeamAcquisitionError(
            "Нужно передать хотя бы один chest_id"
        )

    for chest_id in validated_ids:
        if (
            isinstance(chest_id, bool)
            or not isinstance(chest_id, int)
            or chest_id <= 0
        ):
            raise InvalidTeamAcquisitionError(
                "Каждый chest_id должен быть положительным целым числом"
            )

    if len(set(validated_ids)) != len(validated_ids):
        raise InvalidTeamAcquisitionError(
            "Список chest_id не должен содержать повторения"
        )

    return validated_ids


async def get_user_footballers(
    db: AsyncSession,
    user_id: int,
) -> list[UserFootballer]:
    """Return all footballers owned by a user in acquisition order."""

    _validate_user_id(user_id)
    statement = (
        select(UserDB.id, UserFootballer)
        .outerjoin(
            UserFootballer,
            UserFootballer.user_id == UserDB.id,
        )
        .options(joinedload(UserFootballer.footballer))
        .where(UserDB.id == user_id)
        .order_by(
            UserFootballer.acquired_at,
            UserFootballer.id,
        )
    )

    try:
        rows = (await db.execute(statement)).all()
    except SQLAlchemyError as error:
        await db.rollback()
        raise TeamReadError(
            "Не удалось получить футболистов пользователя"
        ) from error

    if not rows:
        raise TeamOwnerNotFoundError(
            f"Пользователь с id={user_id} не найден"
        )

    return [
        user_footballer
        for _, user_footballer in rows
        if user_footballer is not None
    ]


async def acquire_chest_footballers(
    db: AsyncSession,
    user_id: int,
    chest_ids: Sequence[int],
) -> list[UserChest]:
    """Atomically reveal chest rewards and add them to a user's team."""

    _validate_user_id(user_id)
    validated_chest_ids = _validate_chest_ids(chest_ids)
    rewards_statement = (
        select(UserChest, ChestReward)
        .join(ChestReward, ChestReward.chest_id == UserChest.id)
        .where(
            UserChest.id.in_(validated_chest_ids),
            UserChest.user_id == user_id,
            UserChest.status == ChestStatus.OPENED,
        )
        .order_by(UserChest.id)
    )

    try:
        reward_rows = list((await db.execute(rewards_statement)).all())
        if len(reward_rows) != len(validated_chest_ids):
            raise InvalidTeamAcquisitionError(
                "Некоторые сундуки не найдены, не принадлежат пользователю, "
                "не открыты или не содержат награду"
            )

        rewards_by_chest_id = {
            chest.id: (chest, reward)
            for chest, reward in reward_rows
        }
        ordered_rewards = [
            rewards_by_chest_id[chest_id]
            for chest_id in validated_chest_ids
        ]
        footballer_ids = [
            reward.footballer_id
            for _, reward in ordered_rewards
        ]
        existing_statement = select(UserFootballer).where(
            UserFootballer.user_id == user_id,
            or_(
                UserFootballer.source_chest_id.in_(validated_chest_ids),
                UserFootballer.footballer_id.in_(footballer_ids),
            ),
        )
        existing_ownerships = list(
            (await db.scalars(existing_statement)).all()
        )
        ownership_by_chest_id = {
            ownership.source_chest_id: ownership
            for ownership in existing_ownerships
            if ownership.source_chest_id is not None
        }
        ownership_by_footballer_id = {
            ownership.footballer_id: ownership
            for ownership in existing_ownerships
        }
        acquired_at = datetime.now(UTC)
        new_ownerships: list[UserFootballer] = []

        for chest, reward in ordered_rewards:
            chest_ownership = ownership_by_chest_id.get(chest.id)
            if chest_ownership is not None:
                if chest_ownership.footballer_id != reward.footballer_id:
                    raise InvalidTeamAcquisitionError(
                        f"Сундук с id={chest.id} уже связан с другой наградой"
                    )
                if (
                    chest_ownership.character_type_id
                    != reward.character_type_id
                ):
                    raise InvalidTeamAcquisitionError(
                        f"Тип персонажа для сундука с id={chest.id} изменился"
                    )
            else:
                footballer_ownership = ownership_by_footballer_id.get(
                    reward.footballer_id
                )
                if footballer_ownership is not None:
                    raise FootballerAlreadyOwnedError(
                        "Пользователь уже получил футболиста "
                        f"с id={reward.footballer_id} из другого сундука"
                    )

                ownership = UserFootballer(
                    user_id=user_id,
                    footballer_id=reward.footballer_id,
                    source_chest_id=chest.id,
                    character_type_id=reward.character_type_id,
                    acquired_at=acquired_at,
                )
                new_ownerships.append(ownership)
                ownership_by_chest_id[chest.id] = ownership
                ownership_by_footballer_id[reward.footballer_id] = ownership

            if chest.revealed_at is None:
                chest.revealed_at = acquired_at

        db.add_all(new_ownerships)
        await db.commit()
    except TeamRepositoryError:
        await db.rollback()
        raise
    except SQLAlchemyError as error:
        await db.rollback()
        raise TeamWriteError(
            "Не удалось сохранить полученных футболистов"
        ) from error

    return [chest for chest, _ in ordered_rewards]
