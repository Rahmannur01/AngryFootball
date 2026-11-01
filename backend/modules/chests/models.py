from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import (
    DateTime,
    Enum as SQLAlchemyEnum,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class ChestStatus(StrEnum):
    """Lifecycle states of a chest owned by a user."""

    AVAILABLE = "available"
    OPENED = "opened"


class UserChest(Base):
    """A concrete chest granted to a game user."""

    __tablename__ = "user_chests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
    )
    chest_type: Mapped[str] = mapped_column(String(50))
    status: Mapped[ChestStatus] = mapped_column(
        SQLAlchemyEnum(
            ChestStatus,
            name="chest_status",
            native_enum=False,
            create_constraint=True,
            values_callable=lambda enum_class: [
                status.value for status in enum_class
            ],
        ),
        default=ChestStatus.AVAILABLE,
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    opened_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
    )
    revealed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
    )

    reward: Mapped[ChestReward | None] = relationship(
        back_populates="chest",
        cascade="all, delete-orphan",
        passive_deletes=True,
        single_parent=True,
        uselist=False,
    )

    __table_args__ = (
        Index(
            "ix_user_chests_user_id_status",
            "user_id",
            "status",
        ),
    )


class ChestReward(Base):
    """A footballer generated when a particular chest is opened."""

    __tablename__ = "chest_rewards"

    id: Mapped[int] = mapped_column(primary_key=True)
    chest_id: Mapped[int] = mapped_column(
        ForeignKey("user_chests.id", ondelete="CASCADE"),
    )
    footballer_id: Mapped[int] = mapped_column(
        ForeignKey("footballers.id"),
        index=True,
    )
    character_type_id: Mapped[int | None] = mapped_column(default=None)
    chest: Mapped[UserChest] = relationship(
        back_populates="reward",
    )

    __table_args__ = (
        UniqueConstraint(
            "chest_id",
            name="uq_chest_rewards_chest_id",
        ),
    )
