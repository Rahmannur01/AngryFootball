"""add user bus and lineup slots

Revision ID: f3c91a7e2b64
Revises: b8e41c7d2a30
Create Date: 2026-11-03

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3c91a7e2b64"
down_revision: Union[str, Sequence[str], None] = "b8e41c7d2a30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _create_user_buses_table() -> None:
    op.create_table(
        "user_buses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("bus_type", sa.String(length=50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            name="uq_user_buses_user_id",
        ),
    )


def _normalize_existing_user_buses(inspector: sa.Inspector) -> None:
    """Bring a table previously created by ORM create_all to this revision."""

    columns = {
        column["name"]: column
        for column in inspector.get_columns("user_buses")
    }
    bus_type = columns["bus_type"]["type"]
    bus_type_length = getattr(bus_type, "length", None)
    check_constraints = {
        constraint["name"]
        for constraint in inspector.get_check_constraints("user_buses")
        if constraint["name"] is not None
    }
    unique_constraints = {
        constraint["name"]
        for constraint in inspector.get_unique_constraints("user_buses")
        if constraint["name"] is not None
    }

    old_type_check = "user_bus_type" in check_constraints
    has_named_user_unique = (
        "uq_user_buses_user_id" in unique_constraints
    )
    if (
        bus_type_length == 50
        and not old_type_check
        and has_named_user_unique
    ):
        return

    op.rename_table("user_buses", "_user_buses_legacy")
    _create_user_buses_table()
    op.execute(
        sa.text(
            """
            INSERT INTO user_buses (
                id,
                user_id,
                bus_type,
                created_at,
                updated_at
            )
            SELECT
                id,
                user_id,
                bus_type,
                created_at,
                updated_at
            FROM _user_buses_legacy
            """
        )
    )
    op.drop_table("_user_buses_legacy")


def upgrade() -> None:
    """Create user buses and allow owned footballers to occupy bus slots."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if "user_buses" not in inspector.get_table_names():
        _create_user_buses_table()
    else:
        _normalize_existing_user_buses(inspector)

    inspector = sa.inspect(connection)
    footballer_columns = {
        column["name"]
        for column in inspector.get_columns("user_footballers")
    }
    unique_constraints = {
        tuple(constraint["column_names"])
        for constraint in inspector.get_unique_constraints(
            "user_footballers"
        )
    }
    check_constraints = {
        constraint["name"]
        for constraint in inspector.get_check_constraints(
            "user_footballers"
        )
        if constraint["name"] is not None
    }

    needs_slot_column = "slot_id" not in footballer_columns
    needs_slot_unique = (
        "user_id",
        "slot_id",
    ) not in unique_constraints
    needs_slot_check = (
        "ck_user_footballers_slot_id_range" not in check_constraints
    )

    if needs_slot_column or needs_slot_unique or needs_slot_check:
        with op.batch_alter_table("user_footballers") as batch_op:
            if needs_slot_column:
                batch_op.add_column(
                    sa.Column("slot_id", sa.Integer(), nullable=True)
                )
            if needs_slot_unique:
                batch_op.create_unique_constraint(
                    "uq_user_footballers_user_id_slot_id",
                    ["user_id", "slot_id"],
                )
            if needs_slot_check:
                batch_op.create_check_constraint(
                    "ck_user_footballers_slot_id_range",
                    "slot_id IS NULL OR slot_id BETWEEN 1 AND 10",
                )


def downgrade() -> None:
    """Remove persisted user buses and bus-slot assignments."""

    with op.batch_alter_table("user_footballers") as batch_op:
        batch_op.drop_constraint(
            "ck_user_footballers_slot_id_range",
            type_="check",
        )
        batch_op.drop_constraint(
            "uq_user_footballers_user_id_slot_id",
            type_="unique",
        )
        batch_op.drop_column("slot_id")

    op.drop_table("user_buses")
