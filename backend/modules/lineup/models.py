from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Bus(Base):
    """A bus type available in the game catalog."""

    __tablename__ = "buses"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100))


class UserBus(Base):
    """The single bus currently configured by a game user."""

    __tablename__ = "user_buses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
    )
    bus_id: Mapped[int] = mapped_column(
        ForeignKey(
            "buses.id",
            ondelete="RESTRICT",
            name="fk_user_buses_bus_id_buses",
        ),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    bus: Mapped[Bus] = relationship()

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            name="uq_user_buses_user_id",
        ),
    )
