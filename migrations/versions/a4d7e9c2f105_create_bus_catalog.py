"""create bus catalog

Revision ID: a4d7e9c2f105
Revises: f3c91a7e2b64
Create Date: 2026-11-04

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a4d7e9c2f105"
down_revision: Union[str, Sequence[str], None] = "f3c91a7e2b64"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INITIAL_BUSES = (
    {"id": 1, "code": "Bus_constructor_1", "name": "Автобус 1"},
    {"id": 2, "code": "Bus_constructor_2", "name": "Автобус 2"},
    {"id": 3, "code": "Bus_constructor_3", "name": "Автобус 3"},
    {"id": 4, "code": "Bus_constructor_4", "name": "Автобус 4"},
)


def upgrade() -> None:
    """Create the bus catalog and replace user bus codes with foreign keys."""

    op.create_table(
        "buses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    buses_table = sa.table(
        "buses",
        sa.column("id", sa.Integer()),
        sa.column("code", sa.String(length=50)),
        sa.column("name", sa.String(length=100)),
    )
    op.bulk_insert(buses_table, list(INITIAL_BUSES))

    op.add_column(
        "user_buses",
        sa.Column("bus_id", sa.Integer(), nullable=True),
    )
    op.execute(
        sa.text(
            """
            UPDATE user_buses
            SET bus_id = (
                SELECT buses.id
                FROM buses
                WHERE buses.code = user_buses.bus_type
            )
            """
        )
    )
    with op.batch_alter_table("user_buses") as batch_op:
        batch_op.alter_column(
            "bus_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
        batch_op.create_foreign_key(
            "fk_user_buses_bus_id_buses",
            "buses",
            ["bus_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        batch_op.drop_column("bus_type")


def downgrade() -> None:
    """Restore string bus codes on user bus selections."""

    op.add_column(
        "user_buses",
        sa.Column("bus_type", sa.String(length=50), nullable=True),
    )
    op.execute(
        sa.text(
            """
            UPDATE user_buses
            SET bus_type = (
                SELECT buses.code
                FROM buses
                WHERE buses.id = user_buses.bus_id
            )
            """
        )
    )
    with op.batch_alter_table("user_buses") as batch_op:
        batch_op.alter_column(
            "bus_type",
            existing_type=sa.String(length=50),
            nullable=False,
        )
        batch_op.drop_constraint(
            "fk_user_buses_bus_id_buses",
            type_="foreignkey",
        )
        batch_op.drop_column("bus_id")

    op.drop_table("buses")
