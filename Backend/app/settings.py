# /Backend/app/settings.py

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

    # Email transport:
    # brevo = sends real verification/reset emails through the Brevo API.
    MAIL_TRANSPORT: str = "brevo"
    MAIL_FROM: str = "no-reply@localhost"
    MAIL_FROM_NAME: str = "MediMind Lite"

    BREVO_API_KEY: str | None = None

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
    GOOGLE_REDIRECT_URI: str = ""

    SUPABASE_URL: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    SUPABASE_AVATAR_BUCKET: str = "avatar"

    @model_validator(mode="after")
    def _normalise_and_validate(self):
        self.ENV = (self.ENV or "dev").lower().strip()
        self.MAIL_TRANSPORT = (self.MAIL_TRANSPORT or "brevo").lower().strip()

        if self.ENV == "prod":
            self.AUTH_COOKIE_SECURE = True
            self.AUTH_COOKIE_SAMESITE = "none"

        if self.MAIL_TRANSPORT != "brevo":
            raise ValueError("MAIL_TRANSPORT must be set to brevo.")

        if not self.BREVO_API_KEY:
            raise ValueError("BREVO_API_KEY is missing. Add it in Render environment variables.")

        if not self.MAIL_FROM:
            raise ValueError("MAIL_FROM is missing. Add a verified Brevo sender email.")

        return self


settings = Settings()