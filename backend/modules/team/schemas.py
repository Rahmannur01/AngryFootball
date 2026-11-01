from pydantic import PositiveInt

from backend.modules.catalog.schemas import Footballer


class UserFootballer(Footballer):
    character_type_id: PositiveInt | None
