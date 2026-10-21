import uuid
from typing import List, Optional
from datetime import datetime, timezone
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError
from backend.app.database.connection import get_database
from backend.app.schemas.tasks import TaskCreateRequest, TaskResponse, TaskEvent
from backend.app.core.logging import logger


class DatabaseUnavailableException(Exception):
    """Raised when MongoDB is unreachable or operations time out."""
    pass


class TaskRepository:
    """Handles persistence of JARVIS tasks in MongoDB."""

    @classmethod
    def _get_collection(cls):
        db = get_database()
        return db.tasks

    @classmethod
    async def create_task(cls, request: TaskCreateRequest) -> TaskResponse:
        """
        Creates a new task document, stores it in MongoDB, and returns the TaskResponse.
        Raises DatabaseUnavailableException if MongoDB cannot be reached.
        """
        task_id = f"task_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        
        # Derive a short readable title from the prompt
        title = request.prompt.strip()
        if len(title) > 60:
            title = title[:57].rstrip() + "..."

        initial_event = TaskEvent(
            type="created",
            message=f"Task received and registered in Phase 1 queue.",
            details={"category": request.category},
        )

        phase1_notice_event = TaskEvent(
            type="phase1_notice",
            message="Phase 1 Foundation: Model execution and LangGraph planning are scheduled for Phase 2.",
            details={"is_placeholder": True},
        )

        task_data = {
            "_id": task_id,
            "task_id": task_id,
            "title": title,
            "prompt": request.prompt,
            "category": request.category,
            "status": "queued",
            "phase": "Phase 1 - Foundation & UI (No LLM executed)",
            "is_demo": True,
            "created_at": now,
            "updated_at": now,
            "events": [initial_event.model_dump(), phase1_notice_event.model_dump()],
            "metadata": request.metadata or {},
            "result": None,
        }

        try:
            collection = cls._get_collection()
            await collection.insert_one(task_data)
            logger.info(f"Task created and persisted: {task_id}")
        except (ServerSelectionTimeoutError, PyMongoError) as e:
            logger.error(f"Failed to persist task {task_id} to MongoDB: {e}")
            raise DatabaseUnavailableException(f"MongoDB persistence failed: {e}")

        return TaskResponse(
            task_id=task_id,
            title=title,
            prompt=request.prompt,
            category=request.category,
            status="queued",
            phase=task_data["phase"],
            is_demo=True,
            created_at=now,
            updated_at=now,
            events=[initial_event, phase1_notice_event],
            result=None,
        )

    @classmethod
    async def get_task_by_id(cls, task_id: str) -> Optional[TaskResponse]:
        """
        Retrieves a single task by its identifier from MongoDB.
        Raises DatabaseUnavailableException if MongoDB cannot be reached.
        """
        try:
            collection = cls._get_collection()
            doc = await collection.find_one({"_id": task_id})
            if not doc:
                return None

            return TaskResponse(
                task_id=doc.get("task_id", str(doc.get("_id"))),
                title=doc.get("title", "Untitled Task"),
                prompt=doc.get("prompt", ""),
                category=doc.get("category", "general"),
                status=doc.get("status", "queued"),
                phase=doc.get("phase", "Phase 1 - Foundation & UI"),
                is_demo=doc.get("is_demo", True),
                created_at=doc.get("created_at"),
                updated_at=doc.get("updated_at"),
                events=[TaskEvent(**evt) for evt in doc.get("events", [])],
                result=doc.get("result"),
            )
        except (ServerSelectionTimeoutError, PyMongoError) as e:
            logger.error(f"Failed to fetch task {task_id} from MongoDB: {e}")
            raise DatabaseUnavailableException(f"MongoDB fetch failed: {e}")

    @classmethod
    async def list_tasks(cls, limit: int = 50, skip: int = 0) -> List[TaskResponse]:
        """
        Retrieves recent tasks ordered by creation time descending.
        Raises DatabaseUnavailableException if MongoDB cannot be reached.
        """
        try:
            collection = cls._get_collection()
            cursor = collection.find().sort("created_at", -1).skip(skip).limit(limit)
            tasks: List[TaskResponse] = []
            async for doc in cursor:
                tasks.append(
                    TaskResponse(
                        task_id=doc.get("task_id", str(doc.get("_id"))),
                        title=doc.get("title", "Untitled Task"),
                        prompt=doc.get("prompt", ""),
                        category=doc.get("category", "general"),
                        status=doc.get("status", "queued"),
                        phase=doc.get("phase", "Phase 1 - Foundation & UI"),
                        is_demo=doc.get("is_demo", True),
                        created_at=doc.get("created_at"),
                        updated_at=doc.get("updated_at"),
                        events=[TaskEvent(**evt) for evt in doc.get("events", [])],
                        result=doc.get("result"),
                    )
                )
            return tasks
        except (ServerSelectionTimeoutError, PyMongoError) as e:
            logger.error(f"Failed to list tasks from MongoDB: {e}")
            raise DatabaseUnavailableException(f"MongoDB list failed: {e}")

    @classmethod
    async def update_task_fields(cls, task_id: str, fields: dict) -> bool:
        """
        Updates specific fields of an existing task document in MongoDB.
        """
        try:
            collection = cls._get_collection()
            result = await collection.update_one(
                {"_id": task_id},
                {"$set": fields},
            )
            return result.modified_count > 0
        except (ServerSelectionTimeoutError, PyMongoError) as e:
            logger.error(f"Failed to update task {task_id} in MongoDB: {e}")
            raise DatabaseUnavailableException(f"MongoDB update failed: {e}")
