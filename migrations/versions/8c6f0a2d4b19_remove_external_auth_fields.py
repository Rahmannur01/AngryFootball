"""remove external authentication fields

Revision ID: 8c6f0a2d4b19
Revises: 71d2dfb9d9b7
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8c6f0a2d4b19"
down_revision: Union[str, Sequence[str], None] = "71d2dfb9d9b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index("ix_users_google_id")
        batch_op.drop_index("ix_users_telegram_id")
        batch_op.drop_column("google_id")
        batch_op.drop_column("telegram_id")
        batch_op.drop_column("provider")


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("google_id", sa.String(length=255), nullable=True)
        )
        batch_op.add_column(
            sa.Column("telegram_id", sa.BigInteger(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("provider", sa.String(length=50), nullable=True)
        )
        batch_op.create_index(
            "ix_users_google_id", ["google_id"], unique=True
        )
        batch_op.create_index(
            "ix_users_telegram_id", ["telegram_id"], unique=True
        )
