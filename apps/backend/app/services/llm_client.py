import anthropic
from app.config import settings

def get_anthropic_client() -> anthropic.Anthropic:
    # Use dummy_key locally if replace_me is still configured, just to allow instantiation
    api_key = settings.anthropic_api_key if settings.anthropic_api_key != "replace_me" else "dummy_key"
    return anthropic.Anthropic(api_key=api_key)

client = get_anthropic_client()
