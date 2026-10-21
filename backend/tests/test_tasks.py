import pytest
from httpx import AsyncClient
from unittest.mock import patch
from backend.app.database.repositories import DatabaseUnavailableException


@pytest.mark.asyncio
async def test_create_task_validation_empty_prompt(async_client: AsyncClient):
    response = await async_client.post("/api/tasks", json={"prompt": ""})
    assert response.status_code == 422
    data = response.json()
    assert "error" in data


@pytest.mark.asyncio
async def test_create_task_validation_whitespace_prompt(async_client: AsyncClient):
    response = await async_client.post("/api/tasks", json={"prompt": "    "})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_and_get_task_success(async_client: AsyncClient):
    payload = {
        "prompt": "Analyze the quarterly revenue projections and outline key bottlenecks",
        "category": "research",
    }
    create_res = await async_client.post("/api/tasks", json=payload)
    assert create_res.status_code == 201
    task = create_res.json()
    
    assert task["task_id"].startswith("task_")
    assert task["prompt"] == payload["prompt"]
    assert task["category"] == "research"
    assert task["status"] == "queued"
    assert task["is_demo"] is True
    assert "events" in task
    assert len(task["events"]) >= 1

    # Now retrieve it by ID
    get_res = await async_client.get(f"/api/tasks/{task['task_id']}")
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["task_id"] == task["task_id"]
    assert retrieved["title"] == task["title"]


@pytest.mark.asyncio
async def test_get_nonexistent_task(async_client: AsyncClient):
    response = await async_client.get("/api/tasks/task_does_not_exist_999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_tasks(async_client: AsyncClient):
    # Ensure at least one task exists
    await async_client.post("/api/tasks", json={"prompt": "Task for list testing", "category": "general"})
    
    response = await async_client.get("/api/tasks")
    assert response.status_code == 200
    data = response.json()
    assert "tasks" in data
    assert "total" in data
    assert data["total"] >= 1
    assert data["database_connected"] is True


@pytest.mark.asyncio
async def test_create_task_database_unavailable(async_client: AsyncClient):
    with patch(
        "backend.app.database.repositories.TaskRepository.create_task",
        side_effect=DatabaseUnavailableException("DB connection timed out"),
    ):
        response = await async_client.post("/api/tasks", json={"prompt": "Valid prompt"})
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert "MongoDB is offline" in data["detail"]


@pytest.mark.asyncio
async def test_task_sse_stream(async_client: AsyncClient):
    # Create task first
    create_res = await async_client.post("/api/tasks", json={"prompt": "Task for SSE stream testing"})
    assert create_res.status_code == 201
    task_id = create_res.json()["task_id"]

    # Request SSE stream
    async with async_client.stream("GET", f"/api/tasks/{task_id}/events") as stream_res:
        assert stream_res.status_code == 200
        assert "text/event-stream" in stream_res.headers.get("content-type", "")
        
        # Read the first chunk
        first_chunk = await stream_res.aread()
        text = first_chunk.decode("utf-8")
        assert "event: snapshot" in text
        assert task_id in text
