from datetime import UTC, datetime
from typing import Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class UserDB(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
    )
    email: Mapped[Optional[str]] = mapped_column(unique=True, nullable=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    disabled: Mapped[bool] = mapped_column(default=False)
    created_date: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC).replace(tzinfo=None)
    )

    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)


class EmailVerificationChallenge(Base):
    __tablename__ = "email_verification_challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    code_digest: Mapped[str] = mapped_column(String(64))
    failed_attempts: Mapped[int] = mapped_column(default=0)
    send_count: Mapped[int] = mapped_column(default=1)
    window_started_at: Mapped[datetime]
    last_sent_at: Mapped[datetime]
    expires_at: Mapped[datetime]
    verified_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    consumed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC).replace(tzinfo=None)
    )
