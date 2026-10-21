"use client";

import React, { useState } from "react";
import { 
  Search, 
  RotateCw, 
  Filter, 
  Clock, 
  ArrowRight, 
  Layers,
  AlertCircle
} from "lucide-react";
import { Task } from "@/lib/types";
import { formatTimestamp, formatTimeAgo } from "@/lib/utils";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectTask: (task: Task) => void;
  onNavigateToCommand: () => void;
}

export function TaskList({
  tasks,
  isLoading,
  onRefresh,
  onSelectTask,
  onNavigateToCommand,
}: TaskListProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.prompt.toLowerCase().includes(search.toLowerCase()) ||
      t.task_id.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || t.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jarvis-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-jarvis-cyan" />
            <h2 className="text-xl font-bold font-mono text-jarvis-text tracking-wide">
              TASK REGISTRY
            </h2>
          </div>
          <p className="text-xs text-jarvis-muted mt-1 font-mono">
            Persisted task lifecycle state from local MongoDB • Total: {tasks.length}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-jarvis-surface hover:bg-jarvis-card border border-jarvis-border text-xs font-mono text-jarvis-cyan transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={onNavigateToCommand}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-jarvis-cyan hover:bg-cyan-400 text-jarvis-dark font-mono text-xs font-semibold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)]"
          >
            <span>+ New Directive</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-jarvis-muted absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter tasks by prompt, title, or ID..."
            className="w-full bg-jarvis-surface border border-jarvis-border rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-jarvis-text placeholder-jarvis-muted focus:outline-none focus:border-jarvis-cyan transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-jarvis-muted" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-jarvis-surface border border-jarvis-border rounded-xl px-3 py-2 text-xs font-mono text-jarvis-text focus:outline-none focus:border-jarvis-cyan transition-colors"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="research">Web Research</option>
            <option value="file_analysis">File Analysis</option>
            <option value="coding">Coding</option>
          </select>
        </div>
      </div>

      {/* Task List Content */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 text-jarvis-muted">
          <div className="w-7 h-7 border-2 border-jarvis-cyan border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Fetching tasks from MongoDB...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-jarvis-border/80 bg-jarvis-surface/40 p-8 space-y-3">
          <AlertCircle className="w-8 h-8 text-jarvis-muted mx-auto" />
          <h4 className="text-sm font-semibold font-mono text-jarvis-text">No matching tasks found</h4>
          <p className="text-xs text-jarvis-muted max-w-sm mx-auto">
            {tasks.length === 0
              ? "No tasks have been registered yet. Dispatch your first task from the Command Center."
              : "Try adjusting your search query or category filter."}
          </p>
          {tasks.length === 0 && (
            <button
              onClick={onNavigateToCommand}
              className="mt-2 inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-jarvis-cyan text-jarvis-dark text-xs font-mono font-semibold"
            >
              <span>Go to Command Center</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.task_id}
              onClick={() => onSelectTask(task)}
              className="glass-panel rounded-xl p-4 sm:p-5 cursor-pointer hover:border-jarvis-cyan/40 hover:bg-jarvis-surface/70 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1 pr-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold text-jarvis-text group-hover:text-jarvis-cyan transition-colors">
                    {task.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/20">
                    {task.category}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-jarvis-border/50 text-jarvis-muted">
                    {task.task_id}
                  </span>
                </div>

                <p className="text-xs text-jarvis-muted line-clamp-2 font-mono">
                  {task.prompt}
                </p>

                <div className="flex items-center space-x-4 text-[11px] text-jarvis-muted font-mono">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-jarvis-muted" />
                    <span>{formatTimestamp(task.created_at)}</span>
                  </span>
                  <span>({formatTimeAgo(task.created_at)})</span>
                  <span>•</span>
                  <span>{task.events.length} event(s) logged</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-center">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-semibold">
                    {task.status}
                  </span>
                  <span className="text-[10px] font-mono text-jarvis-muted mt-1">
                    Phase 1 Placeholder
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-jarvis-muted group-hover:text-jarvis-cyan group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
