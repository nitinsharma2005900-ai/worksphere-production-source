from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "WorkSphere Analytics Service"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    INTERNAL_API_KEY: str = "ws_internal_sec_analytics_dev_key_2026"
    MAX_STREAM_CHUNK_SIZE: int = 1000
    CORS_ORIGINS: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()


def cors_origins() -> list[str]:
    """Parse a comma-separated allowlist without enabling credentialed '*'."""
    return [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
