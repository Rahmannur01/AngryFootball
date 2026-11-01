"""Import every ORM model so SQLAlchemy and Alembic can discover them."""

from backend.modules.auth.models import UserDB
from backend.modules.catalog.models import Club, Footballer
from backend.modules.chests.models import ChestReward, UserChest
from backend.modules.team.models import UserFootballer

__all__ = (
    "ChestReward",
    "Club",
    "Footballer",
    "UserDB",
    "UserChest",
    "UserFootballer",
)
