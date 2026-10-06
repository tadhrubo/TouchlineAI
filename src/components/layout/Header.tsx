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
    <header className="sticky top-0 z-40 w-full bg-black/90 backdrop-blur-md border-b border-white/10 px-4 py-2.5">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-400 text-slate-950 font-bold border border-emerald-300/40">
            <Sparkles className="w-4 h-4 fill-slate-950" />
          </div>
          <div className="flex items-baseline font-brand tracking-wider">
            <span className="text-base text-white">
              TOUCHLINE
            </span>
            <span className="ml-1 text-base text-emerald-400 font-bold">
              AI
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            aria-label="Refresh live FPL data"
            className="flex items-center justify-center min-w-[40px] min-h-[40px] rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:scale-95"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`}
            />
          </button>

          {/* Notification Button */}
          <button
            onClick={onOpenNotifications}
            aria-label="View notifications"
            className="relative flex items-center justify-center min-w-[40px] min-h-[40px] rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:scale-95"
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-bold font-mono tabular-nums text-gray-950 shadow-sm">
                {notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
