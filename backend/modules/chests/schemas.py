from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    PositiveInt,
    field_validator,
)

from backend.modules.catalog.schemas import Footballer
from backend.modules.chests import rules
from backend.modules.chests.models import ChestStatus


class Chest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chest_type: str
    status: ChestStatus
    granted_at: datetime
    opened_at: datetime | None
    revealed_at: datetime | None


class ChestsResponse(BaseModel):
    chests: list[Chest]


class StarterChestReward(BaseModel):
    chest_id: int
    revealed_at: datetime | None
    character_type_id: PositiveInt | None
    footballer: Footballer


class OpenedStarterChestsResponse(BaseModel):
    rewards: list[StarterChestReward]


class RevealChestsRequest(BaseModel):
    chest_ids: list[PositiveInt] = Field(
        min_length=1,
        max_length=rules.START_PACK_SIZE,
    )

    @field_validator("chest_ids")
    @classmethod
    def validate_unique_chest_ids(
        cls,
        chest_ids: list[int],
    ) -> list[int]:
        if len(set(chest_ids)) != len(chest_ids):
            raise ValueError("Список chest_ids не должен содержать повторения")
        return chest_ids
