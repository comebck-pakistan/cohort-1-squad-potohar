from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    anthropic_api_key: str = "replace_me"
    anthropic_model_analyst: str = "claude-3-haiku-20240307"
    anthropic_model_pricer: str = "claude-3-haiku-20240307"
    anthropic_model_writer: str = "claude-3-sonnet-20240229"
    
    supabase_url: str = "replace_me"
    supabase_service_role_key: str = "replace_me"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    def is_placeholder_llm(self) -> bool:
        return self.anthropic_api_key in ["replace_me", "dummy_key", ""]

    def is_placeholder_db(self) -> bool:
        return self.supabase_url == "replace_me" or self.supabase_service_role_key == "replace_me"

settings = Settings()
