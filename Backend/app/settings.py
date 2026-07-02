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

    DATABASE_URL: str = "postgresql+psycopg2://postgres.njmfynsncjdgyodmshxc:Myfamily12akora@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"

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
    MAIL_TRANSPORT: str = "console"
    MAIL_FROM: str = "no-reply@localhost"
    MAIL_FROM_NAME: str = "MediMind Lite"

    # Temporary safety switch:
    # Set this to true on Render only while testing if you want codes in logs.
    ALLOW_CONSOLE_EMAIL_IN_PROD: bool = False

    # BREVO email API
    BREVO_API_KEY: str = ""

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
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/api/backend/auth/google/callback"

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


settings = Settings()