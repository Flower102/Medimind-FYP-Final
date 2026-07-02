# /backend/app/settings.py

from pathlib import Path as FilePath
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = FilePath(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENV: str = "dev"
    # ... all your existing fields, unchanged ...
    SUPABASE_AVATAR_BUCKET: str = "avatar"

    @model_validator(mode="after")
    def _normalise_and_validate(self):
        self.ENV = (self.ENV or "dev").lower().strip()
        self.MAIL_TRANSPORT = (self.MAIL_TRANSPORT or "console").lower().strip()

        if self.ENV == "prod":
            self.AUTH_COOKIE_SECURE = True
            self.AUTH_COOKIE_SAMESITE = "none"

            if self.MAIL_TRANSPORT == "console" and not self.ALLOW_CONSOLE_EMAIL_IN_PROD:
                raise ValueError(
                    "MAIL_TRANSPORT=console is not allowed in prod. "
                    "Use MAIL_TRANSPORT=smtp, or set "
                    "ALLOW_CONSOLE_EMAIL_IN_PROD=true temporarily for testing."
                )
        return self

settings = Settings()
