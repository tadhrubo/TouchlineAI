"use client";

import React from "react";
import { Home, MessageSquareText, Sparkles } from "lucide-react";

export type NavTab = "home" | "chat";

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  unreadChatCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  unreadChatCount = 1,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/90 shadow-[0_-8px_24px_rgba(0,0,0,0.5)]">
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-around">
        {/* Home Tab Button */}
        <button
          onClick={() => onChangeTab("home")}
          className={`relative flex flex-col items-center justify-center w-28 py-1.5 transition-all duration-200 ${
            activeTab === "home"
              ? "text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {/* Active indicator bar */}
          {activeTab === "home" && (
            <div className="absolute -top-3 w-12 h-1 bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-fade-in" />
          )}
          <div
            className={`p-1 rounded-xl transition-all duration-200 ${
              activeTab === "home"
                ? "bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                : ""
            }`}
          >
            <Home className="w-5 h-5 transition-transform duration-200" />
          </div>
          <span className="text-[11px] font-semibold tracking-wide mt-0.5">
            Home
          </span>
        </button>

        {/* Chat Tab Button */}
        <button
          onClick={() => onChangeTab("chat")}
          className={`relative flex flex-col items-center justify-center w-28 py-1.5 transition-all duration-200 ${
            activeTab === "chat"
              ? "text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {/* Active indicator bar */}
          {activeTab === "chat" && (
            <div className="absolute -top-3 w-12 h-1 bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-fade-in" />
          )}
          <div
            className={`relative p-1 rounded-xl transition-all duration-200 ${
              activeTab === "chat"
                ? "bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                : ""
            }`}
          >
            <MessageSquareText className="w-5 h-5 transition-transform duration-200" />
            {/* Sparkle micro badge */}
            <Sparkles className="w-2.5 h-2.5 text-emerald-400 absolute -top-0.5 -right-0.5 animate-pulse" />
          </div>
          <span className="text-[11px] font-semibold tracking-wide mt-0.5 flex items-center gap-1">
            Chat
            {unreadChatCount > 0 && activeTab !== "chat" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </span>
        </button>
      </div>
    </nav>
  );
};
