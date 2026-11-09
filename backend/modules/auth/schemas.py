from datetime import datetime
from typing import Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
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
    user_id: int | None = None


class User(BaseModel):
    id: int
    username: str
    email: str | None = None
    disabled: bool | None = None
    avatar_url: str | None = None
    created_date: datetime


class CreateUser(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str
    password: str
    password_repeat: str
    registration_token: str

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
    hashed_password: str | None = None


class RegistrationEmailRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr

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


class EmailCodeSent(BaseModel):
    challenge_id: str
    expires_in_seconds: int
    resend_after_seconds: int


class VerifyEmailCode(BaseModel):
    model_config = ConfigDict(extra="forbid")

    challenge_id: str
    code: str = Field(pattern=r"^\d{6}$")


class EmailVerified(BaseModel):
    registration_token: str
