"use client";

import React, { useState } from "react";
import { 
  Cpu, 
  CheckCircle2, 
  Clock, 
  Search, 
  Layers, 
  Globe, 
  FileText, 
  Database, 
  ShieldCheck, 
  Code2, 
  GitBranch,
  LayoutDashboard
} from "lucide-react";
import { Capability } from "@/lib/types";

interface CapabilitiesPanelProps {
  capabilities: Capability[];
  isLoading: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Layers: <Layers className="w-5 h-5" />,
  LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
  GitBranch: <GitBranch className="w-5 h-5" />,
  Cpu: <Cpu className="w-5 h-5" />,
  Globe: <Globe className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  Database: <Database className="w-5 h-5" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5" />,
  Code2: <Code2 className="w-5 h-5" />,
};

export function CapabilitiesPanel({ capabilities, isLoading }: CapabilitiesPanelProps) {
  const [filter, setFilter] = useState<"all" | "implemented" | "planned">("all");

  const filtered = capabilities.filter((c) => {
    if (filter === "implemented") return c.status === "implemented";
    if (filter === "planned") return c.status === "planned";
    return true;
  });

  const implementedCount = capabilities.filter((c) => c.status === "implemented").length;
  const plannedCount = capabilities.filter((c) => c.status === "planned").length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jarvis-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-jarvis-cyan" />
            <h2 className="text-xl font-bold font-mono text-jarvis-text tracking-wide">
              SYSTEM CAPABILITY MATRIX
            </h2>
          </div>
          <p className="text-xs text-jarvis-muted mt-1 font-mono">
            Modular assistant capabilities across the 5 test-gated implementation phases
          </p>
        </div>

        {/* Phase Statistics Pill */}
        <div className="flex items-center space-x-2 bg-jarvis-surface p-1.5 rounded-xl border border-jarvis-border text-xs font-mono">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filter === "all" ? "bg-jarvis-cyan/15 text-jarvis-cyan font-bold" : "text-jarvis-muted"
            }`}
          >
            All ({capabilities.length})
          </button>
          <button
            onClick={() => setFilter("implemented")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filter === "implemented" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-jarvis-muted"
            }`}
          >
            Active ({implementedCount})
          </button>
          <button
            onClick={() => setFilter("planned")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filter === "planned" ? "bg-blue-500/20 text-blue-400 font-bold" : "text-jarvis-muted"
            }`}
          >
            Roadmap ({plannedCount})
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-4 rounded-xl bg-jarvis-surface/80 border border-jarvis-border/80 text-xs text-jarvis-muted font-mono flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-emerald-400 font-semibold">Active in Phase 1:</span>
          <span>Foundation intake, MongoDB persistence, and responsive UI.</span>
        </div>
        <div className="hidden md:flex items-center space-x-2 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-blue-400">Future Phases:</span>
          <span>LangGraph, OmniRoute, Research, Memory, Coding MCP.</span>
        </div>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 text-jarvis-muted">
          <div className="w-7 h-7 border-2 border-jarvis-cyan border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Loading capabilities catalog...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cap) => {
            const isImplemented = cap.status === "implemented";
            const icon = ICON_MAP[cap.icon || "Cpu"] || <Cpu className="w-5 h-5" />;

            return (
              <div
                key={cap.id}
                className={`glass-panel rounded-xl p-5 flex flex-col justify-between space-y-4 transition-all ${
                  isImplemented
                    ? "border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-950/10"
                    : "border-jarvis-border/80 hover:border-jarvis-cyan/30 opacity-90"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-lg border ${
                      isImplemented
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-jarvis-surface border-jarvis-border text-jarvis-muted"
                    }`}>
                      {icon}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-jarvis-border/50 text-jarvis-muted">
                        {cap.phase}
                      </span>
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                        isImplemented
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {isImplemented ? "IMPLEMENTED" : "PLANNED"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold font-mono text-jarvis-text">
                      {cap.name}
                    </h3>
                    <p className="text-xs text-jarvis-muted mt-1 leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-jarvis-border/40 text-[11px] font-mono text-jarvis-muted/80">
                  {cap.details}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
