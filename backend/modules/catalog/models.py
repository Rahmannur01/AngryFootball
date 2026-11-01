from __future__ import annotations

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from backend.database import Base


class Club(Base):
    """A real football club from the shared football catalog."""

    __tablename__ = "clubs"

    id: Mapped[int] = mapped_column(primary_key=True)
    api_football_id: Mapped[int] = mapped_column(
        unique=True,
        index=True,
    )
    name_en: Mapped[str] = mapped_column(String(150))
    name_ru: Mapped[str | None] = mapped_column(String(150))
    league: Mapped[str | None] = mapped_column(String(150))

    footballers: Mapped[list[Footballer]] = relationship(
        back_populates="club",
    )


class Footballer(Base):
    """A real footballer shared by every game user."""

    __tablename__ = "footballers"

    id: Mapped[int] = mapped_column(primary_key=True)
    api_football_id: Mapped[int] = mapped_column(
        unique=True,
        index=True,
    )
    name_en: Mapped[str] = mapped_column(String(150))
    name_ru: Mapped[str | None] = mapped_column(String(150))
    age: Mapped[int | None]
    position: Mapped[str | None] = mapped_column(String(30))
    number: Mapped[int | None]
    photo: Mapped[str | None] = mapped_column(String(500))

    club_id: Mapped[int | None] = mapped_column(
        ForeignKey("clubs.id"),
        index=True,
    )
    club: Mapped[Club | None] = relationship(
        back_populates="footballers",
    )

    __table_args__ = (
        CheckConstraint(
            "age >= 15 AND age <= 50",
            name="check_footballer_age_range",
        ),
        CheckConstraint(
            "number >= 0 AND number <= 99",
            name="check_footballer_number_range",
        ),
    )

    @validates("age")
    def validate_age(self, _key: str, value: int | None) -> int | None:
        if value is not None:
            if isinstance(value, bool) or not isinstance(value, int):
                raise ValueError(
                    "Возраст должен быть целым числом, "
                    f"получено {type(value).__name__}"
                )
            if not 15 <= value <= 50:
                raise ValueError(
                    "Возраст футболиста должен быть от 15 до 50 лет, "
                    f"получено {value}"
                )
        return value

    @validates("number")
    def validate_number(
        self,
        _key: str,
        value: int | None,
    ) -> int | None:
        if value is not None:
            if isinstance(value, bool) or not isinstance(value, int):
                raise ValueError(
                    "Номер должен быть целым числом, "
                    f"получено {type(value).__name__}"
                )
            if not 0 <= value <= 99:
                raise ValueError(
                    "Номер футболиста должен быть от 0 до 99, "
                    f"получено {value}"
                )
        return value
