"""add revealed timestamp to user chests

Revision ID: d4b6f13e8a21
Revises: 9e1b8a4c6d20
Create Date: 2026-10-31

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4b6f13e8a21"
down_revision: Union[str, Sequence[str], None] = "9e1b8a4c6d20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the time when a user saw a chest reward."""

    op.add_column(
        "user_chests",
        sa.Column(
            "revealed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove the reward reveal time."""

    op.drop_column("user_chests", "revealed_at")
