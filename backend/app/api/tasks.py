import asyncio
import json
from fastapi import APIRouter, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from backend.app.schemas.tasks import (
    TaskCreateRequest,
    TaskResponse,
    TaskListResponse,
)
from backend.app.database.repositories import TaskRepository, DatabaseUnavailableException
from backend.app.orchestration.runner import task_runner
from backend.app.core.logging import logger

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(request: TaskCreateRequest):
    """
    Validates and registers a new task.
    Persists the task document to MongoDB.
    Initializes LangGraph orchestration in the background.
    """
    try:
        task = await TaskRepository.create_task(request)
        # Dispatch background execution
        asyncio.create_task(
            task_runner.execute_task_in_background(task.task_id, task.prompt, task.category)
        )
        return task
    except DatabaseUnavailableException as e:
        logger.error(f"Task creation failed due to database unavailability: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB is offline or unreachable. Cannot persist new tasks.",
        )
    except Exception as e:
        logger.error(f"Unexpected error in create_task: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred while processing task.",
        )


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    limit: int = Query(default=50, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
):
    """Retrieves submitted tasks from MongoDB."""
    try:
        tasks = await TaskRepository.list_tasks(limit=limit, skip=skip)
        return TaskListResponse(
            tasks=tasks,
            total=len(tasks),
            database_connected=True,
        )
    except DatabaseUnavailableException:
        logger.warning("Tasks listing requested while MongoDB is offline")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB is offline. Unable to retrieve persisted tasks.",
        )
    except Exception as e:
        logger.error(f"Unexpected error listing tasks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error retrieving task list.",
        )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    """Retrieves details for a specific task by task_id."""
    try:
        task = await TaskRepository.get_task_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task '{task_id}' not found.",
            )
        return task
    except HTTPException:
        raise
    except DatabaseUnavailableException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB is offline. Unable to retrieve task details.",
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching task {task_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error retrieving task details.",
        )


@router.get("/{task_id}/events")
async def stream_task_events(task_id: str, request: Request):
    """
    Server-Sent Events (SSE) streaming endpoint for live task progress.
    Streams actual backend lifecycle events emitted by LangGraph and FreeModelRouter.
    """
    try:
        task = await TaskRepository.get_task_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task '{task_id}' not found.",
            )
    except DatabaseUnavailableException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB is offline. SSE streaming unavailable.",
        )

    # Ensure background task execution is active if still queued
    if task.status == "queued":
        asyncio.create_task(
            task_runner.execute_task_in_background(task.task_id, task.prompt, task.category)
        )

    queue = task_runner.get_subscriber_queue(task_id)

    async def event_generator():
        try:
            # 1. Send initial durable snapshot from MongoDB
            snapshot_payload = {
                "task_id": task.task_id,
                "status": task.status,
                "events": [e.model_dump(mode="json") for e in task.events],
                "result": task.result,
            }
            yield f"event: snapshot\ndata: {json.dumps(snapshot_payload)}\n\n"

            # If task is already finalized, finish stream cleanly
            if task.status in ["completed", "failed"]:
                return

            # 2. Stream live events from queue
            while True:
                # Check for client disconnect
                if await request.is_disconnected():
                    logger.info(f"SSE client disconnected from task {task_id}")
                    break

                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    evt_type = event.get("type", "task.progress")
                    yield f"event: {evt_type}\ndata: {json.dumps(event)}\n\n"

                    # If this event indicates terminal state, stop streaming
                    if evt_type in ["task.completed", "task.failed"]:
                        break

                except asyncio.TimeoutError:
                    # Keep-alive heartbeat ping to prevent connection timeout
                    yield f": heartbeat\n\n"

        finally:
            task_runner.unsubscribe(task_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
