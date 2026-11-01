from pydantic import BaseModel, ConfigDict


class Footballer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    api_football_id: int
    name_en: str
    name_ru: str | None
    age: int | None
    position: str | None
    number: int | None
    photo: str | None
    club_id: int | None
