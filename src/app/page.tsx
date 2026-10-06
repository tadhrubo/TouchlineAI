"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Player, TeamStats, NewsItem } from "@/types/fpl";
import { HomeTab } from "@/components/home/HomeTab";
import { ChatTab } from "@/components/chat/ChatTab";
import {
  Home,
  MessageCircle,
  Bell,
  RefreshCw,
  Info,
  Sun,
  Moon,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"home" | "chat">("home");
  const [entryId, setEntryId] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [captainId, setCaptainId] = useState<string>("");
  const [viceCaptainId, setViceCaptainId] = useState<string>("");
  const [isLoadingSquad, setIsLoadingSquad] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Fetch live squad data for a specific entryId
  const loadSquadData = useCallback(async (targetId: string) => {
    if (!targetId) {
      setPlayers([]);
      setStats(null);
      return;
    }

    setIsLoadingSquad(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/fpl/${targetId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch squad data (Status ${res.status})`);
      }

      const data = await res.json();

      if (data.players && data.players.length > 0) {
        setPlayers(data.players);
        setStats(data.stats);
        setCaptainId(data.captainId || "");
        setViceCaptainId(data.viceCaptainId || "");

        // Build dynamic news / injury alerts based on squad players
        const liveNews: NewsItem[] = data.players
          .filter(
            (p: Player) => p.status && p.status !== "available" && p.news
          )
          .map((p: Player, idx: number) => ({
            id: `news-flag-${idx}`,
            player: p.webName,
            team: p.team,
            type: "injury" as const,
            severity: "warning" as const,
            headline: `${p.webName} (${p.teamShort}): ${p.news}`,
            detail: p.news || "",
            timeAgo: "Recent",
          }));

        setNews(liveNews);
      } else {
        throw new Error("No players returned for this FPL ID");
      }
    } catch (err: any) {
      console.error("Error loading squad data:", err);
      setErrorMsg(err.message || "Failed to load squad from FPL.");
    } finally {
      setIsLoadingSquad(false);
    }
  }, []);

  // Initialize theme and entryId from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    try {
      const storedTheme = localStorage.getItem("touchline_theme");
      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme);
        document.documentElement.setAttribute("data-theme", storedTheme);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(storedTheme);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const initial = prefersDark ? "dark" : "light";
        setTheme(initial);
        document.documentElement.setAttribute("data-theme", initial);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(initial);
      }
    } catch (e) {}

    const saved = localStorage.getItem("touchline_fpl_entry_id");
    if (saved && saved.trim() !== "") {
      setEntryId(saved);
      loadSquadData(saved);
    }
  }, [loadSquadData]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("touchline_theme", nextTheme);
      document.documentElement.setAttribute("data-theme", nextTheme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(nextTheme);
    } catch (e) {}
  };

  // Handler for user switching or entering an Entry ID
  const handleSelectEntryId = (newId: string) => {
    if (!newId || newId === entryId) return;
    setEntryId(newId);
    localStorage.setItem("touchline_fpl_entry_id", newId);
    loadSquadData(newId);
  };

  // Handler for clearing connected squad
  const handleClearEntryId = () => {
    setEntryId("");
    setPlayers([]);
    setStats(null);
    setNews([]);
    setCaptainId("");
    setViceCaptainId("");
    localStorage.removeItem("touchline_fpl_entry_id");
  };

  const handleRefresh = () => {
    if (entryId) {
      loadSquadData(entryId);
    }
  };

  const handleOpenChatWithPrompt = (prompt: string) => {
    setPendingChatPrompt(prompt);
    setActiveTab("chat");
  };

  const handleSetCaptain = (playerId: string) => {
    setCaptainId(playerId);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        isCaptain: p.id === playerId,
        multiplier: p.id === playerId ? 2 : 1,
      }))
    );
  };

  const handlePlayerClick = (player: Player) => {
    const prompt = `Tell me about ${player.fullName || player.webName} (${player.team}). Should I start or bench him for GW${stats?.nextGameweek || 1}?`;
    handleOpenChatWithPrompt(prompt);
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-tl-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/asset/image/tlai.png"
            alt="Touchline AI"
            width={40}
            height={40}
            className="w-10 h-10 object-contain"
            priority
          />
          <span className="text-xs font-mono uppercase tracking-widest text-tl-muted">Touchline AI</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-tl-bg text-tl-text font-sans antialiased overflow-hidden selection:bg-tl-accent/20 selection:text-tl-accent">
      {/* App Container */}
      <div className="w-full h-full flex flex-col relative bg-tl-bg overflow-hidden">
        
        {/* Top Global Header (Compressed by ~15-20% vertically) */}
        <header className="flex-shrink-0 z-50 w-full bg-tl-bg border-b border-tl-border px-4 md:px-6 py-2 flex items-center justify-between">
          {/* Logo with /asset/image/tlai.png */}
          <div className="flex items-center gap-2">
            <Image
              src="/asset/image/tlai.png"
              alt="Touchline AI Logo"
              width={22}
              height={22}
              className="w-5.5 h-5.5 object-contain"
              priority
            />
            <div className="flex items-baseline font-brand tracking-widest leading-none">
              <span className="text-xs md:text-sm font-bold text-tl-text">
                TOUCHLINE
              </span>
              <span className="text-xs md:text-sm font-bold text-tl-accent ml-1">
                AI
              </span>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5">
            {/* Minimal Theme Toggle: sun/moon icon only */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-sm bg-tl-surface border border-tl-border text-tl-muted hover:text-tl-text hover:bg-tl-surface2 transition active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tl-accent"
            >
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>

            {entryId && (
              <button
                onClick={handleRefresh}
                disabled={isLoadingSquad}
                aria-label="Refresh Data"
                className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-sm bg-tl-surface border border-tl-border text-tl-muted hover:text-tl-text hover:bg-tl-surface2 transition active:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tl-accent"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoadingSquad ? "animate-spin text-tl-accent" : ""}`}
                />
              </button>
            )}

            <button
              aria-label="Notifications"
              className="relative min-w-[34px] min-h-[34px] flex items-center justify-center rounded-sm bg-tl-surface border border-tl-border text-tl-muted hover:text-tl-text hover:bg-tl-surface2 transition active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tl-accent"
            >
              <Bell className="w-3.5 h-3.5" />
              {news.length > 0 && (
                <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-tl-accent text-[9px] font-bold font-mono tabular-nums text-tl-accentContrast">
                  {news.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Global Error Notice if any */}
        {errorMsg && (
          <div className="mx-4 mt-2 p-2 rounded-sm bg-tl-surface border border-tl-negative/40 text-tl-negative text-xs flex items-center justify-between flex-shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-tl-negative flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="font-medium underline text-[11px] text-tl-negative ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content Area: Flexes and takes available height */}
        <main
          className={`flex-1 min-h-0 flex flex-col ${
            activeTab === "home" ? "overflow-y-auto px-3.5 py-2 pb-6" : "overflow-hidden p-0"
          }`}
        >
          {activeTab === "home" ? (
            <HomeTab
              stats={stats}
              players={players}
              news={news}
              captainId={captainId}
              viceCaptainId={viceCaptainId}
              currentEntryId={entryId}
              isLoading={isLoadingSquad}
              onSelectEntryId={handleSelectEntryId}
              onClearEntryId={handleClearEntryId}
              onPlayerClick={handlePlayerClick}
              onOpenChatWithPrompt={handleOpenChatWithPrompt}
            />
          ) : (
            <ChatTab
              entryId={entryId}
              stats={stats}
              players={players}
              captainId={captainId}
              viceCaptainId={viceCaptainId}
              onSetCaptain={handleSetCaptain}
              pendingPrompt={pendingChatPrompt}
              onClearPendingPrompt={() => setPendingChatPrompt(null)}
            />
          )}
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="flex-shrink-0 z-50 w-full bg-tl-bg border-t border-tl-border px-8 py-2">
          <div className="max-w-md mx-auto flex items-center justify-around">
            {/* Home Tab Button */}
            <button
              onClick={() => setActiveTab("home")}
              className={`flex flex-col items-center gap-1 py-0.5 transition-colors ${
                activeTab === "home"
                  ? "text-tl-accent"
                  : "text-tl-muted hover:text-tl-text"
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Home</span>
            </button>

            {/* Chat Tab Button */}
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex flex-col items-center gap-1 py-0.5 transition-colors ${
                activeTab === "chat"
                  ? "text-tl-accent"
                  : "text-tl-muted hover:text-tl-text"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Analyst</span>
            </button>
          </div>
        </nav>

      </div>
    </div>
  );
}
