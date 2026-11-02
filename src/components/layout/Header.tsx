"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Bell, RefreshCw } from "lucide-react";

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
    <header className="sticky top-0 z-40 w-full bg-tl-bg border-b border-tl-border px-4 py-2">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <Image
            src="/asset/image/tlai.png"
            alt="Touchline AI Logo"
            width={24}
            height={24}
            className="w-6 h-6 object-contain"
            priority
          />
          <div className="flex items-baseline font-brand tracking-widest">
            <span className="text-sm font-bold text-tl-text">
              TOUCHLINE
            </span>
            <span className="ml-1 text-sm font-bold text-tl-accent">
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
            className="flex items-center justify-center min-w-[34px] min-h-[34px] rounded-sm bg-tl-surface border border-tl-border text-tl-muted hover:text-tl-text hover:bg-tl-surface2 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tl-accent active:scale-95"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-tl-muted ${
                isRefreshing ? "animate-spin text-tl-accent" : ""
              }`}
            />
          </button>

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            aria-label="Squad injury alerts"
            className="relative flex items-center justify-center min-w-[34px] min-h-[34px] rounded-sm bg-tl-surface border border-tl-border text-tl-muted hover:text-tl-text hover:bg-tl-surface2 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tl-accent active:scale-95"
          >
            <Bell className="w-3.5 h-3.5" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-tl-accent text-[9px] font-bold font-mono tabular-nums text-tl-accentContrast">
                {notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
