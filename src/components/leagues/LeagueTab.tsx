"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
  Users,
  ShieldAlert,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { LeaguePitchView } from "./LeaguePitchView";

interface ClassicLeague {
  id: number;
  name: string;
  entryRank: number;
  entryLastRank: number;
  rankCount: number;
  leagueType: string;
  scoring: string;
  startEvent: number;
}

interface ManagerRow {
  id: number;
  entry: number;
  name: string;
  teamName: string;
  rank: number;
  lastRank: number;
  rankChange: number;
  liveGwPoints: number;
  totalPoints: number;
  captainName: string;
  viceCaptainName: string;
  activeChip: string | null;
  transfers: number;
  teamValue: number;
  bank: number;
  playedCount: number;
  maxPlayedCount: number;
  starters: any[];
  bench: any[];
}

interface LeagueTabProps {
  entryId?: string;
  currentEntryId?: string;
}

export const LeagueTab: React.FC<LeagueTabProps> = ({
  entryId,
  currentEntryId,
}) => {
  const [leagues, setLeagues] = useState<ClassicLeague[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedLeagueName, setSelectedLeagueName] = useState<string>("");
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [gameweek, setGameweek] = useState<number>(1);
  const [totalManagersCount, setTotalManagersCount] = useState<number>(0);
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customLeagueInput, setCustomLeagueInput] = useState<string>("");
  const [isLoadingLeagues, setIsLoadingLeagues] = useState<boolean>(false);
  const [isLoadingStandings, setIsLoadingStandings] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Derive dynamic Entry ID from props or localStorage
  const rawId = entryId || currentEntryId;
  const activeEntryId =
    rawId && rawId.trim() !== ""
      ? rawId.trim()
      : typeof window !== "undefined"
      ? localStorage.getItem("touchline_fpl_entry_id") || "1"
      : "1";

  // 1. Fetch user's joined classic leagues dynamically
  const fetchUserLeagues = useCallback(async () => {
    if (!activeEntryId) return;
    setIsLoadingLeagues(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/league/user/${activeEntryId}`);
      if (!res.ok) throw new Error(`Failed to load user leagues (Status ${res.status})`);
      const data = await res.json();
      const classic = data.classicLeagues || [];
      setLeagues(classic);

      if (classic.length > 0) {
        setSelectedLeagueId((prev) => (prev !== null ? prev : classic[0].id));
        setSelectedLeagueName((prev) => (prev !== "" ? prev : classic[0].name));
      }
    } catch (err: any) {
      console.error("Error fetching leagues:", err);
      setErrorMsg(err.message || "Failed to load user leagues");
    } finally {
      setIsLoadingLeagues(false);
    }
  }, [activeEntryId]);

  useEffect(() => {
    fetchUserLeagues();
  }, [fetchUserLeagues]);

  // 2. Fetch standings for selected league
  const fetchLeagueStandings = useCallback(
    async (leagueId: number) => {
      setIsLoadingStandings(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`/api/league/${leagueId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch league standings (Status ${res.status})`);
        }
        const data = await res.json();
        setManagers(data.managers || []);
        setGameweek(data.gameweek || 1);
        setTotalManagersCount(data.league?.rankCount || data.totalCount || 0);
        if (data.league?.name) {
          setSelectedLeagueName(data.league.name);
        }
      } catch (err: any) {
        console.error("Error loading standings:", err);
        setErrorMsg(err.message || "Failed to load standings.");
      } finally {
        setIsLoadingStandings(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedLeagueId) {
      fetchLeagueStandings(selectedLeagueId);
    }
  }, [selectedLeagueId, fetchLeagueStandings]);

  const toggleExpand = (mgrEntry: number) => {
    setExpandedEntryId((prev) => (prev === mgrEntry ? null : mgrEntry));
  };

  const filteredManagers = managers.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.teamName.toLowerCase().includes(q) ||
      m.captainName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-3 pb-8 animate-fade-in relative">
      {/* 1. Header & Choose League Selector Bar */}
      <div className="p-3 rounded-xl bg-[#0B0E14] border border-white/[0.06] flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
              Live Mini-League Standings
            </p>
            <h2 className="text-sm font-semibold text-neutral-100 truncate">
              {isLoadingLeagues && !selectedLeagueName
                ? "Loading leagues..."
                : selectedLeagueName || "Choose League"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/[0.08] text-xs font-medium text-neutral-200 hover:text-emerald-400 hover:border-emerald-500/30 transition active:scale-95"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isLoadingLeagues
                ? "Loading..."
                : selectedLeagueName
                ? "Switch league"
                : "Choose league"}
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {selectedLeagueId && (
            <button
              onClick={() => fetchLeagueStandings(selectedLeagueId)}
              disabled={isLoadingStandings}
              aria-label="Refresh League"
              className="p-1.5 rounded-lg bg-neutral-900 border border-white/[0.08] text-neutral-300 hover:text-white transition active:scale-95 disabled:opacity-40"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoadingStandings ? "animate-spin text-emerald-400" : ""}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* 2. Search and Filter Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900/80 border border-white/[0.06]">
        <Search className="w-3.5 h-3.5 text-neutral-500" />
        <input
          type="text"
          placeholder="Search manager, team, or captain..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none font-sans"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-neutral-500 hover:text-neutral-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3. Error state notice if any */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 underline text-[11px] ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4. Standings Table / List */}
      {isLoadingStandings ? (
        <div className="w-full h-72 flex flex-col items-center justify-center p-8 rounded-xl bg-neutral-900/30 border border-white/[0.04] space-y-2.5">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
          <p className="text-xs font-mono text-neutral-400">
            Calculating live league ranks & picks for GW{gameweek}...
          </p>
        </div>
      ) : filteredManagers.length === 0 ? (
        <div className="w-full p-8 rounded-xl bg-[#0B0E14] border border-white/[0.06] text-center space-y-2">
          <Users className="w-6 h-6 text-neutral-500 mx-auto" />
          <p className="text-xs font-mono text-neutral-400">
            {searchQuery ? "No managers matched your search." : "No standings data available."}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Table Header Summary */}
          <div className="flex items-center justify-between px-3 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
            <div className="flex items-center gap-4">
              <span className="w-8">Rank</span>
              <span>Team & Manager</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Played</span>
              <span className="w-16 text-right">GW / Total</span>
            </div>
          </div>

          {/* Manager Rows */}
          {filteredManagers.map((mgr) => {
            const isExpanded = expandedEntryId === mgr.entry;
            const isUserTeam = String(mgr.entry) === String(activeEntryId);

            return (
              <div
                key={mgr.entry}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isUserTeam
                    ? "bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                    : isExpanded
                    ? "bg-[#0E121A] border-white/[0.12]"
                    : "bg-[#0B0E14] border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                {/* Clickable Header Row */}
                <button
                  onClick={() => toggleExpand(mgr.entry)}
                  className="w-full p-2.5 flex items-center justify-between text-left transition-colors active:bg-neutral-800/40"
                >
                  {/* Left: Rank & Manager Info */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Rank Badge + Movement */}
                    <div className="flex flex-col items-center justify-center w-8 flex-shrink-0">
                      <span className="text-xs font-mono font-bold text-neutral-100">
                        {mgr.rank}
                      </span>
                      <div className="flex items-center text-[9px] font-mono leading-none mt-0.5">
                        {mgr.rankChange > 0 ? (
                          <span className="text-emerald-400 flex items-center">
                            <ArrowUp className="w-2.5 h-2.5 inline" />
                            {mgr.rankChange}
                          </span>
                        ) : mgr.rankChange < 0 ? (
                          <span className="text-rose-400 flex items-center">
                            <ArrowDown className="w-2.5 h-2.5 inline" />
                            {Math.abs(mgr.rankChange)}
                          </span>
                        ) : (
                          <span className="text-neutral-500 flex items-center">
                            <Minus className="w-2.5 h-2.5 inline" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Team & Manager Details */}
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-neutral-100 truncate">
                          {mgr.teamName}
                        </span>
                        {isUserTeam && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            YOU
                          </span>
                        )}
                        {mgr.activeChip && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-extrabold bg-purple-950 text-purple-300 border border-purple-800">
                            {mgr.activeChip}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {mgr.name} · <span className="text-neutral-300 font-mono">C: {mgr.captainName}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Played Count & Points */}
                  <div className="flex items-center gap-3.5 flex-shrink-0 text-right">
                    {/* Played Counter */}
                    <div className="text-center font-mono">
                      <span className="text-[11px] text-neutral-300">
                        {mgr.playedCount}/{mgr.maxPlayedCount}
                      </span>
                    </div>

                    {/* Live GW & Total Points */}
                    <div className="w-16 font-mono text-right">
                      <div className="text-xs font-bold text-emerald-400">
                        {mgr.liveGwPoints} <span className="text-[10px] font-normal text-emerald-500">pts</span>
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {mgr.totalPoints} tot
                      </div>
                    </div>

                    {/* Expand Chevron */}
                    <div className="text-neutral-500">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Pitch View */}
                {isExpanded && (
                  <div className="p-2.5 pt-0 border-t border-white/[0.04] bg-black/40 animate-fade-in">
                    <LeaguePitchView
                      managerName={mgr.name}
                      teamName={mgr.teamName}
                      transfers={mgr.transfers}
                      teamValue={mgr.teamValue}
                      bank={mgr.bank}
                      playedCount={mgr.playedCount}
                      maxPlayedCount={mgr.maxPlayedCount}
                      activeChip={mgr.activeChip}
                      starters={mgr.starters}
                      bench={mgr.bench}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. "Choose League" Modal Overlay & Centered Card */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-sm max-h-[80vh] flex flex-col bg-[#131722] border border-gray-800 rounded-2xl p-5 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Choose league</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-gray-800 transition"
              >
                Close
              </button>
            </div>

            {/* Modal Body / League List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {isLoadingLeagues ? (
                <div className="py-8 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                  <span>Loading leagues...</span>
                </div>
              ) : leagues && leagues.length > 0 ? (
                leagues.map((lg) => (
                  <button
                    key={lg.id}
                    onClick={() => {
                      setSelectedLeagueId(lg.id);
                      setSelectedLeagueName(lg.name);
                      setIsModalOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      selectedLeagueId === lg.id
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                        : "bg-gray-900/50 border-gray-800/80 hover:bg-gray-800/60 text-gray-200"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-sm truncate block">{lg.name}</span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Rank: <strong className="text-emerald-400">#{lg.entryRank ? lg.entryRank.toLocaleString() : "N/A"}</strong> of {lg.rankCount ? lg.rankCount.toLocaleString() : "All"}
                      </span>
                    </div>
                    {selectedLeagueId === lg.id && <span className="text-xs text-emerald-400 font-bold">✓</span>}
                  </button>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-gray-400">
                  No mini-leagues found for this ID.
                </div>
              )}
            </div>

            {/* Quick League ID Input Fallback */}
            <div className="pt-3 border-t border-gray-800">
              <p className="text-[11px] text-gray-400 mb-2">Or enter League ID manually:</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const parsed = parseInt(customLeagueInput.trim(), 10);
                  if (!isNaN(parsed) && parsed > 0) {
                    setSelectedLeagueId(parsed);
                    setSelectedLeagueName(`League #${parsed}`);
                    setIsModalOpen(false);
                    setCustomLeagueInput("");
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="number"
                  placeholder="e.g. 280033"
                  value={customLeagueInput}
                  onChange={(e) => setCustomLeagueInput(e.target.value)}
                  className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!customLeagueInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition disabled:opacity-40"
                >
                  Load
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
