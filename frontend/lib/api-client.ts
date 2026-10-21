import {
  HealthResponse,
  SystemStatusResponse,
  TaskListResponse,
  Task,
  CreateTaskPayload,
  Capability,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      const errJson = await res.json();
      detail = errJson.detail || errJson.error || JSON.stringify(errJson);
    } catch {
      detail = res.statusText;
    }
    throw new ApiError(detail || `Request failed with status ${res.status}`, res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const apiClient = {
  getBaseUrl(): string {
    return API_BASE;
  },

  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE}/api/health`, {
      method: "GET",
      cache: "no-store",
    });
    return handleResponse<HealthResponse>(res);
  },

  async getSystemStatus(): Promise<SystemStatusResponse> {
    const res = await fetch(`${API_BASE}/api/system/status`, {
      method: "GET",
      cache: "no-store",
    });
    return handleResponse<SystemStatusResponse>(res);
  },

  async getTasks(limit = 50, skip = 0): Promise<TaskListResponse> {
    const res = await fetch(`${API_BASE}/api/tasks?limit=${limit}&skip=${skip}`, {
      method: "GET",
      cache: "no-store",
    });
    return handleResponse<TaskListResponse>(res);
  },

  async getTaskById(taskId: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(taskId)}`, {
      method: "GET",
      cache: "no-store",
    });
    return handleResponse<Task>(res);
  },

  async createTask(payload: CreateTaskPayload): Promise<Task> {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<Task>(res);
  },

  async getCapabilities(): Promise<{ capabilities: Capability[]; total: number }> {
    const res = await fetch(`${API_BASE}/api/capabilities`, {
      method: "GET",
      cache: "no-store",
    });
    return handleResponse<{ capabilities: Capability[]; total: number }>(res);
  },

  /**
   * Subscribes to real-time task lifecycle updates via Server-Sent Events (SSE).
   * Returns a cleanup function to close the stream.
   */
  subscribeToTaskEvents(
    taskId: string,
    onEvent: (eventType: string, data: any) => void,
    onError?: (err: any) => void,
  ): () => void {
    const eventSource = new EventSource(`${API_BASE}/api/tasks/${encodeURIComponent(taskId)}/events`);

    const eventTypes = [
      "snapshot",
      "task.snapshot",
      "task.status_changed",
      "task.model_selected",
      "task.progress",
      "task.retry",
      "task.completed",
      "task.failed",
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          onEvent(type, data);
        } catch (e) {
          onEvent(type, event.data);
        }
      });
    });

    eventSource.onerror = (err) => {
      if (onError) onError(err);
    };

    return () => {
      eventSource.close();
    };
  },
};
