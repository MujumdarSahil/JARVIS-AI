import pytest
from unittest.mock import patch
from backend.app.orchestration.graph import execute_task_lifecycle
from backend.app.model_router.models import ProviderResult, ModelProvider
from backend.app.model_router.allowlist import FREE_ROUTE_ALLOWLIST


@pytest.mark.asyncio
async def test_langgraph_lifecycle_success():
    """
    Tests the complete 5-node LangGraph execution lifecycle to completion.
    """
    emitted_events = []

    def on_event(evt):
        emitted_events.append(evt)

    mock_result = ProviderResult(
        success=True,
        content="Here is the structured analysis of the personal assistant architecture.",
        provider=ModelProvider.GROQ,
        model_id="llama-3.3-70b-versatile",
        latency_ms=95.0,
    )

    with patch("backend.app.orchestration.nodes.model_router.get_available_routes", return_value=[FREE_ROUTE_ALLOWLIST[0]]):
        with patch("backend.app.orchestration.nodes.model_router.execute_task", return_value=mock_result):
            with patch("backend.app.orchestration.nodes.TaskRepository.update_task_fields", return_value=True):
                final_state = await execute_task_lifecycle(
                    task_id="test_task_lifecycle_123",
                    prompt="Analyze local assistant architecture",
                    category="general",
                    event_callback=on_event,
                )

            assert final_state["status"] == "completed"
            assert final_state["current_step"] == "Lifecycle complete"
            assert "structured analysis" in final_state["response_content"]
            assert final_state["selected_provider"] == "groq"
            assert len(final_state["plan_steps"]) >= 3
            assert len(emitted_events) >= 3

            # Verify presence of key event types
            event_types = [e["type"] for e in emitted_events]
            assert "task.status_changed" in event_types
            assert "task.model_selected" in event_types
            assert "task.completed" in event_types


@pytest.mark.asyncio
async def test_langgraph_lifecycle_failure_when_no_routes():
    """
    When no eligible free routes exist, task lifecycle transitions cleanly to failed state.
    """
    emitted_events = []

    with patch("backend.app.orchestration.nodes.model_router.get_available_routes", return_value=[]):
        with patch("backend.app.orchestration.nodes.TaskRepository.update_task_fields", return_value=True):
            final_state = await execute_task_lifecycle(
                task_id="test_task_fail_123",
                prompt="Execute reasoning directive",
                category="research",
                event_callback=lambda e: emitted_events.append(e),
            )

            assert final_state["status"] == "failed"
            assert "No eligible free-tier routes available" in final_state["error_message"]
            assert any(e["type"] == "task.failed" for e in emitted_events)
