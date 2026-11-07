"""merge_migration_heads

Revision ID: cfa21eae9cee
Revises: a4d7e9c2f105, e5f8a9b3c4d1
Create Date: 2026-11-06 20:04:43.070352

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cfa21eae9cee'
down_revision: Union[str, Sequence[str], None] = ('a4d7e9c2f105', 'e5f8a9b3c4d1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
