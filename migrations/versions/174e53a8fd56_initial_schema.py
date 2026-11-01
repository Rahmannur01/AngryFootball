"""initial schema

Revision ID: 174e53a8fd56
Revises: 
Create Date: 2026-10-30 22:21:25.023959

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '174e53a8fd56'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "clubs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("api_football_id", sa.Integer(), nullable=False),
        sa.Column("name_en", sa.String(length=150), nullable=False),
        sa.Column("name_ru", sa.String(length=150), nullable=True),
        sa.Column("league", sa.String(length=150), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_clubs_api_football_id",
        "clubs",
        ["api_football_id"],
        unique=True,
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("disabled", sa.Boolean(), nullable=False),
        sa.Column("created_date", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
    )

    op.create_table(
        "footballers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("api_football_id", sa.Integer(), nullable=False),
        sa.Column("name_en", sa.String(length=150), nullable=False),
        sa.Column("name_ru", sa.String(length=150), nullable=True),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("position", sa.String(length=30), nullable=True),
        sa.Column("number", sa.Integer(), nullable=True),
        sa.Column("photo", sa.String(length=500), nullable=True),
        sa.Column("club_id", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "age >= 15 AND age <= 50",
            name="check_footballer_age_range",
        ),
        sa.CheckConstraint(
            "number >= 0 AND number <= 99",
            name="check_footballer_number_range",
        ),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_footballers_api_football_id",
        "footballers",
        ["api_football_id"],
        unique=True,
    )
    op.create_index(
        "ix_footballers_club_id",
        "footballers",
        ["club_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "ix_footballers_club_id",
        table_name="footballers",
    )
    op.drop_index(
        "ix_footballers_api_football_id",
        table_name="footballers",
    )
    op.drop_table("footballers")

    op.drop_table("users")

    op.drop_index(
        "ix_clubs_api_football_id",
        table_name="clubs",
    )
    op.drop_table("clubs")
