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

    DATABASE_URL: str = "sqlite:///./medimind.db"

    SECRET_KEY: str = "CHANGE_ME"
    SESSION_SECRET_KEY: str = "CHANGE_ME_SESSION_SECRET"

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    FRONTEND_URL: str = "http://localhost:3000"

    AUTH_COOKIE_ACCESS: str = "mm_access"
    AUTH_COOKIE_REFRESH: str = "mm_refresh"

    AUTH_COOKIE_SECURE: bool = False
    AUTH_COOKIE_SAMESITE: str = "lax"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    VERIFY_CODE_EXPIRE_MINUTES: int = 10

    MAIL_TRANSPORT: str = "console"
    MAIL_FROM: str = "no-reply@localhost"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True
    SMTP_USER: str = ""
    SMTP_PASS: str = ""

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4.1"
    OPENAI_TIMEOUT_SECONDS: int = 45

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/api/backend/auth/google/callback"

    @model_validator(mode="after")
    def _validate_prod_email(self):
        if self.ENV == "prod" and self.MAIL_TRANSPORT == "console":
            raise ValueError("MAIL_TRANSPORT=console is not allowed in prod")
        return self


settings = Settings()

if settings.ENV == "prod":
    settings.AUTH_COOKIE_SECURE = True
    settings.AUTH_COOKIE_SAMESITE = "none"