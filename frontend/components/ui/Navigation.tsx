"use client";

import React from "react";
import { 
  Terminal, 
  ListTodo, 
  Cpu, 
  Activity, 
  Settings as SettingsIcon,
  ShieldAlert
} from "lucide-react";
import { DatabaseHealth } from "@/lib/types";

export type ActiveTab = "command" | "tasks" | "capabilities" | "system" | "settings";

interface NavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  taskCount?: number;
  dbHealth?: DatabaseHealth;
  apiConnected: boolean;
}

export function Navigation({
  activeTab,
  onSelectTab,
  taskCount = 0,
  dbHealth,
  apiConnected,
}: NavigationProps) {
  const getStatusIndicator = () => {
    if (!apiConnected) {
      return {
        label: "API OFFLINE",
        color: "bg-rose-500",
        border: "border-rose-500/40",
        text: "text-rose-400",
      };
    }
    if (dbHealth?.status === "connected") {
      return {
        label: "ONLINE",
        color: "bg-jarvis-cyan animate-pulse",
        border: "border-jarvis-cyan/40",
        text: "text-jarvis-cyan",
      };
    }
    if (dbHealth?.status === "disconnected") {
      return {
        label: "DB DISCONNECTED",
        color: "bg-amber-500",
        border: "border-amber-500/40",
        text: "text-amber-400",
      };
    }
    return {
      label: "CHECKING",
      color: "bg-slate-500",
      border: "border-slate-500/40",
      text: "text-slate-400",
    };
  };

  const status = getStatusIndicator();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "command",
      label: "Command Center",
      icon: <Terminal className="w-4 h-4" />,
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: <ListTodo className="w-4 h-4" />,
      badge: taskCount,
    },
    {
      id: "capabilities",
      label: "Capabilities",
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      id: "system",
      label: "System Status",
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <SettingsIcon className="w-4 h-4" />,
    },
  ];

  return (
    <header className="border-b border-jarvis-border/80 bg-jarvis-dark/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab("command")}>
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-jarvis-surface border border-jarvis-cyan/30 text-jarvis-cyan shadow-[0_0_12px_rgba(0,240,255,0.25)]">
            <span className="font-mono font-bold text-sm tracking-wider">J</span>
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-jarvis-cyan" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold tracking-widest text-jarvis-text text-base">
                JARVIS
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/20">
                Phase 1
              </span>
            </div>
            <p className="text-[11px] text-jarvis-muted tracking-wide">Modular AI Assistant Foundation</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-jarvis-cyan/15 text-jarvis-cyan border border-jarvis-cyan/40 shadow-[0_0_10px_rgba(0,240,255,0.15)]"
                    : "text-jarvis-muted hover:text-jarvis-text hover:bg-jarvis-surface border border-transparent"
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? "bg-jarvis-cyan text-jarvis-dark font-bold" : "bg-jarvis-border text-jarvis-muted"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live System Indicator */}
        <div 
          onClick={() => onSelectTab("system")}
          className={`cursor-pointer flex items-center space-x-2 px-2.5 py-1 rounded-full border bg-jarvis-surface/80 text-[11px] font-mono tracking-wider ${status.border} ${status.text} transition-all hover:opacity-90`}
          title="Click to view live system diagnostics"
        >
          <span className={`w-2 h-2 rounded-full ${status.color}`} />
          <span className="hidden md:inline font-semibold">{status.label}</span>
        </div>
      </div>
    </header>
  );
}
