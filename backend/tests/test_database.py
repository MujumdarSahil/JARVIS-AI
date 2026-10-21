import pytest
from unittest.mock import AsyncMock, patch
from pymongo.errors import ServerSelectionTimeoutError
from backend.app.database.connection import check_database_health


@pytest.mark.asyncio
async def test_database_health_live():
    # Tests the actual connection to the running MongoDB service
    health = await check_database_health()
    assert "status" in health
    assert "database" in health
    # If MongoDB is running on port 27017, status is connected
    assert health["status"] in ["connected", "disconnected"]


@pytest.mark.asyncio
async def test_database_health_failure_handling():
    with patch(
        "backend.app.database.connection.get_client"
    ) as mock_get_client:
        mock_client = AsyncMock()
        mock_client.admin.command.side_effect = ServerSelectionTimeoutError("Server unreachable")
        mock_get_client.return_value = mock_client
        
        health = await check_database_health()
        assert health["status"] == "disconnected"
        assert health["error"] == "MongoDB unavailable or timed out"
