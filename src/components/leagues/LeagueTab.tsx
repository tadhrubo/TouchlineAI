"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
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
} from "lucide-react";
import { LeaguePitchView } from "./LeaguePitchView";
import { BadgeLegend } from "../fpl/BadgeLegend";
import { calculateNetTransfers } from "@/utils/fplTransfers";

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
  transfersCost?: number;
  eventTransfersCost?: number;
  ft_available?: number;
  ftAvailable?: number;
  ft_left?: number;
  ftLeft?: number;
  active_transfers?: Array<{ in: string; out: string }>;
  activeTransfers?: Array<{ in: string; out: string }>;
  teamValue: number;
  bank: number;
  playedCount: number;
  yetCount?: number;
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
  const [mounted, setMounted] = useState<boolean>(false);
  const [leagues, setLeagues] = useState<ClassicLeague[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedLeagueName, setSelectedLeagueName] = useState<string>("");
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [gameweek, setGameweek] = useState<number>(1);
  const [totalManagersCount, setTotalManagersCount] = useState<number>(0);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [layoutMode, setLayoutMode] = useState<"list" | "pitch">("list");
  const [autosubsEnabled, setAutosubsEnabled] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customLeagueInput, setCustomLeagueInput] = useState<string>("");
  const [isLoadingLeagues, setIsLoadingLeagues] = useState<boolean>(false);
  const [isLoadingStandings, setIsLoadingStandings] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Client-side mount flag for React Portals
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const toggleManager = (entry: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entry)) {
        next.delete(entry);
      } else {
        next.add(entry);
      }
      return next;
    });
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
    <div className="w-full space-y-3 pb-8 animate-fade-in relative select-none">
      {/* 1. Header & Choose League Selector Strip */}
      <div className="py-2 flex items-center justify-between border-b border-[#1E2421]">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-[#7F8983] uppercase tracking-wider font-semibold">
            Mini-League Standings
          </p>
          <h2 className="text-sm md:text-base font-bold text-[#F1F3EF] truncate">
            {isLoadingLeagues && !selectedLeagueName
              ? "Loading leagues..."
              : selectedLeagueName || "Choose League"}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#0D1110] border border-[#1E2421] text-xs font-semibold text-[#F1F3EF] hover:border-[#16C784]/40 hover:bg-[#111614] transition"
          >
            <span>
              {isLoadingLeagues
                ? "Loading..."
                : selectedLeagueName
                ? "Switch league"
                : "Choose league"}
            </span>
            <ChevronDown className="w-3 h-3 text-[#7F8983]" />
          </button>

          {selectedLeagueId && (
            <button
              onClick={() => fetchLeagueStandings(selectedLeagueId)}
              disabled={isLoadingStandings}
              aria-label="Refresh League"
              className="p-1.5 rounded-sm bg-[#0D1110] border border-[#1E2421] text-[#7F8983] hover:text-[#F1F3EF] transition disabled:opacity-40"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoadingStandings ? "animate-spin text-[#16C784]" : ""}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* 2. Search & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-[#0D1110] border border-[#1E2421]">
          <Search className="w-3.5 h-3.5 text-[#7F8983]" />
          <input
            type="text"
            placeholder="Search manager, team, or captain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-[#F1F3EF] placeholder-[#7F8983] focus:outline-none font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[#7F8983] hover:text-[#F1F3EF]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controls: Autosubs & Layout Mode */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
          {/* Autosubs Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-[#7F8983] uppercase tracking-wider font-semibold">
              Autosubs:
            </span>
            <div className="flex bg-[#0D1110] rounded-sm p-0.5 border border-[#1E2421]">
              <button
                onClick={() => setAutosubsEnabled(true)}
                className={`px-2 py-0.5 text-xs font-mono font-medium rounded-sm transition ${
                  autosubsEnabled
                    ? "bg-[#111614] text-[#F1F3EF] font-bold"
                    : "text-[#7F8983] hover:text-[#F1F3EF]"
                }`}
              >
                On
              </button>
              <button
                onClick={() => setAutosubsEnabled(false)}
                className={`px-2 py-0.5 text-xs font-mono font-medium rounded-sm transition ${
                  !autosubsEnabled
                    ? "bg-[#111614] text-[#F1F3EF] font-bold"
                    : "text-[#7F8983] hover:text-[#F1F3EF]"
                }`}
              >
                Off
              </button>
            </div>
          </div>

          {/* Layout Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-[#7F8983] uppercase tracking-wider font-semibold">
              View:
            </span>
            <div className="flex bg-[#0D1110] rounded-sm p-0.5 border border-[#1E2421]">
              <button
                onClick={() => setLayoutMode("list")}
                className={`px-2 py-0.5 text-xs font-mono font-medium rounded-sm transition ${
                  layoutMode === "list"
                    ? "bg-[#111614] text-[#F1F3EF] font-bold"
                    : "text-[#7F8983] hover:text-[#F1F3EF]"
                }`}
              >
                List
              </button>
              <button
                onClick={() => setLayoutMode("pitch")}
                className={`px-2 py-0.5 text-xs font-mono font-medium rounded-sm transition ${
                  layoutMode === "pitch"
                    ? "bg-[#111614] text-[#F1F3EF] font-bold"
                    : "text-[#7F8983] hover:text-[#F1F3EF]"
                }`}
              >
                Pitch
              </button>
            </div>
          </div>

          <BadgeLegend />
        </div>
      </div>

      {/* 3. Error state notice if any */}
      {errorMsg && (
        <div className="p-2.5 rounded-sm bg-[#1A0E10] border border-[#E05252]/40 text-[#fca5a5] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#E05252] flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-[#E05252] underline text-[11px] ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4. Professional Sports-Data Standings Table */}
      {isLoadingStandings ? (
        <div className="w-full h-72 flex flex-col items-center justify-center p-8 rounded-sm bg-[#0D1110] border border-[#1E2421] space-y-2.5">
          <RefreshCw className="w-5 h-5 text-[#16C784] animate-spin" />
          <p className="text-xs font-mono text-[#7F8983]">
            Calculating live league ranks & picks for GW{gameweek}...
          </p>
        </div>
      ) : filteredManagers.length === 0 ? (
        <div className="w-full p-8 rounded-sm border border-dashed border-[#1E2421] text-center space-y-2">
          <Users className="w-5 h-5 text-[#7F8983] mx-auto" />
          <p className="text-xs font-mono text-[#7F8983]">
            {searchQuery ? "No managers matched your search." : "No standings data available."}
          </p>
        </div>
      ) : (
        <div className="w-full border-t border-[#1E2421]">
          {/* Sports Data Table Header */}
          <div className="flex items-center justify-between py-1.5 px-1 text-[10px] font-mono uppercase tracking-wider text-[#7F8983] border-b border-[#1E2421]">
            <div className="flex items-center gap-3">
              <span className="w-7 text-center">RANK</span>
              <span>MANAGER / TEAM</span>
            </div>
            <div className="flex items-center gap-4 text-right">
              <span className="min-w-[60px] text-right">GW PTS</span>
              <span className="min-w-[48px] text-right">TOTAL</span>
            </div>
          </div>

          {/* Table Rows (Subtle row dividers, no individual cards) */}
          <div className="divide-y divide-[#1E2421]">
            {filteredManagers.map((mgr) => {
              const isExpanded = expandedIds.has(mgr.entry);
              const isUserTeam = String(mgr.entry) === String(activeEntryId);
              const cost = mgr.transfersCost ?? mgr.eventTransfersCost ?? 0;
              const netTransfers = calculateNetTransfers(
                mgr.active_transfers ?? mgr.activeTransfers ?? []
              );
              const yetCount =
                mgr.yetCount ??
                mgr.starters.filter(
                  (p) => (!p.matchFinished && p.minutes === 0) || p.yetToPlay
                ).length;

              const rankDisplay = String(mgr.rank).padStart(2, "0");

              return (
                <div
                  key={mgr.entry}
                  className={`transition-colors ${
                    isUserTeam ? "bg-[#16C784]/[0.04]" : "hover:bg-[#0D1110]"
                  }`}
                >
                  {/* Clickable Row */}
                  <button
                    onClick={() => toggleManager(mgr.entry)}
                    className="w-full py-2.5 px-1 flex items-center justify-between text-left transition-colors"
                  >
                    {/* Left: Rank & Team / Manager Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Rank Column */}
                      <div className="flex flex-col items-center justify-center w-7 flex-shrink-0">
                        <span className="text-xs font-mono font-bold text-[#F1F3EF] tabular-nums">
                          {rankDisplay}
                        </span>
                        <div className="flex items-center text-[9px] font-mono leading-none mt-0.5">
                          {mgr.rankChange > 0 ? (
                            <span className="text-[#16C784] flex items-center tabular-nums">
                              <ArrowUp className="w-2.5 h-2.5 inline" />
                              {mgr.rankChange}
                            </span>
                          ) : mgr.rankChange < 0 ? (
                            <span className="text-[#E05252] flex items-center tabular-nums">
                              <ArrowDown className="w-2.5 h-2.5 inline" />
                              {Math.abs(mgr.rankChange)}
                            </span>
                          ) : (
                            <span className="text-[#7F8983] flex items-center">
                              <Minus className="w-2.5 h-2.5 inline" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Team & Manager Details */}
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[#F1F3EF] truncate">
                            {mgr.teamName}
                          </span>
                          {isUserTeam && (
                            <span className="px-1 py-0.2 rounded-none text-[8.5px] font-mono font-bold bg-[#16C784]/20 text-[#16C784]">
                              YOU
                            </span>
                          )}
                          {mgr.activeChip && (
                            <span className="bg-[#111614] border border-[#1E2421] text-[#7F8983] px-1.5 py-0.2 rounded-none text-[9px] font-mono uppercase font-semibold">
                              {mgr.activeChip}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#7F8983] truncate mt-0.5">
                          <span className="truncate">{mgr.name}</span>
                          <span>·</span>
                          <span className="font-mono text-[#F1F3EF]">C: {mgr.captainName}</span>
                          <span>·</span>
                          <span className="font-mono text-[10px]">
                            {mgr.ft_available ?? mgr.ftAvailable ?? mgr.ft_left ?? 1} FT
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: GW Points & Total Points */}
                    <div className="flex items-center gap-4 flex-shrink-0 text-right">
                      {/* GW Points */}
                      <div className="min-w-[60px] text-right font-mono">
                        <span className="text-xs font-bold text-[#16C784] tabular-nums">
                          {mgr.liveGwPoints}
                        </span>
                        {cost > 0 && (
                          <span className="text-[#E05252] text-[10px] font-bold tabular-nums ml-1">
                            (-{cost})
                          </span>
                        )}
                        <span className="block text-[9.5px] text-[#7F8983] tabular-nums">
                          {yetCount > 0 ? (
                            <span className="text-[#D6A83D]">Yet {yetCount}</span>
                          ) : (
                            <span>All played</span>
                          )}
                        </span>
                      </div>

                      {/* Total Points */}
                      <div className="min-w-[48px] text-right font-mono">
                        <span className="text-xs font-bold text-[#F1F3EF] tabular-nums">
                          {mgr.totalPoints}
                        </span>
                      </div>

                      {/* Chevron */}
                      <div className="text-[#7F8983] pl-1">
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-[#16C784]" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Breakdown Pane (Progressive Disclosure) */}
                  {isExpanded && (
                    <div className="p-2 border-t border-[#1E2421] bg-[#070908] animate-fade-in">
                      <LeaguePitchView
                        managerName={mgr.name}
                        teamName={mgr.teamName}
                        transfers={mgr.transfers}
                        transfersCost={cost}
                        teamValue={mgr.teamValue}
                        bank={mgr.bank}
                        playedCount={mgr.playedCount}
                        maxPlayedCount={mgr.maxPlayedCount}
                        activeChip={mgr.activeChip}
                        ftLeft={mgr.ft_available ?? mgr.ftAvailable ?? mgr.ft_left ?? 1}
                        activeTransfers={netTransfers}
                        starters={mgr.starters}
                        bench={mgr.bench}
                        layoutMode={layoutMode}
                        autosubsEnabled={autosubsEnabled}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. "Choose League" Modal with React Portal */}
      {isModalOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 animate-fade-in"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="relative w-full max-w-sm max-h-[80vh] flex flex-col bg-[#0D1110] border border-[#1E2421] rounded-sm p-4 shadow-xl overflow-hidden animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#1E2421]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F3EF]">Choose League</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#7F8983] hover:text-[#F1F3EF] text-xs px-2 py-0.5 rounded-sm bg-[#111614] border border-[#1E2421] transition"
                >
                  Close
                </button>
              </div>

              {/* Modal Body / League List */}
              <div className="flex-1 overflow-y-auto py-2 space-y-1.5">
                {isLoadingLeagues ? (
                  <div className="py-8 text-center text-xs text-[#7F8983] flex flex-col items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#16C784] animate-spin" />
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
                      className={`w-full text-left p-2.5 rounded-sm border transition-all flex items-center justify-between ${
                        selectedLeagueId === lg.id
                          ? "bg-[#16C784]/10 border-[#16C784]/40 text-[#16C784]"
                          : "bg-[#070908] border-[#1E2421] hover:bg-[#111614] text-[#F1F3EF]"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-xs truncate block">{lg.name}</span>
                        <span className="text-[10px] text-[#7F8983] font-mono">
                          Rank: <strong className="text-[#16C784]">#{lg.entryRank ? lg.entryRank.toLocaleString() : "N/A"}</strong> of {lg.rankCount ? lg.rankCount.toLocaleString() : "All"}
                        </span>
                      </div>
                      {selectedLeagueId === lg.id && <span className="text-xs text-[#16C784] font-bold">✓</span>}
                    </button>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-[#7F8983]">
                    No mini-leagues found for this ID.
                  </div>
                )}
              </div>

              {/* Quick League ID Input Fallback */}
              <div className="pt-2.5 border-t border-[#1E2421]">
                <p className="text-[10px] font-mono text-[#7F8983] mb-1.5 uppercase tracking-wider">Or enter League ID:</p>
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
                  className="flex gap-1.5"
                >
                  <input
                    type="number"
                    placeholder="e.g. 280033"
                    value={customLeagueInput}
                    onChange={(e) => setCustomLeagueInput(e.target.value)}
                    className="flex-1 bg-[#070908] border border-[#1E2421] rounded-sm px-2.5 py-1 text-xs text-[#F1F3EF] focus:outline-none focus:border-[#16C784] font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!customLeagueInput.trim()}
                    className="bg-[#16C784] text-[#070908] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-sm transition disabled:opacity-40"
                  >
                    Load
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
