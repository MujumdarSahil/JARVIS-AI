import asyncio
import json
from datetime import datetime, timezone
from typing import Dict, List, AsyncGenerator, Optional
from backend.app.core.logging import logger
from backend.app.database.repositories import TaskRepository
from backend.app.orchestration.graph import execute_task_lifecycle


class TaskRunnerManager:
    """
    Coordinates asynchronous task execution, state persistence,
    and Server-Sent Events (SSE) broadcasting.
    """

    def __init__(self):
        # Maps task_id -> list of active subscriber asyncio.Queues
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}
        # Tracks tasks currently executing to avoid duplicate runs
        self._running_tasks: set[str] = set()

    def get_subscriber_queue(self, task_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        if task_id not in self._subscribers:
            self._subscribers[task_id] = []
        self._subscribers[task_id].append(queue)
        return queue

    def unsubscribe(self, task_id: str, queue: asyncio.Queue) -> None:
        if task_id in self._subscribers:
            try:
                self._subscribers[task_id].remove(queue)
                if not self._subscribers[task_id]:
                    del self._subscribers[task_id]
            except ValueError:
                pass

    async def broadcast_event(self, task_id: str, event: dict) -> None:
        """Broadcasts an event to all active SSE subscribers for this task."""
        if task_id in self._subscribers:
            for queue in list(self._subscribers[task_id]):
                try:
                    await queue.put(event)
                except Exception as e:
                    logger.warning(f"Failed to deliver event to subscriber: {e}")

    async def execute_task_in_background(self, task_id: str, prompt: str, category: str = "general") -> None:
        """Runs the LangGraph task lifecycle and broadcasts real events."""
        if task_id in self._running_tasks:
            logger.info(f"Task {task_id} is already executing.")
            return

        self._running_tasks.add(task_id)
        logger.info(f"[TaskRunner] Starting background execution for {task_id}")

        async def on_lifecycle_event(event: dict):
            # 1. Broadcast to live SSE listeners
            await self.broadcast_event(task_id, event)

        try:
            # Emit task.created / started event
            start_event = {
                "event_id": f"evt_{int(asyncio.get_event_loop().time() * 1000)}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "task.status_changed",
                "message": "Task dispatched to LangGraph orchestration engine.",
                "details": {"stage": "init"},
            }
            await on_lifecycle_event(start_event)

            # Execute LangGraph pipeline
            final_state = await execute_task_lifecycle(
                task_id=task_id,
                prompt=prompt,
                category=category,
                event_callback=on_lifecycle_event,
            )
            logger.info(f"[TaskRunner] Finished execution for {task_id} with status {final_state.get('status')}")

        except Exception as e:
            logger.error(f"[TaskRunner] Unhandled exception in background task {task_id}: {e}")
            fail_event = {
                "event_id": f"evt_{int(asyncio.get_event_loop().time() * 1000)}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "task.failed",
                "message": f"Execution error: {str(e)}",
                "details": {"error": str(e)},
            }
            await on_lifecycle_event(fail_event)
            # Update DB to failed
            try:
                await TaskRepository.update_task_fields(
                    task_id,
                    {"status": "failed", "result": {"error": str(e)}},
                )
            except Exception:
                pass
        finally:
            self._running_tasks.discard(task_id)


task_runner = TaskRunnerManager()
