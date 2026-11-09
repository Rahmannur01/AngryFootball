"""add email verification challenges

Revision ID: b7e1c4a9f203
Revises: 8c6f0a2d4b19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7e1c4a9f203"
down_revision: Union[str, Sequence[str], None] = "8c6f0a2d4b19"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_verification_challenges",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("code_digest", sa.String(length=64), nullable=False),
        sa.Column("failed_attempts", sa.Integer(), nullable=False),
        sa.Column("send_count", sa.Integer(), nullable=False),
        sa.Column("window_started_at", sa.DateTime(), nullable=False),
        sa.Column("last_sent_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_email_verification_challenges_email",
        "email_verification_challenges",
        ["email"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_email_verification_challenges_email",
        table_name="email_verification_challenges",
    )
    op.drop_table("email_verification_challenges")
