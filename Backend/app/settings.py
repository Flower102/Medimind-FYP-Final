# /backend/app/settings.py

# ---------------------------------------------------------------------
# Imports and Environment File Location
# ---------------------------------------------------------------------
# This section locates the backend .env file and imports Pydantic settings tools.
# Settings are loaded from environment variables so local and deployed values can differ.
# ---------------------------------------------------------------------
from pathlib import Path as FilePath

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = FilePath(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"


# ---------------------------------------------------------------------
# Application Settings
# ---------------------------------------------------------------------
# This class defines all backend configuration values used across the app.
# Defaults support local development, while Render/Vercel can override them using env vars.
# ---------------------------------------------------------------------
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

    # Email
    # console = prints verification code in terminal / Render logs
    # smtp = real SMTP email
    # resend = real email through Resend HTTP API
    MAIL_TRANSPORT: str = "smtp"
    MAIL_FROM: str = "no-reply@localhost"
    MAIL_FROM_NAME: str = "MediMind Lite"

    # Temporary safety switch:
    # Set this to true on Render only while testing if you want codes in logs.
    ALLOW_CONSOLE_EMAIL_IN_PROD: bool = False

    # BREVO email API

    BREVO_API_KEY: str | None = None

    # SMTP email settings
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


# ---------------------------------------------------------------------
# Production Safety Validation
# ---------------------------------------------------------------------
# This validator normalises settings and applies safer defaults in production.
# It prevents insecure email/cookie settings from accidentally being used after deployment.
# ---------------------------------------------------------------------
@model_validator(mode="after")
def _normalise_and_validate(self):
    self.ENV = (self.ENV or "dev").lower().strip()
    self.MAIL_TRANSPORT = (self.MAIL_TRANSPORT or "console").lower().strip()

    if self.ENV == "prod":
        self.AUTH_COOKIE_SECURE = True
        self.AUTH_COOKIE_SAMESITE = "none"

        if (
            self.MAIL_TRANSPORT == "console"
            and not self.ALLOW_CONSOLE_EMAIL_IN_PROD
        ):
            raise ValueError(
                "MAIL_TRANSPORT=console is not allowed in prod. Use MAIL_TRANSPORT=brevo."
                "Use MAIL_TRANSPORT=resend for real email, or set "
                "ALLOW_CONSOLE_EMAIL_IN_PROD=true temporarily for testing."
            )

    return self


# ---------------------------------------------------------------------
# Shared Settings Instance
# ---------------------------------------------------------------------
# This object is imported by the rest of the backend to read configuration values.
# Creating it once keeps environment loading centralised in this file.
# ---------------------------------------------------------------------
settings = Settings()
