import time
from datetime import datetime, timezone
from typing import Dict, Any, List
from backend.app.core.logging import logger
from backend.app.orchestration.state import TaskExecutionState
from backend.app.model_router.router import model_router, NoEligibleFreeRouteError
from backend.app.model_router.models import ModelProvider
from backend.app.database.repositories import TaskRepository
from backend.app.core.clock import detect_time_query, get_current_utc_str


def create_event(event_type: str, message: str, details: Dict[str, Any] = None) -> Dict[str, Any]:
    """Helper to generate structured task lifecycle events."""
    return {
        "event_id": f"evt_{int(time.time() * 1000)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": event_type,
        "message": message,
        "details": details or {},
    }


async def plan_task_node(state: TaskExecutionState) -> Dict[str, Any]:
    """
    Step 1: Analyze user request and prepare a bounded execution plan.
    """
    prompt = state["prompt"]
    category = state.get("category", "general")
    logger.info(f"[LangGraph Node: plan_task] Planning task {state['task_id']}")

    # Check if this directive is a deterministic time or date inquiry
    clock_data = detect_time_query(prompt)

    if clock_data:
        plan_steps = [
            f"Identify real-time temporal directive for {clock_data['location']}",
            f"Query authoritative timezone clock ({clock_data['iana_timezone']})",
            "Validate timezone-aware timestamp and UTC offset",
            "Persist deterministic time response to durable task record",
        ]
        msg = f"Task entered planning stage. Temporal query identified for {clock_data['location']}."
    else:
        plan_steps = [
            f"Parse and validate natural language directive ({category})",
            "Verify free-tier model route allowlist and zero-paid constraints",
            "Dispatch reasoning call to eligible free model with bounded fallback",
            "Validate generated response and persist durable completion state",
        ]
        msg = "Task entered planning stage. Formulated bounded execution plan."

    event = create_event(
        "task.status_changed",
        msg,
        {"plan_steps": plan_steps},
    )

    return {
        "status": "planning",
        "plan_steps": plan_steps,
        "clock_data": clock_data,
        "current_step": "Planning complete",
        "events": state.get("events", []) + [event],
    }


async def select_model_node(state: TaskExecutionState) -> Dict[str, Any]:
    """
    Step 2: Select eligible free provider route under zero-paid-spend policy.
    """
    logger.info(f"[LangGraph Node: select_model] Selecting route for {state['task_id']}")

    # If already identified as a deterministic clock query, route to internal clock
    if state.get("clock_data"):
        clock_data = state["clock_data"]
        event = create_event(
            "task.model_selected",
            f"Routed to JARVIS Deterministic Clock ({clock_data['iana_timezone']}).",
            {
                "provider": "system",
                "model_id": "deterministic-clock",
                "is_free": True,
            },
        )
        return {
            "status": "running",
            "selected_provider": "system",
            "selected_model": "deterministic-clock",
            "current_step": f"Executing deterministic clock for {clock_data['location']}",
            "events": state.get("events", []) + [event],
        }

    category = state.get("category", "general")
    preferred = ModelProvider.GROQ
    if category == "coding":
        preferred = ModelProvider.GROQ
    elif category == "research":
        preferred = ModelProvider.GEMINI

    available_routes = model_router.get_available_routes(preferred)

    if not available_routes:
        error_msg = "No eligible free-tier routes available. Zero-paid policy strictly prohibits paid fallback."
        event = create_event("task.failed", error_msg, {"error_category": "no_routes_available"})
        return {
            "status": "failed",
            "error_message": error_msg,
            "error_category": "no_routes_available",
            "current_step": "Model selection failed",
            "events": state.get("events", []) + [event],
        }

    selected_route = available_routes[0]
    event = create_event(
        "task.model_selected",
        f"Selected primary free route: {selected_route.display_name}",
        {
            "provider": selected_route.provider.value,
            "model_id": selected_route.model_id,
            "is_free": True,
        },
    )

    return {
        "status": "running",
        "selected_provider": selected_route.provider.value,
        "selected_model": selected_route.model_id,
        "current_step": f"Executing model {selected_route.display_name}",
        "events": state.get("events", []) + [event],
    }


async def execute_model_node(state: TaskExecutionState) -> Dict[str, Any]:
    """
    Step 3: Execute model call through the FreeModelRouter with fallback,
    or resolve deterministic clock requests directly without hallucination.
    """
    if state.get("status") == "failed":
        return {}

    task_id = state["task_id"]
    prompt = state["prompt"]
    logger.info(f"[LangGraph Node: execute_model] Processing directive for {task_id}")

    # 1. Deterministic Clock Path
    if state.get("clock_data"):
        clock_info = state["clock_data"]
        response_content = clock_info["formatted_answer"]
        clock_event = create_event(
            "task.progress",
            f"Determined authoritative current time for {clock_info['location']}.",
            {
                "time": clock_info["time_12h"],
                "date": clock_info["date_str"],
                "timezone": clock_info["iana_timezone"],
                "offset": clock_info["utc_offset"],
            },
        )
        return {
            "response_content": response_content,
            "selected_provider": "system",
            "selected_model": "deterministic-clock",
            "current_step": "Timezone query resolved deterministically",
            "events": state.get("events", []) + [clock_event],
        }

    # 2. General LLM Execution Path
    utc_anchor = get_current_utc_str()
    system_prompt = (
        f"You are JARVIS, an advanced, precise, local-first personal AI assistant. "
        f"Current real-world time reference: {utc_anchor}. "
        f"Formulate your response directly, clearly, and constructively without unnecessary conversational fluff. "
        f"Adhere strictly to factual accuracy."
    )

    progress_events: List[Dict[str, Any]] = []

    def on_router_event(event_type: str, message: str, details: dict):
        evt = create_event(event_type, message, details)
        progress_events.append(evt)

    try:
        preferred = None
        if state.get("selected_provider") and state["selected_provider"] != "system":
            try:
                preferred = ModelProvider(state["selected_provider"])
            except ValueError:
                preferred = None

        result = await model_router.execute_task(
            prompt=prompt,
            system_prompt=system_prompt,
            preferred_provider=preferred,
            on_event=on_router_event,
        )

        success_event = create_event(
            "task.progress",
            f"Model reasoning complete via {result.provider.value}/{result.model_id}.",
            {"latency_ms": result.latency_ms, "provider": result.provider.value, "model": result.model_id},
        )

        return {
            "response_content": result.content,
            "selected_provider": result.provider.value,
            "selected_model": result.model_id,
            "current_step": "Model response received",
            "events": state.get("events", []) + progress_events + [success_event],
        }

    except NoEligibleFreeRouteError as e:
        error_msg = str(e)
        logger.error(f"[LangGraph Node: execute_model] Free routes exhausted: {error_msg}")
        fail_event = create_event(
            "task.failed",
            error_msg,
            {"reason": "free_quota_or_routes_exhausted"},
        )
        return {
            "status": "failed",
            "error_message": error_msg,
            "error_category": "free_quota_exhausted",
            "current_step": "Execution failed - no free routes remaining",
            "events": state.get("events", []) + progress_events + [fail_event],
        }
    except Exception as e:
        error_msg = f"Unexpected execution error: {type(e).__name__} - {e}"
        logger.error(f"[LangGraph Node: execute_model] {error_msg}")
        fail_event = create_event("task.failed", error_msg, {"error": str(e)})
        return {
            "status": "failed",
            "error_message": error_msg,
            "error_category": "execution_error",
            "current_step": "Execution failed unexpectedly",
            "events": state.get("events", []) + progress_events + [fail_event],
        }


async def validate_response_node(state: TaskExecutionState) -> Dict[str, Any]:
    """
    Step 4: Validate generated model output.
    """
    if state.get("status") == "failed":
        return {}

    content = state.get("response_content", "")
    if not content or not content.strip():
        error_msg = "Model generated an empty or whitespace response."
        event = create_event("task.failed", error_msg, {"error_category": "invalid_response"})
        return {
            "status": "failed",
            "error_message": error_msg,
            "error_category": "invalid_response",
            "events": state.get("events", []) + [event],
        }

    event = create_event(
        "task.progress",
        "Generated response passed output validation.",
        {"char_length": len(content.strip())},
    )

    return {
        "current_step": "Validation complete",
        "events": state.get("events", []) + [event],
    }


async def finalize_task_node(state: TaskExecutionState) -> Dict[str, Any]:
    """
    Step 5: Finalize task lifecycle state and update MongoDB record.
    """
    task_id = state["task_id"]
    is_failed = state.get("status") == "failed" or bool(state.get("error_message"))
    final_status = "failed" if is_failed else "completed"

    completion_event = create_event(
        "task.completed" if not is_failed else "task.failed",
        "Task completed successfully." if not is_failed else f"Task failed: {state.get('error_message')}",
        {"final_status": final_status},
    )

    all_events = state.get("events", []) + [completion_event]

    # Update database record
    try:
        update_data = {
            "status": final_status,
            "updated_at": datetime.now(timezone.utc),
            "events": all_events,
            "result": {
                "content": state.get("response_content"),
                "provider": state.get("selected_provider"),
                "model": state.get("selected_model"),
                "error": state.get("error_message"),
            },
            "phase": "Phase 2 - Core Assistant (LangGraph + Free Models)",
            "is_demo": False,
        }
        await TaskRepository.update_task_fields(task_id, update_data)
        logger.info(f"[LangGraph Node: finalize] Task {task_id} persisted as {final_status}")
    except Exception as e:
        logger.error(f"[LangGraph Node: finalize] Failed to update task in MongoDB: {e}")

    return {
        "status": final_status,
        "current_step": "Lifecycle complete",
        "events": all_events,
    }
