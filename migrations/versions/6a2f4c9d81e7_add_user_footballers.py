"""add user footballers

Revision ID: 6a2f4c9d81e7
Revises: d4b6f13e8a21
Create Date: 2026-11-01

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6a2f4c9d81e7"
down_revision: Union[str, Sequence[str], None] = "d4b6f13e8a21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create persistent user footballer ownership and backfill rewards."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if "user_footballers" not in inspector.get_table_names():
        op.create_table(
            "user_footballers",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("footballer_id", sa.Integer(), nullable=False),
            sa.Column("source_chest_id", sa.Integer(), nullable=True),
            sa.Column("acquired_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(
                ["footballer_id"],
                ["footballers.id"],
            ),
            sa.ForeignKeyConstraint(
                ["source_chest_id"],
                ["user_chests.id"],
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "source_chest_id",
                name="uq_user_footballers_source_chest_id",
            ),
            sa.UniqueConstraint(
                "user_id",
                "footballer_id",
                name="uq_user_footballers_user_id_footballer_id",
            ),
        )
        op.create_index(
            "ix_user_footballers_user_id_acquired_at",
            "user_footballers",
            ["user_id", "acquired_at"],
            unique=False,
        )

    op.execute(
        sa.text(
            """
            INSERT INTO user_footballers (
                user_id,
                footballer_id,
                source_chest_id,
                acquired_at
            )
            SELECT
                user_chests.user_id,
                chest_rewards.footballer_id,
                user_chests.id,
                COALESCE(
                    user_chests.revealed_at,
                    user_chests.opened_at,
                    user_chests.granted_at
                )
            FROM user_chests
            JOIN chest_rewards
                ON chest_rewards.chest_id = user_chests.id
            LEFT JOIN user_footballers
                ON user_footballers.source_chest_id = user_chests.id
            WHERE
                user_chests.revealed_at IS NOT NULL
                AND user_footballers.id IS NULL
            """
        )
    )


def downgrade() -> None:
    """Remove persistent user footballer ownership."""

    op.drop_index(
        "ix_user_footballers_user_id_acquired_at",
        table_name="user_footballers",
    )
    op.drop_table("user_footballers")
