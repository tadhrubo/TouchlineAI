"use client";

import React from "react";
import { Home, MessageSquareText } from "lucide-react";

interface BottomNavProps {
  activeTab: "home" | "chat";
  onChangeTab: (tab: "home" | "chat") => void;
  unreadChatCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  unreadChatCount = 0,
}) => {
  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-tl-bg border-t border-tl-border px-4 py-2 flex justify-center select-none"
    >
      <div className="flex items-center justify-around w-full max-w-sm">
        {/* Home Tab Button */}
        <button
          onClick={() => onChangeTab("home")}
          aria-label="Home Tab"
          className={`relative flex flex-col items-center justify-center w-28 py-1 transition-colors rounded-sm ${
            activeTab === "home"
              ? "text-tl-accent"
              : "text-tl-muted hover:text-tl-text"
          }`}
        >
          {activeTab === "home" && (
            <div className="absolute -top-2 w-8 h-0.5 bg-tl-accent" />
          )}
          <Home className="w-4 h-4" aria-hidden="true" />
          <span className="text-[10px] font-mono font-semibold tracking-wider uppercase mt-0.5">
            Home
          </span>
        </button>

        {/* Chat Tab Button */}
        <button
          onClick={() => onChangeTab("chat")}
          aria-label="Analyst Desk"
          className={`relative flex flex-col items-center justify-center w-28 py-1 transition-colors rounded-sm ${
            activeTab === "chat"
              ? "text-tl-accent"
              : "text-tl-muted hover:text-tl-text"
          }`}
        >
          {activeTab === "chat" && (
            <div className="absolute -top-2 w-8 h-0.5 bg-tl-accent" />
          )}
          <div className="relative">
            <MessageSquareText className="w-4 h-4" aria-hidden="true" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-3 w-3 items-center justify-center rounded-sm bg-tl-accent text-[8px] font-bold font-mono text-tl-accentContrast">
                {unreadChatCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono font-semibold tracking-wider uppercase mt-0.5">
            Analyst
          </span>
        </button>
      </div>
    </nav>
  );
};
