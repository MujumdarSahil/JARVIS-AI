import pytest
from unittest.mock import patch
from backend.app.core.clock import detect_time_query, get_timezone_time, get_current_utc_str
from backend.app.orchestration.graph import execute_task_lifecycle


def test_clock_utility_california():
    """Verify deterministic timezone-aware calculation for California."""
    res = detect_time_query("What time is it in California, USA right now?")
    assert res is not None
    assert "California" in res["location"]
    assert res["iana_timezone"] == "America/Los_Angeles"
    assert "AM" in res["time_12h"] or "PM" in res["time_12h"]
    assert res["tz_abbr"] in ["PDT", "PST"]
    assert "UTC-07:00" in res["utc_offset"] or "UTC-08:00" in res["utc_offset"]
    assert "America/Los_Angeles" in res["formatted_answer"]


def test_clock_utility_various_time_prompts():
    """Verify detection across various phrasings and locations."""
    queries = [
        ("what is the current time in california", "America/Los_Angeles"),
        ("What time is it in New York right now?", "America/New_York"),
        ("Tell me the current time in London, UK", "Europe/London"),
        ("What time is it in Tokyo?", "Asia/Tokyo"),
    ]
    for q, expected_tz in queries:
        res = detect_time_query(q)
        assert res is not None, f"Failed for query: {q}"
        assert res["iana_timezone"] == expected_tz, f"Expected {expected_tz} for {q}, got {res['iana_timezone']}"


def test_clock_utility_non_time_query():
    """Verify non-time queries return None so they route to models."""
    non_time = [
        "What is the capital of California?",
        "Explain quantum computing in detail",
        "Write a Python function to sort a list",
    ]
    for q in non_time:
        res = detect_time_query(q)
        assert res is None, f"Expected None for non-time query: {q}"


@pytest.mark.asyncio
async def test_california_time_lifecycle_regression():
    """
    Regression test for: 'What time is it in California, USA right now?'
    Ensures complete LangGraph lifecycle runs to completion and answers deterministically.
    """
    emitted_events = []

    def on_event(evt):
        emitted_events.append(evt)

    with patch("backend.app.orchestration.nodes.TaskRepository.update_task_fields", return_value=True):
        final_state = await execute_task_lifecycle(
            task_id="test_california_time_regression_001",
            prompt="What time is it in California, USA right now?",
            category="general",
            event_callback=on_event,
        )

        assert final_state["status"] == "completed"
        assert final_state["selected_provider"] == "system"
        assert final_state["selected_model"] == "deterministic-clock"
        assert "America/Los_Angeles" in final_state["response_content"]
        assert ("PDT" in final_state["response_content"] or "PST" in final_state["response_content"])
        assert any(e["type"] == "task.completed" for e in emitted_events)
