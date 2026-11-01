from typing import Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    field_validator,
    model_validator,
)

from backend.modules.auth.validators import (
    normalize_email,
    normalize_username,
    validate_email_length,
    validate_password,
    validate_username,
)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class User(BaseModel):
    id: int
    username: str
    email: str | None = None
    disabled: bool | None = None


class CreateUser(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str
    email: EmailStr
    password: str
    password_repeat: str

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username_field(cls, value: object) -> object:
        if isinstance(value, str):
            return normalize_username(value)
        return value

    @field_validator("username")
    @classmethod
    def validate_username_field(cls, value: str) -> str:
        return validate_username(value)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email_field(cls, value: object) -> object:
        if isinstance(value, str):
            return normalize_email(value)
        return value

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, value: EmailStr) -> EmailStr:
        validate_email_length(str(value))
        return value

    @field_validator("password", "password_repeat")
    @classmethod
    def validate_password_field(cls, value: str) -> str:
        return validate_password(value)

    @model_validator(mode="after")
    def validate_passwords_match(self) -> Self:
        if self.password != self.password_repeat:
            raise ValueError("Пароли не совпадают.")
        return self


class UserInDB(User):
    hashed_password: str
