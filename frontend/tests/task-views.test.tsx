import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { Navigation } from "@/components/ui/Navigation";
import { Task } from "@/lib/types";

const mockTask: Task = {
  task_id: "task_abc123456789",
  title: "Analyze Market Landscape",
  prompt: "Analyze the current ecosystem for local-first AI assistants",
  category: "research",
  status: "completed",
  phase: "Phase 2 - Core Assistant (LangGraph + Free Models)",
  is_demo: false,
  selected_provider: "groq",
  selected_model: "llama-3.3-70b-versatile",
  result: {
    content: "Local-first AI assistants prioritize data privacy and low latency.",
    provider: "groq",
    model: "llama-3.3-70b-versatile",
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  events: [
    {
      event_id: "evt_1",
      timestamp: new Date().toISOString(),
      type: "task.created",
      message: "Task registered in queue",
    },
    {
      event_id: "evt_2",
      timestamp: new Date().toISOString(),
      type: "task.completed",
      message: "Task completed successfully via Groq.",
    },
  ],
};

describe("Task Views & Navigation", () => {
  it("renders TaskList and allows task selection", () => {
    const handleSelect = vi.fn();

    render(
      <TaskList
        tasks={[mockTask]}
        isLoading={false}
        onRefresh={vi.fn()}
        onSelectTask={handleSelect}
        onNavigateToCommand={vi.fn()}
      />
    );

    expect(screen.getByText(/TASK REGISTRY/i)).toBeInTheDocument();
    expect(screen.getByText("Analyze Market Landscape")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Analyze Market Landscape"));
    expect(handleSelect).toHaveBeenCalledWith(mockTask);
  });

  it("renders TaskDetailModal with events and assistant output", () => {
    const handleClose = vi.fn();

    render(<TaskDetailModal task={mockTask} onClose={handleClose} />);

    expect(screen.getByText("TASK INSPECTOR")).toBeInTheDocument();
    expect(screen.getByText("Analyze the current ecosystem for local-first AI assistants")).toBeInTheDocument();
    expect(screen.getByText(/Assistant Output/i)).toBeInTheDocument();
    expect(screen.getByText(/Local-first AI assistants prioritize data privacy/i)).toBeInTheDocument();
    expect(screen.getByText("Task registered in queue")).toBeInTheDocument();
    expect(screen.getByText("Task completed successfully via Groq.")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close"));
    expect(handleClose).toHaveBeenCalled();
  });

  it("renders Navigation with active tab indicator", () => {
    const handleSelectTab = vi.fn();

    render(
      <Navigation
        activeTab="command"
        onSelectTab={handleSelectTab}
        taskCount={3}
        dbHealth={{ status: "connected", database: "jarvis" }}
        apiConnected={true}
      />
    );

    expect(screen.getByText("JARVIS")).toBeInTheDocument();
    expect(screen.getByText("Command Center")).toBeInTheDocument();
    expect(screen.getByText("Capabilities")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Capabilities"));
    expect(handleSelectTab).toHaveBeenCalledWith("capabilities");
  });
});
