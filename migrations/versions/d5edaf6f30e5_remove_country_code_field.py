"""remove_country_code_field

Revision ID: d5edaf6f30e5
Revises: cfa21eae9cee
Create Date: 2026-11-06 20:04:52.502891

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5edaf6f30e5'
down_revision: Union[str, Sequence[str], None] = 'cfa21eae9cee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove country_code column from users table."""
    op.drop_column('users', 'country_code')


def downgrade() -> None:
    """Restore country_code column."""
    op.add_column('users', sa.Column('country_code', sa.String(length=2), nullable=True))
