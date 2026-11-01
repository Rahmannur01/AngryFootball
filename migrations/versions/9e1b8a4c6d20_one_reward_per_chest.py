"""enforce one reward per chest

Revision ID: 9e1b8a4c6d20
Revises: c7da701a1f88
Create Date: 2026-10-31

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9e1b8a4c6d20"
down_revision: Union[str, Sequence[str], None] = "c7da701a1f88"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Make the chest-to-reward relationship one-to-one."""

    with op.batch_alter_table("chest_rewards") as batch_op:
        batch_op.drop_index("ix_chest_rewards_chest_id")
        batch_op.drop_constraint(
            "check_chest_reward_opening_order_positive",
            type_="check",
        )
        batch_op.drop_constraint(
            "uq_chest_reward_opening_order",
            type_="unique",
        )
        batch_op.drop_column("opening_order")
        batch_op.create_unique_constraint(
            "uq_chest_rewards_chest_id",
            ["chest_id"],
        )


def downgrade() -> None:
    """Restore support for several ordered rewards per chest."""

    with op.batch_alter_table("chest_rewards") as batch_op:
        batch_op.drop_constraint(
            "uq_chest_rewards_chest_id",
            type_="unique",
        )
        batch_op.add_column(
            sa.Column(
                "opening_order",
                sa.Integer(),
                nullable=False,
                server_default=sa.text("1"),
            )
        )
        batch_op.create_check_constraint(
            "check_chest_reward_opening_order_positive",
            "opening_order >= 1",
        )
        batch_op.create_unique_constraint(
            "uq_chest_reward_opening_order",
            ["chest_id", "opening_order"],
        )
        batch_op.create_index(
            "ix_chest_rewards_chest_id",
            ["chest_id"],
            unique=False,
        )

    with op.batch_alter_table("chest_rewards") as batch_op:
        batch_op.alter_column(
            "opening_order",
            server_default=None,
        )
