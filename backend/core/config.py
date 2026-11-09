from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    root_path: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 24 * 60
    log_level: str = "INFO"
    log_file: Path = PROJECT_DIR / "logs" / "app.log"
    log_max_bytes: int = 10 * 1024 * 1024
    log_backup_count: int = 5
    avatar_dir: Path = PROJECT_DIR / "data" / "avatars"
    smtp_host: str = ""
    smtp_port: int = 465
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "Angry Football"
    smtp_use_ssl: bool = True
    smtp_use_tls: bool = False
    email_code_expire_minutes: int = 10
    email_code_resend_seconds: int = 60
    email_code_max_attempts: int = 5
    email_code_max_sends_per_hour: int = 5
    registration_token_expire_minutes: int = 15

    model_config = SettingsConfigDict(
        env_file=PROJECT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
