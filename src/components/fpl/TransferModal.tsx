"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Player } from "@/types/fpl";
import { JerseyIcon } from "./JerseyIcon";
import { X, Search, RefreshCw } from "lucide-react";

interface TransferModalProps {
  outPlayer: Player | null;
  remainingBank: number;
  currentSquad: Player[];
  onSelect: (inPlayer: Player) => void;
  onClose: () => void;
}

type SortOption = "xp" | "form" | "price_desc" | "price_asc" | "tsb";

export const TransferModal: React.FC<TransferModalProps> = ({
  outPlayer,
  remainingBank,
  currentSquad,
  onSelect,
  onClose,
}) => {
  const [candidates, setCandidates] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("xp");

  const maxBudget = outPlayer
    ? Number((outPlayer.price + remainingBank).toFixed(1))
    : 0;

  // Calculate existing club counts (excluding the player being transferred out)
  const squadClubCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentSquad.forEach((p) => {
      if (outPlayer && p.id === outPlayer.id) return;
      counts[p.teamShort] = (counts[p.teamShort] || 0) + 1;
    });
    return counts;
  }, [currentSquad, outPlayer]);

  const currentSquadIds = useMemo(() => {
    return new Set(currentSquad.map((p) => p.id));
  }, [currentSquad]);

  useEffect(() => {
    if (!outPlayer) return;

    let isMounted = true;
    setLoading(true);

    fetch(`/api/players?position=${outPlayer.position}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.players) {
          setCandidates(data.players);
        }
      })
      .catch((err) => {
        console.error("Failed to load transfer candidates:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [outPlayer]);

  // Filter and sort candidates
  const filteredCandidates = useMemo(() => {
    if (!outPlayer) return [];

    return candidates
      .filter((p) => {
        // Exclude current squad members
        if (currentSquadIds.has(p.id)) return false;

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName =
            p.webName.toLowerCase().includes(q) ||
            p.fullName.toLowerCase().includes(q);
          const matchTeam =
            p.team.toLowerCase().includes(q) ||
            p.teamShort.toLowerCase().includes(q);
          if (!matchName && !matchTeam) return false;
        }

        return true;
      })
      .map((p) => {
        const isAffordable = p.price <= maxBudget + 0.001;
        const clubCount = squadClubCounts[p.teamShort] || 0;
        const isClubValid = clubCount < 3;
        const isEligible = isAffordable && isClubValid;

        let ineligibleReason = "";
        if (!isAffordable) {
          ineligibleReason = `Exceeds budget by £${(p.price - maxBudget).toFixed(1)}m`;
        } else if (!isClubValid) {
          ineligibleReason = `Club limit reached (3 ${p.teamShort})`;
        }

        return {
          ...p,
          isEligible,
          ineligibleReason,
        };
      })
      .sort((a, b) => {
        // First sort eligible above ineligible
        if (a.isEligible !== b.isEligible) {
          return a.isEligible ? -1 : 1;
        }

        // Secondary user-selected sort
        if (sortBy === "xp") {
          return (b.projectedPoints || 0) - (a.projectedPoints || 0);
        }
        if (sortBy === "form") {
          return (b.form || 0) - (a.form || 0);
        }
        if (sortBy === "price_desc") {
          return (b.price || 0) - (a.price || 0);
        }
        if (sortBy === "price_asc") {
          return (a.price || 0) - (b.price || 0);
        }
        if (sortBy === "tsb") {
          return (b.selectedByPercent || 0) - (a.selectedByPercent || 0);
        }
        return 0;
      });
  }, [candidates, outPlayer, searchQuery, maxBudget, squadClubCounts, currentSquadIds, sortBy]);

  if (!outPlayer) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900/95 backdrop-blur-xl border border-white/10 w-full sm:w-[480px] rounded-t-3xl sm:rounded-2xl pb-safe shadow-2xl shadow-black/90 overflow-hidden animate-slide-up flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-white/[0.02]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider font-mono text-gray-400">
                Transfer Search
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/[0.08] text-gray-300 border border-white/10 uppercase">
                {outPlayer.position}
              </span>
            </div>
            <p className="text-xs text-gray-300 font-medium mt-1">
              Replacing <span className="font-semibold text-white">{outPlayer.webName}</span> (£{outPlayer.price.toFixed(1)}m)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider font-mono text-gray-400 block">
                Max Budget
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-emerald-400">
                £{maxBudget.toFixed(1)}m
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close transfer modal"
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 flex items-center justify-center"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Search & Sort Filter Bar */}
        <div className="p-4 border-b border-white/10 bg-white/[0.01] flex flex-col gap-3 flex-shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate by name or club..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-950/80 border border-white/10 text-xs text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-transparent font-sans transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search query"
                className="min-h-[44px] min-w-[44px] absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono tabular-nums no-scrollbar py-0.5">
            <span className="text-gray-400 text-xs font-semibold uppercase mr-1 select-none">Sort:</span>
            {[
              { id: "xp" as const, label: "xP" },
              { id: "form" as const, label: "Form" },
              { id: "price_desc" as const, label: "£ High" },
              { id: "price_asc" as const, label: "£ Low" },
              { id: "tsb" as const, label: "% TSB" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  sortBy === opt.id
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "text-gray-400 hover:text-gray-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06] p-3 space-y-1 text-xs">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Loading {outPlayer.position} candidates...</span>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="py-20 text-center text-gray-400 font-mono text-xs">
              No matching {outPlayer.position} candidates found
            </div>
          ) : (
            filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                  candidate.isEligible
                    ? "hover:bg-white/[0.04] bg-white/[0.01]"
                    : "opacity-45 bg-black/20"
                }`}
              >
                {/* Player identity */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <JerseyIcon
                    teamShort={candidate.teamShort}
                    isGK={candidate.position === "GKP"}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate leading-tight text-sm">
                        {candidate.webName}
                      </span>
                      <span className="text-xs font-mono font-medium text-gray-400">
                        {candidate.teamShort}
                      </span>
                    </div>

                    {candidate.isEligible ? (
                      <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-gray-400 mt-0.5">
                        <span>Form {candidate.form}</span>
                        <span className="text-gray-600 select-none">·</span>
                        <span>{candidate.selectedByPercent}% TSB</span>
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-rose-400 mt-0.5 truncate">
                        {candidate.ineligibleReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics and Select Action */}
                <div className="flex items-center gap-3.5 flex-shrink-0 ml-3">
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-white font-bold text-sm">
                      £{candidate.price.toFixed(1)}m
                    </div>
                    <div className="text-xs text-emerald-400 font-semibold">
                      {candidate.projectedPoints} xP
                    </div>
                  </div>

                  <button
                    disabled={!candidate.isEligible}
                    onClick={() => {
                      if (candidate.isEligible) {
                        onSelect(candidate);
                      }
                    }}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold font-mono tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      candidate.isEligible
                        ? "bg-white/[0.06] hover:bg-emerald-400 hover:text-gray-950 text-white border border-white/10 active:scale-95 cursor-pointer shadow-sm"
                        : "bg-white/[0.02] text-gray-500 border border-white/[0.04] cursor-not-allowed"
                    }`}
                  >
                    Select
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-950/90 border-t border-white/10 flex items-center justify-between text-xs font-mono tabular-nums text-gray-400">
          <span>Remaining Candidates: {filteredCandidates.length}</span>
          <button
            onClick={onClose}
            className="min-h-[44px] px-3 py-2 text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg flex items-center justify-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
