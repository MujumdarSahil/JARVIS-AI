import pytest
from httpx import AsyncClient
from unittest.mock import patch


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "JARVIS"
    assert data["status"] == "online"
    assert "version" in data


@pytest.mark.asyncio
async def test_health_endpoint_healthy(async_client: AsyncClient):
    response = await async_client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "services" in data
    assert "api" in data["services"]
    assert "mongodb" in data["services"]


@pytest.mark.asyncio
async def test_health_endpoint_degraded_when_db_down(async_client: AsyncClient):
    with patch(
        "backend.app.api.health.check_database_health",
        return_value={"status": "disconnected", "database": "jarvis_test", "error": "timeout"},
    ):
        response = await async_client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["services"]["mongodb"]["status"] == "disconnected"


@pytest.mark.asyncio
async def test_readiness_endpoint_ready(async_client: AsyncClient):
    with patch(
        "backend.app.api.health.check_database_health",
        return_value={"status": "connected", "database": "jarvis_test", "latency_ms": 1.2},
    ):
        response = await async_client.get("/api/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["ready"] is True
        assert data["status"] == "ready"


@pytest.mark.asyncio
async def test_readiness_endpoint_unready_when_db_offline(async_client: AsyncClient):
    with patch(
        "backend.app.api.health.check_database_health",
        return_value={"status": "disconnected", "database": "jarvis_test", "error": "Connection refused"},
    ):
        response = await async_client.get("/api/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["ready"] is False
        assert data["status"] == "unready"
