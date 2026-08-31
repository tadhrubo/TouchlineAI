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

  // Initialize from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("touchline_fpl_entry_id");
    if (saved && saved.trim() !== "") {
      setEntryId(saved);
      loadSquadData(saved);
    }
  }, [loadSquadData]);

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/asset/image/tlai.png"
            alt="Touchline AI"
            width={48}
            height={48}
            className="w-12 h-12 object-contain animate-pulse"
            priority
          />
          <span className="text-xs font-mono text-neutral-500">Touchline AI</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-black font-sans antialiased overflow-hidden selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* App Container */}
      <div className="w-full h-full flex flex-col relative bg-black overflow-hidden">
        
        {/* Top Global Header (Fixed at top) */}
        <header className="flex-shrink-0 z-50 w-full bg-black/95 backdrop-blur-md border-b border-white/[0.06] px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-between">
          {/* Logo with /asset/image/tlai.png */}
          <div className="flex items-center gap-2">
            <Image
              src="/asset/image/tlai.png"
              alt="Touchline AI Logo"
              width={26}
              height={26}
              className="w-6 h-6 object-contain"
              priority
            />
            <div className="flex items-baseline font-brand tracking-wider">
              <span className="text-sm text-neutral-100">
                TOUCHLINE
              </span>
              <span className="text-sm text-emerald-400 ml-1">
                AI
              </span>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1">
            {entryId && (
              <button
                onClick={handleRefresh}
                disabled={isLoadingSquad}
                aria-label="Refresh Data"
                className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition active:scale-95 disabled:opacity-40"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoadingSquad ? "animate-spin text-emerald-400" : ""}`}
                />
              </button>
            )}

            <button
              aria-label="Notifications"
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition relative active:scale-95"
            >
              <Bell className="w-3.5 h-3.5" />
              {news.length > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>
        </header>

        {/* Global Error Notice if any */}
        {errorMsg && (
          <div className="mx-4 mt-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center justify-between flex-shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="font-medium underline text-[11px] text-rose-400 ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content Area: Flexes and takes available height */}
        <main
          className={`flex-1 min-h-0 flex flex-col ${
            activeTab === "home" ? "overflow-y-auto p-3.5 pb-6" : "overflow-hidden p-0"
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

        {/* Bottom Navigation Bar (Fixed at bottom naturally) */}
        <nav className="flex-shrink-0 z-50 w-full bg-black/95 backdrop-blur-md border-t border-white/[0.06] px-8 py-2.5">
          <div className="max-w-md mx-auto flex items-center justify-around">
            {/* Home Tab Button */}
            <button
              onClick={() => setActiveTab("home")}
              className={`flex flex-col items-center gap-1 py-0.5 transition-colors ${
                activeTab === "home"
                  ? "text-emerald-400"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="text-[10px] font-medium tracking-tight">Home</span>
            </button>

            {/* Chat Tab Button */}
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex flex-col items-center gap-1 py-0.5 transition-colors ${
                activeTab === "chat"
                  ? "text-emerald-400"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-[10px] font-medium tracking-tight">Touchline AI</span>
            </button>
          </div>
        </nav>

      </div>
    </div>
  );
}
