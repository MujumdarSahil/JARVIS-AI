import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommandCenter } from "@/components/command-center/CommandCenter";
import { Task } from "@/lib/types";

const mockTasks: Task[] = [
  {
    task_id: "task_123456789abc",
    title: "Test Task Title",
    prompt: "This is a test prompt",
    category: "general",
    status: "queued",
    phase: "Phase 2 - Core Assistant (LangGraph + Free Models)",
    is_demo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    events: [
      {
        event_id: "evt_1",
        timestamp: new Date().toISOString(),
        type: "created",
        message: "Task created in queue",
      },
    ],
  },
];

describe("CommandCenter Component", () => {
  it("renders command center intake, hologram, and quick actions", () => {
    render(
      <CommandCenter
        tasks={mockTasks}
        isLoading={false}
        isSubmitting={false}
        onSubmitTask={vi.fn()}
        onSelectTask={vi.fn()}
        onNavigateToTasks={vi.fn()}
        onNavigateToSystem={vi.fn()}
        apiConnected={true}
        dbHealth={{ status: "connected", database: "jarvis", latency_ms: 1.0 }}
      />
    );

    expect(screen.getByText(/JARVIS ASSISTANT COMMAND/i)).toBeInTheDocument();
    expect(screen.getByText(/NATURAL LANGUAGE DIRECTIVE/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Instruct JARVIS/i)).toBeInTheDocument();
    expect(screen.getByText(/Survey Free AI Model Quotas/i)).toBeInTheDocument();
    expect(screen.getByText("Test Task Title")).toBeInTheDocument();
  });

  it("submits prompt when dispatch button is clicked", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CommandCenter
        tasks={[]}
        isLoading={false}
        isSubmitting={false}
        onSubmitTask={handleSubmit}
        onSelectTask={vi.fn()}
        onNavigateToTasks={vi.fn()}
        onNavigateToSystem={vi.fn()}
        apiConnected={true}
        dbHealth={{ status: "connected", database: "jarvis" }}
      />
    );

    const input = screen.getByPlaceholderText(/Instruct JARVIS/i);
    fireEvent.change(input, { target: { value: "Perform system verification" } });

    const submitBtn = screen.getByRole("button", { name: /Dispatch Directive/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith("Perform system verification", "general");
    });
  });

  it("displays backend offline banner when api is disconnected", () => {
    render(
      <CommandCenter
        tasks={[]}
        isLoading={false}
        isSubmitting={false}
        onSubmitTask={vi.fn()}
        onSelectTask={vi.fn()}
        onNavigateToTasks={vi.fn()}
        onNavigateToSystem={vi.fn()}
        apiConnected={false}
        dbHealth={{ status: "disconnected", database: "jarvis" }}
      />
    );

    expect(screen.getByText(/Backend API Unreachable/i)).toBeInTheDocument();
    expect(screen.getByText(/FastAPI server at http:\/\/127.0.0.1:8000 is not responding/i)).toBeInTheDocument();
  });

  it("applies template prompt when quick action clicked", () => {
    render(
      <CommandCenter
        tasks={[]}
        isLoading={false}
        isSubmitting={false}
        onSubmitTask={vi.fn()}
        onSelectTask={vi.fn()}
        onNavigateToTasks={vi.fn()}
        onNavigateToSystem={vi.fn()}
        apiConnected={true}
        dbHealth={{ status: "connected", database: "jarvis" }}
      />
    );

    const quickBtn = screen.getByText(/Survey Free AI Model Quotas/i);
    fireEvent.click(quickBtn);

    const textarea = screen.getByPlaceholderText(/Instruct JARVIS/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain("Compare Groq LPUs, Google Gemini 1.5/2.0 free tiers");
  });
});
