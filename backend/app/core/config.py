from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URL: str
    DATABASE_NAME: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # AI / GROQ
    GROQ_API_KEY: str

    # GitHub OAuth
    GITHUB_CLIENT_ID: str | None = None
    GITHUB_CLIENT_SECRET: str | None = None
    GITHUB_REDIRECT_URI: str | None = None

    # CORS
    CORS_ORIGINS: str

    # Environment
    ENVIRONMENT: str = "development"

    # Email
    EMAIL_USER: str
    EMAIL_PASS: str

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USE_TLS: bool = True
    FRONTEND_URL: str = "http://localhost:5173"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"   # IMPORTANT: prevents crash on extra env vars
    )

    @property
    def SMTP_FROM_EMAIL(self) -> str:
        return self.EMAIL_USER

    @property
    def SMTP_USERNAME(self) -> str:
        return self.EMAIL_USER

    @property
    def SMTP_PASSWORD(self) -> str:
        return self.EMAIL_PASS

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()