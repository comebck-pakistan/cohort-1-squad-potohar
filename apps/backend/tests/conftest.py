import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
def mock_env(monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "replace_me")
    monkeypatch.setattr(settings, "supabase_url", "replace_me")
    monkeypatch.setattr(settings, "supabase_service_role_key", "replace_me")
