from typing import Dict, Any, AsyncGenerator, Optional, Callable
from backend.app.orchestration.state import TaskExecutionState
from backend.app.orchestration.nodes import (
    plan_task_node,
    select_model_node,
    execute_model_node,
    validate_response_node,
    finalize_task_node,
)
from backend.app.core.logging import logger

try:
    from langgraph.graph import StateGraph, END
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    END = "__end__"


def build_task_graph():
    """
    Constructs the LangGraph state machine for JARVIS task orchestration.
    """
    if not LANGGRAPH_AVAILABLE:
        logger.warning("LangGraph package not loaded; using direct pipeline executor.")
        return None

    workflow = StateGraph(TaskExecutionState)

    # Add Nodes
    workflow.add_node("plan_task", plan_task_node)
    workflow.add_node("select_model", select_model_node)
    workflow.add_node("execute_model", execute_model_node)
    workflow.add_node("validate_response", validate_response_node)
    workflow.add_node("finalize_task", finalize_task_node)

    # Set Entry Point
    workflow.set_entry_point("plan_task")

    # Add Edges
    workflow.add_edge("plan_task", "select_model")

    # Conditional Routing after Model Selection
    def check_selection_status(state: TaskExecutionState):
        if state.get("status") == "failed":
            return "finalize_task"
        return "execute_model"

    workflow.add_conditional_edges(
        "select_model",
        check_selection_status,
        {
            "finalize_task": "finalize_task",
            "execute_model": "execute_model",
        },
    )

    # Conditional Routing after Execution
    def check_execution_status(state: TaskExecutionState):
        if state.get("status") == "failed":
            return "finalize_task"
        return "validate_response"

    workflow.add_conditional_edges(
        "execute_model",
        check_execution_status,
        {
            "finalize_task": "finalize_task",
            "validate_response": "validate_response",
        },
    )

    workflow.add_edge("validate_response", "finalize_task")
    workflow.add_edge("finalize_task", END)

    return workflow.compile()


# Compile global graph
task_graph = build_task_graph()


async def execute_task_lifecycle(
    task_id: str,
    prompt: str,
    category: str = "general",
    event_callback: Optional[Callable[[Dict[str, Any]], Any]] = None,
) -> TaskExecutionState:
    """
    Executes the task lifecycle state machine step by step.
    Emits events to `event_callback` as they occur to power SSE live streaming.
    """
    state: TaskExecutionState = {
        "task_id": task_id,
        "prompt": prompt,
        "category": category,
        "status": "queued",
        "plan_steps": [],
        "current_step": "Task received",
        "selected_provider": None,
        "selected_model": None,
        "attempts": 0,
        "max_attempts": 3,
        "events": [],
        "response_content": None,
        "error_message": None,
        "error_category": None,
        "metadata": {},
    }

    nodes = [
        ("plan_task", plan_task_node),
        ("select_model", select_model_node),
        ("execute_model", execute_model_node),
        ("validate_response", validate_response_node),
        ("finalize_task", finalize_task_node),
    ]

    last_event_count = 0

    for node_name, node_fn in nodes:
        # Check if already terminated early
        if state.get("status") == "failed" and node_name not in ["finalize_task"]:
            continue

        logger.debug(f"[Lifecycle] Running step: {node_name}")
        updates = await node_fn(state)
        state.update(updates)

        # Notify SSE stream of new events generated during this step
        current_events = state.get("events", [])
        if len(current_events) > last_event_count and event_callback:
            for new_evt in current_events[last_event_count:]:
                try:
                    res = event_callback(new_evt)
                    if hasattr(res, "__await__"):
                        await res
                except Exception as emit_err:
                    logger.warning(f"Error in event callback: {emit_err}")
            last_event_count = len(current_events)

    return state
