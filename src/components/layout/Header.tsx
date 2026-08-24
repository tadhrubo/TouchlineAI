"use client";

import React, { useState } from "react";
import { Bell, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";

interface HeaderProps {
  onRefresh?: () => void;
  onOpenNotifications?: () => void;
  notificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  onOpenNotifications,
  notificationCount = 2,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
            <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
          </div>
          <div className="flex items-baseline font-brand tracking-wider">
            <span className="text-base text-white">
              TOUCHLINE
            </span>
            <span className="ml-1 text-base text-emerald-400">
              AI
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            aria-label="Refresh live FPL data"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-all duration-200 active:scale-90"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`}
            />
          </button>

          {/* Notification Button */}
          <button
            onClick={onOpenNotifications}
            aria-label="View notifications"
            className="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all duration-200 active:scale-90"
          >
            <Bell className="w-3.5 h-3.5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                {notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
