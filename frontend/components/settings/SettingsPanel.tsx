"use client";

import React, { useState } from "react";
import { 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Palette, 
  Cpu, 
  Info, 
  Lock,
  Check
} from "lucide-react";

export function SettingsPanel() {
  const [themeAccent, setThemeAccent] = useState("cyan");
  const [saveLocalOnly, setSaveLocalOnly] = useState(true);
  const [telemetry, setTelemetry] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl pb-12">
      {/* Header */}
      <div className="border-b border-jarvis-border pb-4">
        <div className="flex items-center space-x-2">
          <SettingsIcon className="w-5 h-5 text-jarvis-cyan" />
          <h2 className="text-xl font-bold font-mono text-jarvis-text tracking-wide">
            SETTINGS & PREFERENCES
          </h2>
        </div>
        <p className="text-xs text-jarvis-muted mt-1 font-mono">
          System configuration shell • Client-side preferences and Phase 2 routing preview
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>Preferences updated locally.</span>
        </div>
      )}

      {/* 1. Appearance Section */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold font-mono text-jarvis-text">
          <Palette className="w-4 h-4 text-jarvis-cyan" />
          <span>Appearance & Design Tokens</span>
        </div>
        <p className="text-xs text-jarvis-muted">
          Adjust the sci-fi command center aesthetic and glow accents.
        </p>

        <div className="pt-2">
          <label className="text-xs font-mono text-jarvis-muted block mb-2">INTERFACE ACCENT COLOR</label>
          <div className="flex flex-wrap gap-3">
            {[
              { id: "cyan", label: "Jarvis Cyan (Default)", hex: "#00f0ff" },
              { id: "blue", label: "Cobalt Blue", hex: "#3b82f6" },
              { id: "emerald", label: "Matrix Emerald", hex: "#10b981" },
              { id: "amber", label: "Amber Warning", hex: "#f59e0b" },
            ].map((theme) => (
              <button
                key={theme.id}
                onClick={() => setThemeAccent(theme.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl border text-xs font-mono transition-all ${
                  themeAccent === theme.id
                    ? "border-jarvis-cyan bg-jarvis-surface text-jarvis-text shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                    : "border-jarvis-border bg-jarvis-surface/40 text-jarvis-muted hover:text-jarvis-text"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-black/40"
                  style={{ backgroundColor: theme.hex }}
                />
                <span>{theme.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Privacy & Data Boundaries */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold font-mono text-jarvis-text">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Local-First Privacy & Safety</span>
        </div>
        <p className="text-xs text-jarvis-muted">
          Data persistence boundaries strictly enforce local storage on your laptop.
        </p>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-jarvis-surface/60 border border-jarvis-border">
            <div>
              <span className="text-xs font-mono font-semibold text-jarvis-text block">
                Local-Only Persistence
              </span>
              <span className="text-[11px] text-jarvis-muted">
                Keep all task history and documents within local MongoDB (127.0.0.1:27017).
              </span>
            </div>
            <input
              type="checkbox"
              checked={saveLocalOnly}
              onChange={(e) => setSaveLocalOnly(e.target.checked)}
              className="w-4 h-4 rounded text-jarvis-cyan bg-jarvis-dark border-jarvis-border focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-jarvis-surface/60 border border-jarvis-border">
            <div>
              <span className="text-xs font-mono font-semibold text-jarvis-text block">
                Anonymous Telemetry
              </span>
              <span className="text-[11px] text-jarvis-muted">
                Zero external telemetry is sent. Strict offline boundaries.
              </span>
            </div>
            <input
              type="checkbox"
              checked={telemetry}
              onChange={(e) => setTelemetry(e.target.checked)}
              className="w-4 h-4 rounded text-jarvis-cyan bg-jarvis-dark border-jarvis-border focus:ring-0"
            />
          </div>
        </div>
      </div>

      {/* 3. Model Routing Shell (Phase 2 Preview) */}
      <div className="glass-panel rounded-2xl p-6 space-y-4 border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold font-mono text-blue-300">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>OmniRoute Model Routing (Phase 2 Shell)</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
            INACTIVE IN PHASE 1
          </span>
        </div>

        <p className="text-xs text-jarvis-muted">
          Future model routing configuration. In Phase 2, the OmniRoute adapter will strictly enforce
          free-tier model routes with zero paid fallback.
        </p>

        {/* Security Warning about browser API keys */}
        <div className="p-3.5 rounded-xl bg-jarvis-dark/80 border border-jarvis-border text-xs font-mono flex items-start space-x-3">
          <Lock className="w-4 h-4 text-jarvis-cyan mt-0.5 flex-shrink-0" />
          <div className="space-y-1 text-jarvis-muted">
            <span className="text-jarvis-text font-bold block">No Browser Secrets Stored</span>
            <p className="text-[11px] leading-relaxed">
              API credentials are never entered or stored in the frontend. All environment variables
              and future provider credentials reside exclusively on the local backend server via `.env`.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-jarvis-surface/40 border border-dashed border-jarvis-border space-y-2 text-xs font-mono text-jarvis-muted">
          <div className="flex justify-between">
            <span>Free-Only Routes Policy:</span>
            <span className="text-emerald-400 font-bold">Strictly Enforced (Phase 2)</span>
          </div>
          <div className="flex justify-between">
            <span>Paid Fallback Disabled:</span>
            <span className="text-emerald-400 font-bold">Hardcoded True</span>
          </div>
          <div className="flex justify-between">
            <span>Current Status:</span>
            <span className="text-amber-400 font-bold">Phase 1 Foundation Only</span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl bg-jarvis-cyan hover:bg-cyan-400 text-jarvis-dark text-xs font-mono font-semibold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)]"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}
