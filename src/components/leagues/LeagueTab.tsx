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
  Sparkles,
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
  currentEntryId: string;
}

export const LeagueTab: React.FC<LeagueTabProps> = ({ currentEntryId }) => {
  const [leagues, setLeagues] = useState<ClassicLeague[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedLeagueName, setSelectedLeagueName] = useState<string>("");
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [gameweek, setGameweek] = useState<number>(1);
  const [totalManagersCount, setTotalManagersCount] = useState<number>(0);
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoadingLeagues, setIsLoadingLeagues] = useState<boolean>(false);
  const [isLoadingStandings, setIsLoadingStandings] = useState<boolean>(false);
  const [showLeagueModal, setShowLeagueModal] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch user's joined classic leagues
  const fetchUserLeagues = useCallback(async () => {
    if (!currentEntryId) return;
    setIsLoadingLeagues(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/league/user/${currentEntryId}`);
      if (!res.ok) throw new Error(`Failed to load user leagues (Status ${res.status})`);
      const data = await res.json();
      const classic = data.classicLeagues || [];
      setLeagues(classic);

      if (classic.length > 0 && !selectedLeagueId) {
        setSelectedLeagueId(classic[0].id);
        setSelectedLeagueName(classic[0].name);
      }
    } catch (err: any) {
      console.error("Error fetching leagues:", err);
      setErrorMsg(err.message || "Failed to load user leagues");
    } finally {
      setIsLoadingLeagues(false);
    }
  }, [currentEntryId, selectedLeagueId]);

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
        setSelectedLeagueName(data.league?.name || selectedLeagueName);
      } catch (err: any) {
        console.error("Error loading standings:", err);
        setErrorMsg(err.message || "Failed to load standings.");
      } finally {
        setIsLoadingStandings(false);
      }
    },
    [selectedLeagueName]
  );

  useEffect(() => {
    if (selectedLeagueId) {
      fetchLeagueStandings(selectedLeagueId);
    }
  }, [selectedLeagueId, fetchLeagueStandings]);

  const handleSelectLeague = (league: ClassicLeague) => {
    setSelectedLeagueId(league.id);
    setSelectedLeagueName(league.name);
    setShowLeagueModal(false);
  };

  const toggleExpand = (entryId: number) => {
    setExpandedEntryId((prev) => (prev === entryId ? null : entryId));
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
    <div className="w-full space-y-3 pb-8 animate-fade-in">
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
              {selectedLeagueName || "Select a League"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowLeagueModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/[0.08] text-xs font-medium text-neutral-200 hover:text-emerald-400 hover:border-emerald-500/30 transition active:scale-95"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Choose league</span>
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
            const isUserTeam = String(mgr.entry) === String(currentEntryId);

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

      {/* 5. "Choose League" Modal / Bottom Sheet */}
      {showLeagueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#0E121A] border border-white/[0.1] shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-neutral-100">
                  Choose League
                </h3>
              </div>
              <button
                onClick={() => setShowLeagueModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-3 space-y-1.5">
              {isLoadingLeagues ? (
                <div className="py-8 text-center text-xs font-mono text-neutral-400">
                  <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin mx-auto mb-2" />
                  Loading your leagues...
                </div>
              ) : leagues.length === 0 ? (
                <div className="py-6 text-center text-xs font-mono text-neutral-400">
                  No classic leagues found for Entry #{currentEntryId}.
                </div>
              ) : (
                leagues.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleSelectLeague(l)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      selectedLeagueId === l.id
                        ? "bg-emerald-950/30 border-emerald-500/40 text-neutral-100"
                        : "bg-neutral-900/60 border-white/[0.04] text-neutral-300 hover:border-white/[0.12] hover:bg-neutral-800/50"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-neutral-100 truncate">
                        {l.name}
                      </p>
                      <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        Rank: <strong className="text-emerald-400">#{l.entryRank?.toLocaleString() || "N/A"}</strong> of {l.rankCount?.toLocaleString() || "All"}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-neutral-800 border border-white/[0.06] text-neutral-400 flex-shrink-0">
                      {l.leagueType}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="p-3 border-t border-white/[0.06] bg-neutral-950/60 text-center">
              <p className="text-[11px] font-mono text-neutral-400">
                Data refreshed live from official FPL standings
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
