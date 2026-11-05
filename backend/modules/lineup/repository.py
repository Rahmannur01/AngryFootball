"""Database operations for user buses and footballer placement."""

from collections.abc import Mapping
from datetime import UTC, datetime

from sqlalchemy import case, func, select, update
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.lineup import rules
from backend.modules.lineup.models import Bus, UserBus
from backend.modules.team.models import UserFootballer


class LineupRepositoryError(RuntimeError):
    """Base error for lineup persistence operations."""


class UserBusRepositoryError(LineupRepositoryError):
    """Base error for user bus persistence operations."""


class InvalidUserBusDataError(UserBusRepositoryError):
    """Raised when a user bus cannot be persisted with the given data."""


class UserBusWriteError(UserBusRepositoryError):
    """Raised when the database cannot create or update a user bus."""


class UserBusReadError(UserBusRepositoryError):
    """Raised when the user's selected bus cannot be read."""


class BusNotFoundError(UserBusRepositoryError):
    """Raised when the requested bus does not exist in the catalog."""


class InvalidLineupDataError(LineupRepositoryError):
    """Raised when footballer placement data is invalid."""


class FootballerNotOwnedError(LineupRepositoryError):
    """Raised when a footballer does not belong to the user."""


class LineupWriteError(LineupRepositoryError):
    """Raised when footballer placements cannot be persisted."""


class LineupReadError(LineupRepositoryError):
    """Raised when footballer placements cannot be read."""


def _validate_user_id(user_id: int) -> None:
    if (
        isinstance(user_id, bool)
        or not isinstance(user_id, int)
        or user_id <= 0
    ):
        raise InvalidUserBusDataError(
            "user_id должен быть положительным целым числом"
        )


def _validate_bus_id(bus_id: int) -> None:
    if (
        isinstance(bus_id, bool)
        or not isinstance(bus_id, int)
        or bus_id <= 0
    ):
        raise InvalidUserBusDataError(
            "bus_id должен быть положительным целым числом"
        )


def _validate_lineup_user_id(user_id: int) -> None:
    if (
        isinstance(user_id, bool)
        or not isinstance(user_id, int)
        or user_id <= 0
    ):
        raise InvalidLineupDataError(
            "user_id должен быть положительным целым числом"
        )


def _validate_footballer_id(footballer_id: int) -> None:
    if (
        isinstance(footballer_id, bool)
        or not isinstance(footballer_id, int)
        or footballer_id <= 0
    ):
        raise InvalidLineupDataError(
            "footballer_id должен быть положительным целым числом"
        )


def _validate_slot_id(slot_id: int) -> None:
    if (
        isinstance(slot_id, bool)
        or not isinstance(slot_id, int)
        or not rules.MIN_SLOT_ID <= slot_id <= rules.MAX_SLOT_ID
    ):
        raise InvalidLineupDataError(
            "slot_id должен быть целым числом "
            f"от {rules.MIN_SLOT_ID} до {rules.MAX_SLOT_ID}"
        )


def _validate_lineup_slots(
    footballer_slots: Mapping[int, int],
) -> dict[int, int]:
    if not isinstance(footballer_slots, Mapping):
        raise InvalidLineupDataError(
            "footballer_slots должен быть словарём "
            "{footballer_id: slot_id}"
        )

    validated_slots = dict(footballer_slots)
    if len(validated_slots) > rules.MAX_LINEUP_SIZE:
        raise InvalidLineupDataError(
            "В автобусе может находиться не больше "
            f"{rules.MAX_LINEUP_SIZE} футболистов"
        )

    for footballer_id, slot_id in validated_slots.items():
        _validate_footballer_id(footballer_id)
        _validate_slot_id(slot_id)

    if len(set(validated_slots.values())) != len(validated_slots):
        raise InvalidLineupDataError(
            "Каждое место может занимать только один футболист"
        )

    return validated_slots


async def get_user_bus(
    db: AsyncSession,
    user_id: int,
) -> UserBus | None:
    """Return the user's selected bus, if it has been saved."""

    _validate_user_id(user_id)
    statement = select(UserBus).where(UserBus.user_id == user_id)

    try:
        return (await db.scalars(statement)).one_or_none()
    except SQLAlchemyError as error:
        await db.rollback()
        raise UserBusReadError(
            "Не удалось получить автобус пользователя"
        ) from error


async def count_user_lineup_slots(
    db: AsyncSession,
    user_id: int,
) -> int:
    """Return the number of occupied bus slots for a user."""

    _validate_lineup_user_id(user_id)
    statement = select(func.count(UserFootballer.id)).where(
        UserFootballer.user_id == user_id,
        UserFootballer.slot_id.is_not(None),
    )

    try:
        return (await db.scalar(statement)) or 0
    except SQLAlchemyError as error:
        await db.rollback()
        raise LineupReadError(
            "Не удалось получить готовность расстановки"
        ) from error


async def upsert_user_bus(
    db: AsyncSession,
    user_id: int,
    bus_id: int,
) -> UserBus:
    """Save a user's bus and clear slots when the selected bus changes."""

    _validate_user_id(user_id)
    _validate_bus_id(bus_id)
    now = datetime.now(UTC)

    try:
        bus_selection = (
            await db.execute(
                select(Bus.id, UserBus.bus_id)
                .outerjoin(
                    UserBus,
                    UserBus.user_id == user_id,
                )
                .where(Bus.id == bus_id)
            )
        ).one_or_none()
        if bus_selection is None:
            raise BusNotFoundError(
                f"Автобус с id={bus_id} не найден"
            )
        _, current_bus_id = bus_selection

        statement = (
            insert(UserBus)
            .values(
                user_id=user_id,
                bus_id=bus_id,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_update(
                index_elements=[UserBus.user_id],
                set_={
                    "bus_id": bus_id,
                    "updated_at": now,
                },
            )
            .returning(UserBus)
            .execution_options(populate_existing=True)
        )
        user_bus = (await db.scalars(statement)).one()

        if current_bus_id != bus_id:
            clear_slots_statement = (
                update(UserFootballer)
                .where(
                    UserFootballer.user_id == user_id,
                    UserFootballer.slot_id.is_not(None),
                )
                .values(slot_id=None)
                .execution_options(synchronize_session=False)
            )
            await db.execute(clear_slots_statement)

        await db.commit()
    except UserBusRepositoryError:
        await db.rollback()
        raise
    except SQLAlchemyError as error:
        await db.rollback()
        raise UserBusWriteError(
            "Не удалось сохранить автобус пользователя"
        ) from error

    return user_bus


async def replace_user_lineup_slots(
    db: AsyncSession,
    user_id: int,
    footballer_slots: Mapping[int, int],
) -> list[UserFootballer]:
    """Replace every occupied slot in a user's bus atomically.

    ``footballer_slots`` maps catalog footballer identifiers to bus slot
    identifiers. Footballers omitted from the mapping are removed from their
    current slots, but remain owned by the user.
    """

    _validate_lineup_user_id(user_id)
    validated_slots = _validate_lineup_slots(footballer_slots)

    clear_statement = (
        update(UserFootballer)
        .where(UserFootballer.user_id == user_id)
        .values(slot_id=None)
        .execution_options(synchronize_session=False)
    )

    try:
        await db.execute(clear_statement)

        if not validated_slots:
            await db.commit()
            return []

        footballer_ids = list(validated_slots)
        assign_statement = (
            update(UserFootballer)
            .where(
                UserFootballer.user_id == user_id,
                UserFootballer.footballer_id.in_(footballer_ids),
            )
            .values(
                slot_id=case(
                    validated_slots,
                    value=UserFootballer.footballer_id,
                )
            )
            .returning(UserFootballer)
            .execution_options(
                synchronize_session=False,
                populate_existing=True,
            )
        )
        assigned_footballers = list(
            (await db.scalars(assign_statement)).all()
        )
        assigned_by_id = {
            footballer.footballer_id: footballer
            for footballer in assigned_footballers
        }
        missing_ids = set(footballer_ids) - assigned_by_id.keys()
        if missing_ids:
            missing = ", ".join(
                str(footballer_id)
                for footballer_id in sorted(missing_ids)
            )
            raise FootballerNotOwnedError(
                "Пользователю не принадлежат футболисты с id: "
                f"{missing}"
            )

        await db.commit()
    except LineupRepositoryError:
        await db.rollback()
        raise
    except SQLAlchemyError as error:
        await db.rollback()
        raise LineupWriteError(
            "Не удалось сохранить расстановку футболистов"
        ) from error

    return [
        assigned_by_id[footballer_id]
        for footballer_id in footballer_ids
    ]


async def set_user_footballer_slot(
    db: AsyncSession,
    user_id: int,
    footballer_id: int,
    slot_id: int,
) -> UserFootballer:
    """Assign one owned footballer to a slot, replacing its occupant."""

    _validate_lineup_user_id(user_id)
    _validate_footballer_id(footballer_id)
    _validate_slot_id(slot_id)

    release_slot_statement = (
        update(UserFootballer)
        .where(
            UserFootballer.user_id == user_id,
            UserFootballer.slot_id == slot_id,
            UserFootballer.footballer_id != footballer_id,
        )
        .values(slot_id=None)
        .execution_options(synchronize_session=False)
    )
    assign_slot_statement = (
        update(UserFootballer)
        .where(
            UserFootballer.user_id == user_id,
            UserFootballer.footballer_id == footballer_id,
        )
        .values(slot_id=slot_id)
        .returning(UserFootballer)
        .execution_options(
            synchronize_session=False,
            populate_existing=True,
        )
    )

    try:
        await db.execute(release_slot_statement)
        footballer = (
            await db.scalars(assign_slot_statement)
        ).one_or_none()
        if footballer is None:
            raise FootballerNotOwnedError(
                "Пользователю не принадлежит футболист "
                f"с id={footballer_id}"
            )

        await db.commit()
    except LineupRepositoryError:
        await db.rollback()
        raise
    except SQLAlchemyError as error:
        await db.rollback()
        raise LineupWriteError(
            "Не удалось сохранить место футболиста"
        ) from error

    return footballer


async def clear_user_footballer_slot(
    db: AsyncSession,
    user_id: int,
    footballer_id: int,
) -> UserFootballer:
    """Remove one owned footballer from its bus slot."""

    _validate_lineup_user_id(user_id)
    _validate_footballer_id(footballer_id)
    statement = (
        update(UserFootballer)
        .where(
            UserFootballer.user_id == user_id,
            UserFootballer.footballer_id == footballer_id,
        )
        .values(slot_id=None)
        .returning(UserFootballer)
        .execution_options(
            synchronize_session=False,
            populate_existing=True,
        )
    )

    try:
        footballer = (await db.scalars(statement)).one_or_none()
        if footballer is None:
            raise FootballerNotOwnedError(
                "Пользователю не принадлежит футболист "
                f"с id={footballer_id}"
            )

        await db.commit()
    except LineupRepositoryError:
        await db.rollback()
        raise
    except SQLAlchemyError as error:
        await db.rollback()
        raise LineupWriteError(
            "Не удалось убрать футболиста из автобуса"
        ) from error

    return footballer


async def clear_user_lineup_slots(
    db: AsyncSession,
    user_id: int,
) -> int:
    """Remove every footballer from the user's bus slots."""

    _validate_lineup_user_id(user_id)
    statement = (
        update(UserFootballer)
        .where(
            UserFootballer.user_id == user_id,
            UserFootballer.slot_id.is_not(None),
        )
        .values(slot_id=None)
        .returning(UserFootballer.footballer_id)
        .execution_options(synchronize_session=False)
    )

    try:
        cleared_footballer_ids = list(
            (await db.scalars(statement)).all()
        )
        await db.commit()
    except SQLAlchemyError as error:
        await db.rollback()
        raise LineupWriteError(
            "Не удалось очистить расстановку футболистов"
        ) from error

    return len(cleared_footballer_ids)
