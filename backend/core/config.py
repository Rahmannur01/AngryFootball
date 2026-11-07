from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    root_path: str = "/angryfootball"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 24 * 60
    log_level: str = "INFO"
    log_file: Path = PROJECT_DIR / "logs" / "app.log"
    log_max_bytes: int = 10 * 1024 * 1024
    log_backup_count: int = 5
    avatar_dir: Path = PROJECT_DIR / "data" / "avatars"

    # OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    dev_mode: bool = True

    model_config = SettingsConfigDict(
        env_file=(PROJECT_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
