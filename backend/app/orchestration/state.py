from typing import TypedDict, List, Dict, Any, Optional


class TaskExecutionState(TypedDict, total=False):
    task_id: str
    prompt: str
    category: str
    status: str
    current_step: Optional[str]
    plan_steps: List[str]
    selected_provider: Optional[str]
    selected_model: Optional[str]
    response_content: Optional[str]
    error_message: Optional[str]
    error_category: Optional[str]
    events: List[Dict[str, Any]]
    retry_count: int
    clock_data: Optional[Dict[str, Any]]
