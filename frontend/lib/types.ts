export interface TaskEvent {
  event_id: string;
  timestamp: string;
  type: string;
  message: string;
  details?: Record<string, unknown> | null;
}

export interface TaskResult {
  content?: string | null;
  provider?: string | null;
  model?: string | null;
  error?: string | null;
}

export interface Task {
  task_id: string;
  title: string;
  prompt: string;
  category: string;
  status: "queued" | "planning" | "running" | "completed" | "failed";
  phase: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  plan_steps?: string[] | null;
  selected_provider?: string | null;
  selected_model?: string | null;
  events: TaskEvent[];
  result?: TaskResult | null;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  database_connected: boolean;
}

export interface CreateTaskPayload {
  prompt: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface DatabaseHealth {
  status: "connected" | "disconnected" | "error";
  database: string;
  latency_ms?: number | null;
  error?: string | null;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "unhealthy";
  app: string;
  version: string;
  environment: string;
  timestamp: string;
  services: {
    api: {
      status: string;
      host: string;
      port: number;
    };
    mongodb: DatabaseHealth;
  };
}

export interface Capability {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "implemented" | "planned" | "in_progress";
  phase: string;
  icon?: string;
  details?: string;
}

export interface SystemStatusResponse {
  timestamp: string;
  app: string;
  version: string;
  environment: string;
  api: {
    status: string;
    host: string;
    port: number;
    cors_origins: string[];
    log_level: string;
  };
  database: DatabaseHealth;
  hardware_target: {
    profile: string;
    cpu: string;
    ram: string;
    free_disk: string;
    local_llm_required: boolean;
    free_only_routing: string;
  };
}
