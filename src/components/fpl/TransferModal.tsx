"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Player } from "@/types/fpl";
import { JerseyIcon } from "./JerseyIcon";
import { X, Search, RefreshCw, AlertCircle, ArrowUpDown } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      {/* Modal Container */}
      <div className="bg-[#0B0E14] border border-white/[0.08] w-full sm:w-[460px] rounded-t-2xl sm:rounded-2xl pb-safe shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Transfer Search
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400 border border-white/[0.06]">
                {outPlayer.position}
              </span>
            </div>
            <p className="text-xs text-neutral-300 font-medium mt-0.5">
              Replacing <span className="font-semibold text-neutral-100">{outPlayer.webName}</span> (£{outPlayer.price.toFixed(1)}m)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider font-mono text-neutral-500 block">
                Max Budget
              </span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                £{maxBudget.toFixed(1)}m
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close transfer modal"
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Sort Filter Bar */}
        <div className="p-3 border-b border-white/[0.06] bg-neutral-950/40 flex flex-col gap-2 flex-shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate by name or club..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-900/90 border border-white/[0.08] text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Pills */}
          <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-mono no-scrollbar">
            <span className="text-neutral-500 text-[10px] uppercase mr-1">Sort:</span>
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
                className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                  sortBy === opt.id
                    ? "bg-neutral-800 text-neutral-100 border border-white/[0.1]"
                    : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/60"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-2 space-y-1 text-xs">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-neutral-500 font-mono text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-neutral-400" />
              <span>Loading {outPlayer.position} candidates...</span>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 font-mono text-xs">
              No matching {outPlayer.position} candidates found
            </div>
          ) : (
            filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                  candidate.isEligible
                    ? "hover:bg-neutral-900/80 bg-neutral-950/20"
                    : "opacity-45 bg-neutral-950/40"
                }`}
              >
                {/* Player identity */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <JerseyIcon
                    primaryColor={candidate.teamColor}
                    secondaryColor={candidate.teamSecondaryColor}
                    pattern={candidate.teamPattern}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-neutral-200 truncate leading-tight">
                        {candidate.webName}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {candidate.teamShort}
                      </span>
                    </div>

                    {candidate.isEligible ? (
                      <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400 mt-0.5">
                        <span>Form {candidate.form}</span>
                        <span>·</span>
                        <span>{candidate.selectedByPercent}% TSB</span>
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-rose-400/90 mt-0.5 truncate">
                        {candidate.ineligibleReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics and Select Action */}
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <div className="text-right font-mono">
                    <div className="text-neutral-100 font-bold">
                      £{candidate.price.toFixed(1)}m
                    </div>
                    <div className="text-[10px] text-emerald-400">
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
                    className={`px-3 py-1.5 rounded-md text-xs font-medium font-mono transition-colors ${
                      candidate.isEligible
                        ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-white/[0.08] active:scale-95 cursor-pointer"
                        : "bg-neutral-900/40 text-neutral-600 border border-white/[0.02] cursor-not-allowed"
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
        <div className="p-3 bg-neutral-950/80 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <span>Remaining Candidates: {filteredCandidates.length}</span>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 underline text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
