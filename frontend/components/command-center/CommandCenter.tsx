"use client";

import React, { useState } from "react";
import { 
  Send, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  Terminal, 
  ArrowRight,
  Database,
  Cpu,
  Layers,
  Activity,
  Bot
} from "lucide-react";
import { Task, DatabaseHealth } from "@/lib/types";
import { formatTimeAgo } from "@/lib/utils";
import { JarvisHologram } from "./JarvisHologram";

interface CommandCenterProps {
  tasks: Task[];
  isLoading: boolean;
  isSubmitting: boolean;
  activeTask?: Task | null;
  onSubmitTask: (prompt: string, category: string) => Promise<void>;
  onSelectTask: (task: Task) => void;
  onNavigateToTasks: () => void;
  onNavigateToSystem: () => void;
  apiConnected: boolean;
  dbHealth?: DatabaseHealth;
  error?: string | null;
}

const QUICK_ACTIONS = [
  {
    category: "research",
    label: "Survey Free AI Model Quotas",
    prompt: "Compare Groq LPUs, Google Gemini 1.5/2.0 free tiers, and OpenRouter :free models for token limits and latency.",
  },
  {
    category: "coding",
    label: "Review LangGraph Orchestration",
    prompt: "Analyze state transitions, bounded fallback loops, and zero-paid spend enforcement in this JARVIS implementation.",
  },
  {
    category: "file_analysis",
    label: "Extract System Architecture",
    prompt: "Summarize how MongoDB durable persistence, FastAPI REST API, and Server-Sent Events communicate with Next.js.",
  },
  {
    category: "general",
    label: "Run Full Assistant Diagnostics",
    prompt: "Check assistant status, verify zero-paid model routing allowlist, and confirm loopback network isolation.",
  },
];

export function CommandCenter({
  tasks,
  isLoading,
  isSubmitting,
  activeTask,
  onSubmitTask,
  onSelectTask,
  onNavigateToTasks,
  onNavigateToSystem,
  apiConnected,
  dbHealth,
  error,
}: CommandCenterProps) {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("general");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalError(null);

    const trimmed = prompt.trim();
    if (!trimmed) {
      setLocalError("Please enter a task description before submitting.");
      return;
    }

    try {
      await onSubmitTask(trimmed, category);
      setPrompt("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to dispatch task";
      setLocalError(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleApplyQuickAction = (actionPrompt: string, actionCategory: string) => {
    setPrompt(actionPrompt);
    setCategory(actionCategory);
    setLocalError(null);
  };

  // Derive Hologram state from active task or submitting state
  const hologramStatus = isSubmitting
    ? "planning"
    : activeTask?.status === "running"
    ? "running"
    : activeTask?.status === "planning"
    ? "planning"
    : activeTask?.status === "completed"
    ? "completed"
    : activeTask?.status === "failed"
    ? "failed"
    : "idle";

  const recentTasks = tasks.slice(0, 4);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner / System Status Alert if Disconnected */}
      {(!apiConnected || dbHealth?.status !== "connected") && (
        <div className="border border-amber-500/30 bg-amber-500/10 rounded-xl p-4 flex items-start space-x-3 backdrop-blur-sm">
          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-300">
              {!apiConnected ? "Backend API Unreachable" : "MongoDB Offline"}
            </h4>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              {!apiConnected
                ? "FastAPI server at http://127.0.0.1:8000 is not responding. Tasks cannot be processed until the backend server is started."
                : "MongoDB is not currently responding on 127.0.0.1:27017. Tasks require MongoDB to be persisted. You can inspect connection diagnostics in System Status."}
            </p>
          </div>
          <button
            onClick={onNavigateToSystem}
            className="text-xs px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-mono transition-colors"
          >
            Diagnostics
          </button>
        </div>
      )}

      {/* Hero / Central Hologram + Status Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl glass-panel-glow relative overflow-hidden">
        {/* Hologram Element */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <JarvisHologram status={hologramStatus} size={220} />
          <div className="absolute -bottom-2 text-center pointer-events-none">
            <span className="text-[10px] font-mono tracking-widest text-jarvis-cyan uppercase bg-jarvis-dark/80 px-2 py-0.5 rounded border border-jarvis-cyan/30">
              CORE STATUS: {hologramStatus.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Hero Content */}
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-jarvis-cyan/10 border border-jarvis-cyan/30 text-jarvis-cyan text-xs font-mono">
            <Bot className="w-3.5 h-3.5" />
            <span>PHASE 2 OPERATIONAL • LANGGRAPH + FREE LLM ROUTING</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-wide text-jarvis-text">
            JARVIS ASSISTANT COMMAND
          </h1>
          <p className="text-xs sm:text-sm text-jarvis-muted leading-relaxed max-w-xl">
            Autonomous multi-step planning powered by LangGraph. Executes requests through zero-paid
            Groq, Gemini, and OpenRouter routes with automatic fault-tolerant fallback.
          </p>

          {/* Active Task Live Pill */}
          {activeTask && (activeTask.status === "running" || activeTask.status === "planning") && (
            <div 
              onClick={() => onSelectTask(activeTask)}
              className="inline-flex items-center space-x-3 p-2.5 px-4 rounded-xl bg-jarvis-surface/90 border border-jarvis-cyan/40 hover:border-jarvis-cyan cursor-pointer transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] text-left"
            >
              <div className="w-3 h-3 rounded-full bg-jarvis-cyan animate-ping" />
              <div>
                <div className="flex items-center space-x-2 text-[11px] font-mono">
                  <span className="text-jarvis-cyan font-bold uppercase">{activeTask.status}</span>
                  <span className="text-jarvis-muted truncate max-w-xs">{activeTask.title}</span>
                </div>
                <div className="text-[10px] font-mono text-emerald-400">
                  {activeTask.selected_provider 
                    ? `Route: ${activeTask.selected_provider}/${activeTask.selected_model}` 
                    : "Formulating LangGraph execution plan..."}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Command Intake Section */}
      <div className="relative">
        <div className="glass-panel-glow rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-jarvis-border/60 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-jarvis-cyan/10 border border-jarvis-cyan/30 text-jarvis-cyan">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono tracking-wide text-jarvis-text">
                  NATURAL LANGUAGE DIRECTIVE
                </h2>
                <p className="text-xs text-jarvis-muted">
                  Dispatches to LangGraph • Free-only routing • Real-time SSE streaming
                </p>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-jarvis-muted">CATEGORY:</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-jarvis-surface text-xs font-mono text-jarvis-cyan border border-jarvis-border rounded-md px-2.5 py-1.5 focus:outline-none focus:border-jarvis-cyan transition-colors"
              >
                <option value="general">General Directive</option>
                <option value="research">Web Research</option>
                <option value="file_analysis">File / Document</option>
                <option value="coding">Code Review</option>
              </select>
            </div>
          </div>

          {/* Textarea Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                placeholder="Instruct JARVIS (e.g., 'Analyze how free-tier model fallback works in Phase 2')..."
                className="w-full bg-jarvis-surface/90 text-sm font-sans text-jarvis-text placeholder-jarvis-muted/60 border border-jarvis-border/80 rounded-xl p-4 focus:outline-none focus:border-jarvis-cyan focus:ring-1 focus:ring-jarvis-cyan transition-all resize-none font-mono"
              />
              <div className="absolute right-3 bottom-3 text-[11px] font-mono text-jarvis-muted pointer-events-none">
                {prompt.length} chars
              </div>
            </div>

            {(localError || error) && (
              <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{localError || error}</span>
              </div>
            )}

            {/* Input Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center space-x-2 text-[11px] font-mono text-jarvis-muted">
                <span className="px-1.5 py-0.5 rounded bg-jarvis-border text-jarvis-text">Ctrl</span>
                <span>+</span>
                <span className="px-1.5 py-0.5 rounded bg-jarvis-border text-jarvis-text">Enter</span>
                <span>to dispatch directive</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !prompt.trim()}
                className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  isSubmitting || !prompt.trim()
                    ? "bg-jarvis-surface text-jarvis-muted border border-jarvis-border cursor-not-allowed"
                    : "bg-jarvis-cyan hover:bg-cyan-400 text-jarvis-dark shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-jarvis-dark border-t-transparent rounded-full animate-spin" />
                    <span>Orchestrating...</span>
                  </>
                ) : (
                  <>
                    <span>Dispatch Directive</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Action Shortcuts */}
          <div className="pt-2 border-t border-jarvis-border/40">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-jarvis-cyan" />
              <span className="text-xs font-mono uppercase text-jarvis-muted tracking-wider">
                Quick Task Templates:
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {QUICK_ACTIONS.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyQuickAction(action.prompt, action.category)}
                  className="text-left p-3 rounded-lg bg-jarvis-surface/60 hover:bg-jarvis-surface border border-jarvis-border/60 hover:border-jarvis-cyan/40 transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-jarvis-text group-hover:text-jarvis-cyan transition-colors">
                    <span>{action.label}</span>
                    <span className="text-[10px] font-mono text-jarvis-muted uppercase px-1.5 py-0.5 rounded bg-jarvis-border/50">
                      {action.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-jarvis-muted mt-1 line-clamp-1">
                    {action.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Tasks Card */}
        <div 
          onClick={onNavigateToTasks}
          className="glass-panel rounded-xl p-5 cursor-pointer hover:border-jarvis-cyan/40 transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-mono uppercase text-jarvis-muted">Task Registry</div>
            <div className="text-2xl font-bold font-mono text-jarvis-text mt-1">
              {tasks.length}
            </div>
            <div className="text-[11px] text-jarvis-cyan flex items-center space-x-1 mt-1">
              <span>Inspect persistent records</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-jarvis-cyan/10 border border-jarvis-cyan/20 text-jarvis-cyan">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Database Status Card */}
        <div 
          onClick={onNavigateToSystem}
          className="glass-panel rounded-xl p-5 cursor-pointer hover:border-jarvis-cyan/40 transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-mono uppercase text-jarvis-muted">MongoDB Store</div>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${dbHealth?.status === "connected" ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
              <span className="text-sm font-bold font-mono text-jarvis-text uppercase">
                {dbHealth?.status === "connected" ? "Connected" : "Offline"}
              </span>
            </div>
            <div className="text-[11px] text-jarvis-muted mt-1 font-mono">
              {dbHealth?.latency_ms !== undefined ? `${dbHealth.latency_ms} ms latency` : "No latency data"}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
        </div>

        {/* Assistant Architecture Card */}
        <div className="glass-panel rounded-xl p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono uppercase text-jarvis-muted">Routing Policy</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
              Zero-Paid Enforced
            </div>
            <div className="text-[11px] text-jarvis-muted mt-1">
              Groq • Gemini • OpenRouter:free
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Tasks Queue Panel */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-jarvis-cyan" />
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-jarvis-text">
              Recent Task Executions
            </h3>
          </div>
          <button
            onClick={onNavigateToTasks}
            className="text-xs text-jarvis-cyan hover:underline font-mono flex items-center space-x-1"
          >
            <span>View All ({tasks.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-jarvis-muted">
            <div className="w-5 h-5 border-2 border-jarvis-cyan border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Retrieving tasks from MongoDB...</span>
          </div>
        ) : recentTasks.length === 0 ? (
          <div className="py-8 text-center rounded-xl border border-dashed border-jarvis-border/80 bg-jarvis-surface/40 p-6">
            <p className="text-sm text-jarvis-muted">No directives submitted yet.</p>
            <p className="text-xs text-jarvis-muted/70 mt-1">
              Dispatch a prompt above to trigger LangGraph and real free-model execution.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-jarvis-border/40">
            {recentTasks.map((t) => (
              <div
                key={t.task_id}
                onClick={() => onSelectTask(t)}
                className="py-3 px-2 flex items-center justify-between hover:bg-jarvis-surface/60 rounded-lg cursor-pointer transition-colors group"
              >
                <div className="space-y-1 flex-1 pr-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-semibold text-jarvis-text group-hover:text-jarvis-cyan transition-colors line-clamp-1">
                      {t.title}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/20">
                      {t.category}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-jarvis-muted font-mono">
                    <span>{t.task_id}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(t.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${
                    t.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : t.status === "failed"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : t.status === "running" || t.status === "planning"
                      ? "bg-jarvis-cyan/15 text-jarvis-cyan border-jarvis-cyan/30 animate-pulse"
                      : "bg-jarvis-surface text-jarvis-muted border-jarvis-border"
                  }`}>
                    {t.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-jarvis-muted group-hover:text-jarvis-cyan group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
