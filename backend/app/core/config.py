"""
Application Configuration

Loaded from environment variables with sensible defaults.
"""

from typing import Optional, List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # Application
    APP_ENV: str = "development"
    DEBUG: bool = True
    APP_NAME: str = "Fleet Vehicle Data Gateway"

    # Backend Server
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/fleet_gateway"
    )

    # Authentication
    SECRET_KEY: str = "change-this-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OAuth Providers
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    OAUTH_REDIRECT_URL: str = "http://localhost:8000/auth/callback"
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Kafka/Redpanda
    KAFKA_ENABLED: bool = False
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:19092"
    KAFKA_TOPIC_TELEMETRY: str = "fleet-telemetry"
    KAFKA_CONSUMER_GROUP: str = "fleet-backend"

    # GCP (Optional - for future use)
    GCP_PROJECT_ID: Optional[str] = None
    GCP_CREDENTIALS_PATH: Optional[str] = None
    GCS_BUCKET_NAME: Optional[str] = None
    BIGQUERY_DATASET: str = "fleet_analytics"
    BIGQUERY_TABLE: str = "telemetry"

    # Simulator
    SIMULATOR_VEHICLE_COUNT: int = 50
    SIMULATOR_UPDATE_INTERVAL_MS: int = 1000
    SIMULATOR_DEMO_MODE: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings()
