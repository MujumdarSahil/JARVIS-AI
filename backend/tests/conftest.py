import pytest
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from backend.app.main import create_app
from backend.app.core.config import settings
from backend.app.database.connection import get_client, close_client

# Force test database name
settings.mongodb_database = "jarvis_test"


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def async_client(app) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client
    # Clean up DB client and collections after test
    try:
        motor_client = get_client()
        await motor_client.drop_database("jarvis_test")
    except Exception:
        pass
    await close_client()
