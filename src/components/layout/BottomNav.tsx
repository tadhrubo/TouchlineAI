"use client";

import React from "react";
import { Home, MessageSquareText, Sparkles } from "lucide-react";

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
      className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/90 border-t border-white/10 backdrop-blur-xl px-4 py-2 flex justify-center shadow-2xl"
    >
      <div className="flex items-center justify-around w-full max-w-sm">
        {/* Home Tab Button */}
        <button
          onClick={() => onChangeTab("home")}
          aria-label="Home Tab"
          className={`relative flex flex-col items-center justify-center w-28 py-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl ${
            activeTab === "home"
              ? "text-emerald-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {/* Active indicator bar */}
          {activeTab === "home" && (
            <div className="absolute -top-2 w-10 h-0.5 bg-emerald-400 rounded-full animate-fade-in" />
          )}
          <div
            className={`p-1 rounded-xl transition-all duration-200 ${
              activeTab === "home"
                ? "bg-emerald-500/10"
                : ""
            }`}
          >
            <Home className="w-5 h-5 transition-transform duration-200" aria-hidden="true" />
          </div>
          <span className="text-[11px] font-semibold tracking-wide mt-0.5">
            Home
          </span>
        </button>

        {/* Chat Tab Button */}
        <button
          onClick={() => onChangeTab("chat")}
          aria-label="Chat Tab"
          className={`relative flex flex-col items-center justify-center w-28 py-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl ${
            activeTab === "chat"
              ? "text-emerald-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {/* Active indicator bar */}
          {activeTab === "chat" && (
            <div className="absolute -top-2 w-10 h-0.5 bg-emerald-400 rounded-full animate-fade-in" />
          )}
          <div
            className={`relative p-1 rounded-xl transition-all duration-200 ${
              activeTab === "chat"
                ? "bg-emerald-500/10"
                : ""
            }`}
          >
            <MessageSquareText className="w-5 h-5 transition-transform duration-200" aria-hidden="true" />
            {/* Sparkle micro badge */}
            <Sparkles className="w-2.5 h-2.5 text-emerald-400 absolute -top-0.5 -right-0.5" aria-hidden="true" />
          </div>
          <span className="text-[11px] font-semibold tracking-wide mt-0.5 flex items-center gap-1">
            Chat
            {unreadChatCount > 0 && activeTab !== "chat" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </span>
        </button>
      </div>
    </nav>
  );
};
