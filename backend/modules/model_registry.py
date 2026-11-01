"""Import every ORM model so SQLAlchemy and Alembic can discover them."""

from backend.modules.auth.models import UserDB
from backend.modules.catalog.models import Club, Footballer
from backend.modules.chests.models import ChestReward, UserChest

__all__ = (
    "ChestReward",
    "Club",
    "Footballer",
    "UserDB",
    "UserChest",
)
