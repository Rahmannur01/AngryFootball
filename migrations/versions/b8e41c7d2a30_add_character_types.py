"""add character types

Revision ID: b8e41c7d2a30
Revises: 6a2f4c9d81e7
Create Date: 2026-11-01

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8e41c7d2a30"
down_revision: Union[str, Sequence[str], None] = "6a2f4c9d81e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CHARACTER_TYPE_SQL = """
CASE footballers.position
    WHEN 'Defender' THEN
        CASE footballers.id % 4
            WHEN 0 THEN 1
            WHEN 1 THEN 2
            WHEN 2 THEN 5
            ELSE 6
        END
    WHEN 'Midfielder' THEN
        CASE footballers.id % 4
            WHEN 0 THEN 2
            WHEN 1 THEN 3
            WHEN 2 THEN 4
            ELSE 7
        END
    WHEN 'Attacker' THEN
        CASE footballers.id % 4
            WHEN 0 THEN 1
            WHEN 1 THEN 3
            WHEN 2 THEN 4
            ELSE 7
        END
    ELSE NULL
END
"""


def upgrade() -> None:
    """Persist gameplay character types for rewards and owned players."""

    op.add_column(
        "chest_rewards",
        sa.Column("character_type_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "user_footballers",
        sa.Column("character_type_id", sa.Integer(), nullable=True),
    )

    op.execute(
        sa.text(
            f"""
            UPDATE chest_rewards
            SET character_type_id = (
                SELECT {CHARACTER_TYPE_SQL}
                FROM footballers
                WHERE footballers.id = chest_rewards.footballer_id
            )
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            UPDATE user_footballers
            SET character_type_id = COALESCE(
                (
                    SELECT chest_rewards.character_type_id
                    FROM chest_rewards
                    WHERE chest_rewards.chest_id =
                        user_footballers.source_chest_id
                ),
                (
                    SELECT {CHARACTER_TYPE_SQL}
                    FROM footballers
                    WHERE footballers.id = user_footballers.footballer_id
                )
            )
            """
        )
    )


def downgrade() -> None:
    """Remove persisted gameplay character types."""

    op.drop_column("user_footballers", "character_type_id")
    op.drop_column("chest_rewards", "character_type_id")
