"""Database operations for buses owned by game users."""

from datetime import UTC, datetime

from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.lineup import rules
from backend.modules.lineup.models import UserBus


class UserBusRepositoryError(RuntimeError):
    """Base error for user bus persistence operations."""


class InvalidUserBusDataError(UserBusRepositoryError):
    """Raised when a user bus cannot be persisted with the given data."""


class UserBusWriteError(UserBusRepositoryError):
    """Raised when the database cannot create or update a user bus."""


def _validate_user_id(user_id: int) -> None:
    if (
        isinstance(user_id, bool)
        or not isinstance(user_id, int)
        or user_id <= 0
    ):
        raise InvalidUserBusDataError(
            "user_id должен быть положительным целым числом"
        )


def _validate_bus_type(bus_type: str) -> str:
    if not isinstance(bus_type, str):
        raise InvalidUserBusDataError("bus_type должен быть строкой")

    normalized_bus_type = bus_type.strip()
    if normalized_bus_type not in rules.BUS_TYPES:
        raise InvalidUserBusDataError(
            f"Неизвестный тип автобуса: {normalized_bus_type!r}"
        )

    return normalized_bus_type


async def upsert_user_bus(
    db: AsyncSession,
    user_id: int,
    bus_type: str,
) -> UserBus:
    """Create a user's bus or atomically update its type."""

    _validate_user_id(user_id)
    validated_bus_type = _validate_bus_type(bus_type)
    now = datetime.now(UTC)

    statement = (
        insert(UserBus)
        .values(
            user_id=user_id,
            bus_type=validated_bus_type,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_update(
            index_elements=[UserBus.user_id],
            set_={
                "bus_type": validated_bus_type,
                "updated_at": now,
            },
        )
        .returning(UserBus)
        .execution_options(populate_existing=True)
    )

    try:
        user_bus = (await db.scalars(statement)).one()
        await db.commit()
    except SQLAlchemyError as error:
        await db.rollback()
        raise UserBusWriteError(
            "Не удалось сохранить автобус пользователя"
        ) from error

    return user_bus
