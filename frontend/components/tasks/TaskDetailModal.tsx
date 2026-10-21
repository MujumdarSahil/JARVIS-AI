"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Terminal, 
  Activity, 
  CheckCircle2, 
  Radio, 
  Copy, 
  Check,
  Cpu,
  AlertTriangle,
  ListOrdered,
  Bot
} from "lucide-react";
import { Task, TaskEvent } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onTaskUpdated?: (updatedTask: Task) => void;
}

export function TaskDetailModal({ task: initialTask, onClose, onTaskUpdated }: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(initialTask);
  const [copied, setCopied] = useState(false);
  const [liveStreaming, setLiveStreaming] = useState(false);

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  // Live SSE Subscription for running/planning/queued tasks
  useEffect(() => {
    if (!task) return;
    if (task.status === "completed" || task.status === "failed") {
      setLiveStreaming(false);
      return;
    }

    setLiveStreaming(true);

    const unsubscribe = apiClient.subscribeToTaskEvents(
      task.task_id,
      (eventType, eventData) => {
        if (eventType === "task.snapshot") {
          setTask((prev) => (prev ? { ...prev, ...eventData } : prev));
          return;
        }

        // Handle single lifecycle event
        const newEvent: TaskEvent = {
          event_id: eventData.event_id || `evt_${Date.now()}`,
          timestamp: eventData.timestamp || new Date().toISOString(),
          type: eventType,
          message: eventData.message || "",
          details: eventData.details,
        };

        setTask((prev) => {
          if (!prev) return prev;
          const updatedEvents = [...prev.events, newEvent];
          let updatedStatus = prev.status;
          let updatedResult = prev.result;
          let selectedProvider = prev.selected_provider;
          let selectedModel = prev.selected_model;

          if (eventType === "task.status_changed") {
            updatedStatus = eventData.details?.stage === "planning" ? "planning" : prev.status;
          } else if (eventType === "task.model_selected") {
            updatedStatus = "running";
            selectedProvider = eventData.details?.provider || prev.selected_provider;
            selectedModel = eventData.details?.model_id || prev.selected_model;
          } else if (eventType === "task.completed") {
            updatedStatus = "completed";
            setLiveStreaming(false);
          } else if (eventType === "task.failed") {
            updatedStatus = "failed";
            setLiveStreaming(false);
          }

          const updated: Task = {
            ...prev,
            status: updatedStatus,
            events: updatedEvents,
            selected_provider: selectedProvider,
            selected_model: selectedModel,
            result: updatedResult,
          };

          if (onTaskUpdated) onTaskUpdated(updated);
          return updated;
        });

        // If completed, fetch full latest task from DB to get final result payload
        if (eventType === "task.completed" || eventType === "task.failed") {
          apiClient.getTaskById(task.task_id).then((refreshed) => {
            setTask(refreshed);
            if (onTaskUpdated) onTaskUpdated(refreshed);
          });
        }
      },
      (err) => {
        console.warn("SSE connection closed or error:", err);
        setLiveStreaming(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [task?.task_id, task?.status, onTaskUpdated]);

  if (!task) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(task.task_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFailed = task.status === "failed";
  const isCompleted = task.status === "completed";
  const isRunning = task.status === "running" || task.status === "planning";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl glass-panel-glow rounded-2xl max-h-[90vh] flex flex-col border border-jarvis-cyan/30 shadow-[0_0_30px_rgba(0,240,255,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-jarvis-border bg-jarvis-surface/60">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-jarvis-cyan">TASK INSPECTOR</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/20 uppercase">
                {task.category}
              </span>
              {liveStreaming && (
                <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-jarvis-cyan/20 text-jarvis-cyan animate-pulse border border-jarvis-cyan/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-jarvis-cyan" />
                  <span>SSE STREAMING</span>
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold font-mono text-jarvis-text line-clamp-1">
              {task.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-jarvis-muted hover:text-jarvis-text hover:bg-jarvis-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-jarvis-surface/80 border border-jarvis-border/80">
              <span className="text-[10px] font-mono uppercase text-jarvis-muted block">Task ID</span>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className="text-xs font-mono text-jarvis-text truncate">{task.task_id}</span>
                <button onClick={handleCopyId} className="text-jarvis-muted hover:text-jarvis-cyan">
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-jarvis-surface/80 border border-jarvis-border/80">
              <span className="text-[10px] font-mono uppercase text-jarvis-muted block">Status</span>
              <span className={`text-xs font-mono font-semibold uppercase mt-1 block ${
                isCompleted
                  ? "text-emerald-400"
                  : isFailed
                  ? "text-rose-400"
                  : "text-jarvis-cyan animate-pulse"
              }`}>
                {task.status}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-jarvis-surface/80 border border-jarvis-border/80">
              <span className="text-[10px] font-mono uppercase text-jarvis-muted block">Created</span>
              <span className="text-[11px] font-mono text-jarvis-text mt-1 block">
                {formatTimestamp(task.created_at)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-jarvis-surface/80 border border-jarvis-border/80">
              <span className="text-[10px] font-mono uppercase text-jarvis-muted block">Route</span>
              <span className="text-[11px] font-mono text-jarvis-cyan mt-1 block truncate">
                {task.selected_provider ? `${task.selected_provider}` : "Free Route"}
              </span>
            </div>
          </div>

          {/* Submitted Request Prompt */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-mono text-jarvis-muted uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5 text-jarvis-cyan" />
              <span>Natural-Language Directive</span>
            </div>
            <div className="p-4 rounded-xl bg-jarvis-surface border border-jarvis-border/80 font-mono text-xs text-jarvis-text whitespace-pre-wrap leading-relaxed select-text">
              {task.prompt}
            </div>
          </div>

          {/* Result Payload Card (When Completed or Failed) */}
          {task.result?.content && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2 text-emerald-400 uppercase tracking-wider font-semibold">
                  <Bot className="w-4 h-4" />
                  <span>Assistant Output</span>
                </div>
                {task.result.provider && (
                  <span className="text-[10px] font-mono text-jarvis-muted px-2 py-0.5 rounded bg-jarvis-surface border border-jarvis-border">
                    Generated via {task.result.provider}/{task.result.model}
                  </span>
                )}
              </div>
              <div className="p-5 rounded-xl bg-jarvis-surface/90 border border-emerald-500/30 text-xs text-slate-100 font-sans leading-relaxed whitespace-pre-wrap select-text shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                {task.result.content}
              </div>
            </div>
          )}

          {/* Error Banner (When Failed) */}
          {isFailed && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-rose-400 font-mono text-xs font-bold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Task Execution Failed</span>
              </div>
              <p className="text-xs text-rose-200/90 font-mono leading-relaxed">
                {task.result?.error || "Zero-paid routing policy: All eligible free routes were exhausted or unconfigured."}
              </p>
            </div>
          )}

          {/* LangGraph Plan Steps */}
          {task.plan_steps && task.plan_steps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-mono text-jarvis-muted uppercase tracking-wider">
                <ListOrdered className="w-3.5 h-3.5 text-jarvis-cyan" />
                <span>LangGraph Execution Plan</span>
              </div>
              <div className="p-3 rounded-xl bg-jarvis-surface/60 border border-jarvis-border space-y-1.5 text-xs font-mono">
                {task.plan_steps.map((step, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-jarvis-muted">
                    <span className="w-4 h-4 rounded-full bg-jarvis-border flex items-center justify-center text-[10px] text-jarvis-cyan">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Lifecycle Timeline */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-mono text-jarvis-muted uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-jarvis-cyan" />
              <span>Real-Time Event Stream ({task.events?.length || 0})</span>
            </div>

            {(!task.events || task.events.length === 0) ? (
              <p className="text-xs text-jarvis-muted font-mono italic">No events recorded.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-jarvis-border">
                {task.events.map((evt, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-jarvis-cyan ring-4 ring-jarvis-surface" />
                    <div className="p-3 rounded-lg bg-jarvis-surface/60 border border-jarvis-border/60 hover:border-jarvis-cyan/30 transition-colors">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-jarvis-cyan font-bold uppercase">{evt.type}</span>
                        <span className="text-jarvis-muted">{formatTimestamp(evt.timestamp)}</span>
                      </div>
                      <p className="text-xs font-mono text-jarvis-text mt-1">
                        {evt.message}
                      </p>
                      {evt.details && Object.keys(evt.details).length > 0 && (
                        <pre className="mt-2 text-[10px] font-mono text-jarvis-muted/80 bg-jarvis-dark/80 p-2 rounded overflow-x-auto">
                          {JSON.stringify(evt.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-jarvis-border bg-jarvis-surface/60 flex items-center justify-between">
          <span className="text-[11px] font-mono text-jarvis-muted">
            LangGraph + Zero-Paid Model Policy • Phase 2
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-jarvis-surface hover:bg-jarvis-border text-jarvis-text text-xs font-mono transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
