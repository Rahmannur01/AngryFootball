"""remove_country_code_field

Revision ID: d33a3a5afa92
Revises: 5a6cbdfb2e95
Create Date: 2026-11-06 20:05:12.045750

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd33a3a5afa92'
down_revision: Union[str, Sequence[str], None] = '5a6cbdfb2e95'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
