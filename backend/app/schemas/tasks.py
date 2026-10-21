import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from backend.app.schemas.common import utc_now


class TaskCreateRequest(BaseModel):
    """User request to initiate a new task."""
    prompt: str = Field(..., min_length=1, max_length=10000, description="The natural language task description")
    category: str = Field(default="general", description="Task category: general, research, file_analysis, coding")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Optional metadata")

    @field_validator("prompt")
    @classmethod
    def validate_prompt_not_whitespace(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Task prompt cannot be empty or solely whitespace")
        return trimmed


class TaskEvent(BaseModel):
    """Observable lifecycle event for a task."""
    event_id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:8]}")
    timestamp: datetime = Field(default_factory=utc_now)
    type: str = Field(..., description="Event type: task.created, task.status_changed, task.model_selected, task.progress, task.completed, task.failed")
    message: str = Field(..., description="Human-readable event message")
    details: Optional[Dict[str, Any]] = Field(default=None)


class TaskResponse(BaseModel):
    """Structured response representing a JARVIS task."""
    task_id: str
    title: str
    prompt: str
    category: str = "general"
    status: str = Field(default="queued", description="Status: queued, planning, running, completed, failed")
    phase: str = "Phase 2 - Core Assistant (LangGraph + Free Models)"
    is_demo: bool = False
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    plan_steps: Optional[List[str]] = None
    selected_provider: Optional[str] = None
    selected_model: Optional[str] = None
    events: List[TaskEvent] = Field(default_factory=list)
    result: Optional[Dict[str, Any]] = None


class TaskListResponse(BaseModel):
    """List of tasks returned to the client."""
    tasks: List[TaskResponse]
    total: int
    database_connected: bool
