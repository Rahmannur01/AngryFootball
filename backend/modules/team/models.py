from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base
from backend.modules.catalog.models import Footballer
from backend.modules.chests.models import UserChest


class UserFootballer(Base):
    """A footballer permanently owned by a game user."""

    __tablename__ = "user_footballers"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
    )
    footballer_id: Mapped[int] = mapped_column(
        ForeignKey("footballers.id"),
    )
    source_chest_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_chests.id", ondelete="SET NULL"),
        default=None,
    )
    character_type_id: Mapped[int | None] = mapped_column(default=None)
    acquired_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )

    footballer: Mapped[Footballer] = relationship()
    source_chest: Mapped[UserChest | None] = relationship()

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "footballer_id",
            name="uq_user_footballers_user_id_footballer_id",
        ),
        UniqueConstraint(
            "source_chest_id",
            name="uq_user_footballers_source_chest_id",
        ),
        Index(
            "ix_user_footballers_user_id_acquired_at",
            "user_id",
            "acquired_at",
        ),
    )
