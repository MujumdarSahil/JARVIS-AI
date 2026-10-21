import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import create_app
from backend.app.core.config import settings
from backend.app.database.connection import get_database, close_client


@pytest.mark.asyncio
async def test_full_live_end_to_end_flow():
    """
    Validates the complete Phase 1 flow against live local MongoDB:
    1. Health and readiness checks pass against the real local DB.
    2. A task is created via API.
    3. The task is persisted directly into the MongoDB 'tasks' collection.
    4. The task appears in GET /api/tasks.
    5. The task can be inspected via GET /api/tasks/{task_id}.
    6. The SSE endpoint returns initial snapshot.
    7. Capabilities matrix returns implemented vs planned.
    """
    settings.mongodb_database = "jarvis_live_test"
    app = create_app()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://127.0.0.1:8000",
    ) as client:
        # 1. Health check
        health_res = await client.get("/api/health")
        assert health_res.status_code == 200
        health_data = health_res.json()
        assert health_data["status"] == "ok"
        assert health_data["services"]["mongodb"]["status"] == "connected"

        # 2. Readiness check
        ready_res = await client.get("/api/ready")
        assert ready_res.status_code == 200
        assert ready_res.json()["ready"] is True

        # 3. Task submission
        payload = {
            "prompt": "Investigate optimal local chunking strategies for Phase 3 document analysis",
            "category": "file_analysis",
            "metadata": {"test_run": True},
        }
        create_res = await client.post("/api/tasks", json=payload)
        assert create_res.status_code == 201
        created_task = create_res.json()
        task_id = created_task["task_id"]
        assert task_id.startswith("task_")
        assert created_task["status"] == "queued"
        assert created_task["is_demo"] is True

        # 4. Verify in MongoDB directly
        db = get_database()
        doc = await db.tasks.find_one({"_id": task_id})
        assert doc is not None
        assert doc["prompt"] == payload["prompt"]
        assert doc["category"] == "file_analysis"

        # 5. Verify task listing
        list_res = await client.get("/api/tasks")
        assert list_res.status_code == 200
        task_list = list_res.json()
        assert task_list["total"] >= 1
        found = any(t["task_id"] == task_id for t in task_list["tasks"])
        assert found is True

        # 6. Verify task detail
        detail_res = await client.get(f"/api/tasks/{task_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["task_id"] == task_id
        assert detail["prompt"] == payload["prompt"]
        assert len(detail["events"]) >= 2

        # 7. Verify SSE event stream
        async with client.stream("GET", f"/api/tasks/{task_id}/events") as sse_res:
            assert sse_res.status_code == 200
            assert "text/event-stream" in sse_res.headers.get("content-type", "")
            first_chunk = await sse_res.aread()
            assert b"event: snapshot" in first_chunk
            assert task_id.encode("utf-8") in first_chunk

        # 8. Verify capabilities
        caps_res = await client.get("/api/capabilities")
        assert caps_res.status_code == 200
        caps = caps_res.json()
        assert caps["total"] >= 5
        implemented = [c for c in caps["capabilities"] if c["status"] == "implemented"]
        planned = [c for c in caps["capabilities"] if c["status"] == "planned"]
        assert len(implemented) >= 2
        assert len(planned) >= 4

        # 9. Verify system status
        sys_res = await client.get("/api/system/status")
        assert sys_res.status_code == 200
        sys_data = sys_res.json()
        assert sys_data["api"]["status"] == "online"
        assert sys_data["database"]["status"] == "connected"
        assert sys_data["hardware_target"]["cpu"] == "Intel i5"

        # Cleanup test DB
        await db.client.drop_database("jarvis_live_test")
        await close_client()
