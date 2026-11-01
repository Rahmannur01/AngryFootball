from backend.modules.auth.rules import (
    EMAIL_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    USERNAME_MAX_LENGTH,
    USERNAME_MIN_LENGTH,
    USERNAME_PATTERN,
)


def normalize_username(value: str) -> str:
    return value.strip()


def validate_username(value: str) -> str:
    if not USERNAME_MIN_LENGTH <= len(value) <= USERNAME_MAX_LENGTH:
        raise ValueError(
            "Никнейм должен содержать "
            f"от {USERNAME_MIN_LENGTH} до {USERNAME_MAX_LENGTH} символов."
        )

    if USERNAME_PATTERN.fullmatch(value) is None:
        raise ValueError(
            "Никнейм может содержать только буквы, цифры, дефис "
            "и нижнее подчёркивание."
        )

    return value


def normalize_email(value: str) -> str:
    return value.strip().lower()


def validate_email_length(value: str) -> str:
    if len(value) > EMAIL_MAX_LENGTH:
        raise ValueError(
            f"Email не должен быть длиннее {EMAIL_MAX_LENGTH} символов."
        )

    return value


def validate_password(value: str) -> str:
    if not PASSWORD_MIN_LENGTH <= len(value) <= PASSWORD_MAX_LENGTH:
        raise ValueError(
            "Пароль должен содержать "
            f"от {PASSWORD_MIN_LENGTH} до {PASSWORD_MAX_LENGTH} символов."
        )

    if value.isspace():
        raise ValueError("Пароль не может состоять только из пробелов.")

    return value
