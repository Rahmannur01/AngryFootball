from datetime import datetime
from typing import Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    PositiveInt,
    model_validator,
)

from backend.modules.lineup import rules
from backend.modules.catalog.schemas import Footballer


class BusUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bus_id: PositiveInt


class BusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: PositiveInt
    code: str
    name: str


class UserBusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: PositiveInt
    bus_id: PositiveInt
    created_at: datetime
    updated_at: datetime


class LineupFootballerResponse(Footballer):
    character_type_id: PositiveInt | None
    slot_id: int | None = Field(
        default=None,
        ge=rules.MIN_SLOT_ID,
        le=rules.MAX_SLOT_ID,
    )


class InitialLineupResponse(BaseModel):
    bus_id: PositiveInt
    players: list[LineupFootballerResponse]


class LineupSummaryResponse(BaseModel):
    bus_id: PositiveInt
    placed_players: int = Field(
        ge=0,
        le=rules.MAX_LINEUP_SIZE,
    )
    required_players: int = Field(
        default=rules.MAX_LINEUP_SIZE,
        ge=1,
    )
    is_ready: bool


class FootballerSlot(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    footballer_id: PositiveInt
    slot_id: int = Field(
        ge=rules.MIN_SLOT_ID,
        le=rules.MAX_SLOT_ID,
    )


class ReplaceLineupSlotsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    players: list[FootballerSlot] = Field(
        max_length=rules.MAX_LINEUP_SIZE,
    )

    @model_validator(mode="after")
    def validate_unique_players_and_slots(self) -> Self:
        footballer_ids = [
            player.footballer_id
            for player in self.players
        ]
        if len(set(footballer_ids)) != len(footballer_ids):
            raise ValueError(
                "Каждый футболист может присутствовать только один раз"
            )

        slot_ids = [player.slot_id for player in self.players]
        if len(set(slot_ids)) != len(slot_ids):
            raise ValueError(
                "Каждое место может занимать только один футболист"
            )

        return self


class SetFootballerSlotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slot_id: int = Field(
        ge=rules.MIN_SLOT_ID,
        le=rules.MAX_SLOT_ID,
    )


class LineupSlotsResponse(BaseModel):
    players: list[FootballerSlot]


class ClearLineupSlotsResponse(BaseModel):
    removed_count: int = Field(ge=0)
