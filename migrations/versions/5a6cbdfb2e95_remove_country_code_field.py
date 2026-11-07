"""remove_country_code_field

Revision ID: 5a6cbdfb2e95
Revises: d5edaf6f30e5
Create Date: 2026-11-06 20:05:00.925232

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a6cbdfb2e95'
down_revision: Union[str, Sequence[str], None] = 'd5edaf6f30e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
