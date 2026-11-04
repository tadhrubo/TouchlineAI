"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Player } from "@/types/fpl";
import { JerseyIcon } from "./JerseyIcon";
import { Search, X, RefreshCw } from "lucide-react";

interface TransferModalProps {
  outPlayer: Player | null;
  bank: number;
  currentSquad: Player[];
  onSelect: (inPlayer: Player) => void;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  outPlayer,
  bank,
  currentSquad,
  onSelect,
  onClose,
}) => {
  const [candidates, setCandidates] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"xp" | "form" | "price_desc" | "price_asc" | "tsb">("xp");

  const maxBudget = useMemo(() => {
    return Number(
      (bank + (outPlayer ? (outPlayer.sellingPrice ?? outPlayer.price) : 0)).toFixed(1)
    );
  }, [bank, outPlayer]);

  // Track how many players from each team are currently in the squad
  const squadClubCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of currentSquad) {
      if (outPlayer && p.id === outPlayer.id) continue;
      counts[p.teamShort] = (counts[p.teamShort] || 0) + 1;
    }
    return counts;
  }, [currentSquad, outPlayer]);

  const currentSquadIds = useMemo(() => {
    return new Set(currentSquad.map((p) => p.id));
  }, [currentSquad]);

  useEffect(() => {
    if (!outPlayer) return;

    let isMounted = true;
    setLoading(true);

    fetch(`/api/players?position=${encodeURIComponent(outPlayer.position)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Network error fetching players");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.players && Array.isArray(data.players) && data.players.length > 0) {
          setCandidates(data.players);
          setLoading(false);
          return;
        }

        // Fallback to /api/fpl/bootstrap if empty
        return fetch("/api/fpl/bootstrap")
          .then((res) => {
            if (!res.ok) throw new Error("Network error fetching bootstrap");
            return res.json();
          })
          .then((bData) => {
            if (!isMounted) return;

            const teamMap: Record<number, { name: string; short: string }> = {};
            for (const t of bData.teams || []) {
              teamMap[t.id] = { name: t.name, short: t.short_name };
            }

            const posMap: Record<number, "GKP" | "DEF" | "MID" | "FWD"> = {
              1: "GKP",
              2: "DEF",
              3: "MID",
              4: "FWD",
            };

            const targetPosType = Object.keys(posMap).find(
              (k) => posMap[Number(k)] === outPlayer.position
            );

            const mapped: Player[] = (bData.elements || [])
              .filter((el: any) => String(el.element_type) === String(targetPosType))
              .map((el: any) => {
                const team = teamMap[el.team] || { name: "Unknown", short: "UNK" };
                return {
                  id: String(el.id),
                  code: el.code,
                  name: el.web_name,
                  webName: el.web_name,
                  fullName: `${el.first_name || ""} ${el.second_name || ""}`.trim() || el.web_name,
                  position: posMap[el.element_type],
                  elementType: el.element_type,
                  element_type: el.element_type,
                  team: team.name,
                  teamShort: team.short,
                  teamCode: el.team_code,
                  team_code: el.team_code,
                  price: el.now_cost / 10,
                  sellingPrice: el.now_cost / 10,
                  purchasePrice: el.now_cost / 10,
                  totalPoints: el.total_points,
                  form: parseFloat(el.form) || 0,
                  selectedByPercent: parseFloat(el.selected_by_percent) || 0,
                  xG: parseFloat(el.expected_goals) || 0,
                  xA: parseFloat(el.expected_assists) || 0,
                  xGI: 0,
                  minutesExpected: 90,
                  projectedPoints: parseFloat(el.ep_next) || 0,
                  ceilingPoints: Math.round((parseFloat(el.ep_next) || 2.0) * 1.9 * 10) / 10,
                  haulProb: 15,
                  status:
                    el.status === "i"
                      ? "injured"
                      : el.status === "d"
                      ? "doubtful"
                      : el.status === "s"
                      ? "suspended"
                      : el.status === "u" || el.status === "n"
                      ? "unavailable"
                      : "available",
                  startProbability: el.chance_of_playing_next_round ?? 85,
                  news: el.news || "",
                  chanceOfPlaying: el.chance_of_playing_next_round ?? null,
                  gameweekPoints: 0,
                  photoUrl: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${el.code}.png`,
                  currentFixture: { opponent: "PL", isHome: true, difficulty: 3, gameweek: 1 },
                  upcomingFixtures: [],
                  teamColor: "#02894a",
                  teamSecondaryColor: "#FFFFFF",
                };
              });

            setCandidates(mapped);
            setLoading(false);
          });
      })
      .catch((err) => {
        console.error("Error fetching candidates:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [outPlayer]);

  const filteredCandidates = useMemo(() => {
    return candidates
      .filter((c) => {
        if (c.id === outPlayer?.id) return false;
        if (searchQuery.trim() !== "") {
          const query = searchQuery.toLowerCase();
          const matchName = c.webName.toLowerCase().includes(query);
          const matchTeam = c.teamShort.toLowerCase().includes(query);
          if (!matchName && !matchTeam) return false;
        }
        return true;
      })
      .map((c) => {
        const exceedsBudget = c.price > maxBudget;
        const clubCount = squadClubCounts[c.teamShort] || 0;
        const exceedsClubLimit = clubCount >= 3;
        const isAlreadyInSquad = currentSquadIds.has(c.id);

        let ineligibleReason = "";
        if (isAlreadyInSquad) ineligibleReason = "Already in squad";
        else if (exceedsBudget) ineligibleReason = `Exceeds max budget (£${maxBudget.toFixed(1)}m)`;
        else if (exceedsClubLimit) ineligibleReason = `Max 3 ${c.teamShort} players reached`;

        return {
          ...c,
          isEligible: !exceedsBudget && !exceedsClubLimit && !isAlreadyInSquad,
          ineligibleReason,
        };
      })
      .sort((a, b) => {
        if (a.isEligible !== b.isEligible) {
          return a.isEligible ? -1 : 1;
        }
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-tl-surface border border-tl-border w-full sm:w-[480px] rounded-t-md sm:rounded-md overflow-hidden flex flex-col max-h-[88vh] text-tl-text"
      >
        {/* Header */}
        <div className="p-4 border-b border-tl-border flex items-center justify-between flex-shrink-0 bg-tl-bg">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-tl-muted">
                Transfer Candidate Search
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-sm bg-tl-surface2 text-tl-text border border-tl-border uppercase">
                {outPlayer.position}
              </span>
            </div>
            <p className="text-xs text-tl-muted font-medium mt-1">
              Replacing <span className="font-semibold text-tl-text">{outPlayer.webName}</span>{" "}
              <span className="font-mono tabular-nums text-tl-muted">
                (Sell: £{(outPlayer.sellingPrice ?? outPlayer.price).toFixed(1)}m · Market: £{outPlayer.price.toFixed(1)}m)
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider font-mono text-tl-muted block">
                Budget Limit
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-tl-accent">
                £{maxBudget.toFixed(1)}m
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close transfer modal"
              className="w-8 h-8 rounded-sm text-tl-muted hover:text-tl-text bg-tl-surface border border-tl-border flex items-center justify-center transition"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Search & Sort Filter Bar */}
        <div className="p-3 border-b border-tl-border bg-tl-surface flex flex-col gap-2.5 flex-shrink-0">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-tl-muted pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate by name or club..."
              className="w-full pl-9 pr-8 py-2 rounded-sm bg-tl-bg border border-tl-border text-xs text-tl-text placeholder:text-tl-muted focus:outline-none focus:border-tl-accent font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search query"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tl-muted hover:text-tl-text"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono tabular-nums no-scrollbar py-0.5">
            <span className="text-tl-muted text-[10px] font-semibold uppercase mr-1 select-none">SORT:</span>
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
                className={`px-2.5 py-1 rounded-sm text-xs font-medium transition whitespace-nowrap ${
                  sortBy === opt.id
                    ? "bg-tl-bg text-tl-accent border border-tl-accent/40"
                    : "text-tl-muted hover:text-tl-text bg-tl-bg border border-tl-border"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto divide-y divide-tl-border p-2 space-y-1 text-xs">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-tl-muted font-mono text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-tl-accent" />
              <span>LOADING {outPlayer.position} CANDIDATES...</span>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="py-16 text-center text-tl-muted font-mono text-xs">
              No matching {outPlayer.position} candidates found
            </div>
          ) : (
            filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`flex items-center justify-between p-2.5 rounded-sm transition ${
                  candidate.isEligible
                    ? "hover:bg-tl-surface2 bg-tl-bg"
                    : "opacity-40 bg-tl-bg"
                }`}
              >
                {/* Player identity */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <JerseyIcon
                    teamShort={candidate.teamShort}
                    teamCode={candidate.teamCode ?? candidate.team_code}
                    kitUrl={candidate.kitUrl}
                    isGK={candidate.position === "GKP" || candidate.elementType === 1 || candidate.element_type === 1}
                    size={28}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-tl-text truncate leading-tight text-xs">
                        {candidate.webName}
                      </span>
                      <span className="text-[10px] font-mono font-medium text-tl-muted">
                        {candidate.teamShort}
                      </span>
                    </div>

                    {candidate.isEligible ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono tabular-nums text-tl-muted mt-0.5">
                        <span>Form {candidate.form}</span>
                        <span>·</span>
                        <span>{candidate.selectedByPercent}% TSB</span>
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-rose-500 mt-0.5 truncate">
                        {candidate.ineligibleReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics and Select Action */}
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-tl-text font-bold text-xs">
                      £{candidate.price.toFixed(1)}m
                    </div>
                    <div className="text-[10px] text-tl-accent font-semibold">
                      {candidate.projectedPoints} xP
                    </div>
                    {(candidate.ceilingPoints != null || candidate.haulProb != null) && (
                      <div className="text-[9px] text-tl-muted font-medium flex items-center justify-end gap-1 mt-0.5">
                        {candidate.ceilingPoints != null && (
                          <span>p90: {candidate.ceilingPoints.toFixed(1)}</span>
                        )}
                        {candidate.ceilingPoints != null && candidate.haulProb != null && (
                          <span className="opacity-40">·</span>
                        )}
                        {candidate.haulProb != null && (
                          <span className="text-tl-text font-semibold">{candidate.haulProb.toFixed(0)}% haul</span>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    disabled={!candidate.isEligible}
                    onClick={() => {
                      if (candidate.isEligible) {
                        onSelect(candidate);
                      }
                    }}
                    className={`h-7 px-3 rounded-sm text-xs font-semibold font-mono tabular-nums transition ${
                      candidate.isEligible
                        ? "bg-tl-accent text-tl-accentContrast hover:opacity-90 active:scale-95 cursor-pointer font-bold"
                        : "bg-tl-surface2 text-tl-muted/40 border border-tl-border cursor-not-allowed"
                    }`}
                  >
                    Transfer In
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-tl-bg border-t border-tl-border flex items-center justify-between text-xs font-mono tabular-nums text-tl-muted">
          <span>Eligible Candidates: {filteredCandidates.length}</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-tl-muted hover:text-tl-text transition rounded-sm border border-tl-border bg-tl-surface"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
