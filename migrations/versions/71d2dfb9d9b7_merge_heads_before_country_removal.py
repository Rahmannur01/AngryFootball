"""merge_heads_before_country_removal

Revision ID: 71d2dfb9d9b7
Revises: d33a3a5afa92
Create Date: 2026-11-06 20:05:54.375465

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '71d2dfb9d9b7'
down_revision: Union[str, Sequence[str], None] = 'd33a3a5afa92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
