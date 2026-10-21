"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navigation, ActiveTab } from "@/components/ui/Navigation";
import { CommandCenter } from "@/components/command-center/CommandCenter";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { CapabilitiesPanel } from "@/components/capabilities/CapabilitiesPanel";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { SystemStatusPanel } from "@/components/system/SystemStatusPanel";
import { apiClient } from "@/lib/api-client";
import { Task, DatabaseHealth, SystemStatusResponse, Capability } from "@/lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("command");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | undefined>(undefined);
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(true);
  const [isLoadingCaps, setIsLoadingCaps] = useState<boolean>(true);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Poll system and database health
  const refreshHealthAndStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const statusRes = await apiClient.getSystemStatus();
      setSystemStatus(statusRes);
      setDbHealth(statusRes.database);
      setApiConnected(true);
    } catch {
      setApiConnected(false);
      setDbHealth({
        status: "disconnected",
        database: "jarvis",
        error: "Backend API offline or unreachable at 127.0.0.1:8000",
      });
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  // Fetch submitted tasks from MongoDB
  const refreshTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.getTasks();
      setTasks(res.tasks || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load tasks";
      setErrorMessage(msg);
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  // Fetch capabilities matrix
  const refreshCapabilities = useCallback(async () => {
    setIsLoadingCaps(true);
    try {
      const res = await apiClient.getCapabilities();
      setCapabilities(res.capabilities || []);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingCaps(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    refreshHealthAndStatus();
    refreshTasks();
    refreshCapabilities();

    const interval = setInterval(() => {
      refreshHealthAndStatus();
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshHealthAndStatus, refreshTasks, refreshCapabilities]);

  // Submit a new task & launch real-time SSE listener
  const handleCreateTask = async (prompt: string, category: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const newTask = await apiClient.createTask({ prompt, category });
      setTasks((prev) => [newTask, ...prev.filter((t) => t.task_id !== newTask.task_id)]);
      setActiveTask(newTask);
      setSelectedTask(newTask); // Open details immediately to show live SSE events
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Task submission failed";
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTaskUpdated = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.task_id === updated.task_id ? updated : t)));
    if (activeTask?.task_id === updated.task_id) {
      setActiveTask(updated);
    }
    if (selectedTask?.task_id === updated.task_id) {
      setSelectedTask(updated);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        taskCount={tasks.length}
        dbHealth={dbHealth}
        apiConnected={apiConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === "command" && (
          <CommandCenter
            tasks={tasks}
            isLoading={isLoadingTasks}
            isSubmitting={isSubmitting}
            activeTask={activeTask}
            onSubmitTask={handleCreateTask}
            onSelectTask={setSelectedTask}
            onNavigateToTasks={() => setActiveTab("tasks")}
            onNavigateToSystem={() => setActiveTab("system")}
            apiConnected={apiConnected}
            dbHealth={dbHealth}
            error={errorMessage}
          />
        )}

        {activeTab === "tasks" && (
          <TaskList
            tasks={tasks}
            isLoading={isLoadingTasks}
            onRefresh={refreshTasks}
            onSelectTask={setSelectedTask}
            onNavigateToCommand={() => setActiveTab("command")}
          />
        )}

        {activeTab === "capabilities" && (
          <CapabilitiesPanel
            capabilities={capabilities}
            isLoading={isLoadingCaps}
          />
        )}

        {activeTab === "system" && (
          <SystemStatusPanel
            systemStatus={systemStatus}
            isLoading={isLoadingStatus}
            onRefresh={refreshHealthAndStatus}
            apiConnected={apiConnected}
            dbHealth={dbHealth}
            error={errorMessage}
          />
        )}

        {activeTab === "settings" && <SettingsPanel />}
      </main>

      {/* Task Details Modal with SSE Live Updates */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={handleTaskUpdated}
      />

      {/* Footer */}
      <footer className="border-t border-jarvis-border/60 py-4 bg-jarvis-dark/60 text-center text-xs font-mono text-jarvis-muted">
        JARVIS Personal AI Assistant • Phase 2 Core (LangGraph + Zero-Paid Free Routing)
      </footer>
    </div>
  );
}
