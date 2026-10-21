"use client";

import React, { useState } from "react";
import { 
  Activity, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Server, 
  Laptop, 
  ShieldAlert,
  Clock
} from "lucide-react";
import { SystemStatusResponse, DatabaseHealth } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

interface SystemStatusPanelProps {
  systemStatus: SystemStatusResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
  apiConnected: boolean;
  dbHealth?: DatabaseHealth;
  error?: string | null;
}

export function SystemStatusPanel({
  systemStatus,
  isLoading,
  onRefresh,
  apiConnected,
  dbHealth,
  error,
}: SystemStatusPanelProps) {
  const isDbConnected = dbHealth?.status === "connected" || systemStatus?.database?.status === "connected";

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jarvis-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-jarvis-cyan" />
            <h2 className="text-xl font-bold font-mono text-jarvis-text tracking-wide">
              SYSTEM DIAGNOSTICS & TELEMETRY
            </h2>
          </div>
          <p className="text-xs text-jarvis-muted mt-1 font-mono">
            Live health verification of FastAPI backend, MongoDB, and local-first target constraints
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-jarvis-surface hover:bg-jarvis-card border border-jarvis-border text-xs font-mono text-jarvis-cyan transition-colors"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Ping Services</span>
        </button>
      </div>

      {/* Global Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between font-mono text-xs ${
        apiConnected && isDbConnected
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          : "bg-amber-500/10 border-amber-500/30 text-amber-300"
      }`}>
        <div className="flex items-center space-x-3">
          <span className={`w-3 h-3 rounded-full ${
            apiConnected && isDbConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
          }`} />
          <span className="font-bold">
            OVERALL SYSTEM HEALTH:{" "}
            {apiConnected && isDbConnected ? "100% OPERATIONAL (PHASE 1)" : "DEGRADED / ATTENTION REQUIRED"}
          </span>
        </div>
        <span className="text-[11px] text-jarvis-muted hidden sm:inline">
          Last Checked: {formatTimestamp(systemStatus?.timestamp || new Date().toISOString())}
        </span>
      </div>

      {/* Diagnostic Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: FastAPI Server */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-jarvis-cyan/10 border border-jarvis-cyan/20 text-jarvis-cyan">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-mono text-jarvis-text">FastAPI Backend</h3>
                <span className="text-[11px] font-mono text-jarvis-muted">http://127.0.0.1:8000</span>
              </div>
            </div>

            <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border uppercase ${
              apiConnected
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}>
              {apiConnected ? "ONLINE" : "UNREACHABLE"}
            </span>
          </div>

          <div className="space-y-2 pt-2 border-t border-jarvis-border/60 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-jarvis-border/30">
              <span className="text-jarvis-muted">Application:</span>
              <span className="text-jarvis-text font-semibold">{systemStatus?.app || "JARVIS"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-jarvis-border/30">
              <span className="text-jarvis-muted">API Version:</span>
              <span className="text-jarvis-cyan">{systemStatus?.version || "0.1.0-phase1"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-jarvis-border/30">
              <span className="text-jarvis-muted">Environment:</span>
              <span className="text-jarvis-text">{systemStatus?.environment || "development"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-jarvis-border/30">
              <span className="text-jarvis-muted">CORS Policy:</span>
              <span className="text-jarvis-text">Loopback Only (localhost:3000)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-jarvis-muted">Logging Level:</span>
              <span className="text-jarvis-text uppercase">{systemStatus?.api?.log_level || "INFO"}</span>
            </div>
          </div>
        </div>

        {/* Card 2: MongoDB Persistence */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-mono text-jarvis-text">MongoDB Primary</h3>
                <span className="text-[11px] font-mono text-jarvis-muted">mongodb://127.0.0.1:27017</span>
              </div>
            </div>

            <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border uppercase ${
              isDbConnected
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}>
              {isDbConnected ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </div>

          <div className="space-y-2 pt-2 border-t border-jarvis-border/60 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-jarvis-border/30">
              <span className="text-jarvis-muted">Database Name:</span>
              <span className="text-jarvis-text font-semibold">
                {systemStatus?.database?.database || dbHealth?.database || "jarvis"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-jarvis-border/30">
              <span className="text-jarvis-muted">Round-trip Ping:</span>
              <span className="text-jarvis-cyan">
                {systemStatus?.database?.latency_ms !== undefined
                  ? `${systemStatus.database.latency_ms} ms`
                  : dbHealth?.latency_ms !== undefined
                  ? `${dbHealth.latency_ms} ms`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-jarvis-border/30">
              <span className="text-jarvis-muted">Persistence Model:</span>
              <span className="text-jarvis-text">Motor AsyncIO Driver</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-jarvis-muted">Error State:</span>
              <span className={systemStatus?.database?.error ? "text-rose-400" : "text-emerald-400"}>
                {systemStatus?.database?.error || "None (Healthy)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Hardware Specifications Box */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold font-mono text-jarvis-text">
          <Laptop className="w-5 h-5 text-jarvis-cyan" />
          <span>Local-First Laptop Profile Constraints</span>
        </div>
        <p className="text-xs text-jarvis-muted font-mono">
          Architectural validation against the target Intel i5 / 8 GB RAM / ~90 GB free disk deployment profile.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-jarvis-surface border border-jarvis-border/80">
            <span className="text-[10px] font-mono uppercase text-jarvis-muted block">CPU Target</span>
            <span className="text-xs font-mono font-bold text-jarvis-text mt-1 block">Intel i5</span>
          </div>

          <div className="p-3 rounded-xl bg-jarvis-surface border border-jarvis-border/80">
            <span className="text-[10px] font-mono uppercase text-jarvis-muted block">RAM Target</span>
            <span className="text-xs font-mono font-bold text-jarvis-text mt-1 block">8 GB RAM</span>
          </div>

          <div className="p-3 rounded-xl bg-jarvis-surface border border-jarvis-border/80">
            <span className="text-[10px] font-mono uppercase text-jarvis-muted block">Local LLM Required</span>
            <span className="text-xs font-mono font-bold text-emerald-400 mt-1 block">False (Hosted Free)</span>
          </div>

          <div className="p-3 rounded-xl bg-jarvis-surface border border-jarvis-border/80">
            <span className="text-[10px] font-mono uppercase text-jarvis-muted block">Paid Fallback</span>
            <span className="text-xs font-mono font-bold text-rose-400 mt-1 block">Blocked by Design</span>
          </div>
        </div>
      </div>
    </div>
  );
}
