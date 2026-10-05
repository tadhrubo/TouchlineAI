"use client";

import React from "react";
import { Player } from "@/types/fpl";
import { JerseyIcon } from "./JerseyIcon";
import { X } from "lucide-react";

interface PlayerModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onDiscuss: (player: Player) => void;
}

interface PointEvent {
  name: string;
  count: string;
  pts: string;
}

/**
 * Deterministic GW points breakdown using real FPL live stats from player.stats.
 * Reads goals, assists, bonus, minutes etc. directly — no reverse-engineering from total.
 * Position-aware scoring per official FPL rules (24/25 season).
 */
function getGameweekBreakdown(player: Player): PointEvent[] {
  const s = player.stats;
  // If no stats at all (pre-match or no data), return empty
  if (!s) return [];
  const mins = s.minutes ?? 0;
  const basePts = s.total_points ?? 0;
  // If player hasn't played and has 0 base points, nothing to show
  if (mins === 0 && basePts === 0) return [];

  const events: PointEvent[] = [];

  const isGK  = player.position === "GKP";
  const isDef = player.position === "DEF";
  const isMid = player.position === "MID";
  // FWD is the default (element_type 4)

  // ── 1. Minutes played ────────────────────────────────────────────────────────
  if (mins > 0) {
    const minsPoints = mins >= 60 ? 2 : 1;
    events.push({
      name: "Minutes Played",
      count: `${mins}'`,
      pts: `+${minsPoints} pts`,
    });
  }

  // ── 2. Goals scored (position-aware) ────────────────────────────────────────
  //   GKP/DEF: 6 pts · MID: 5 pts · FWD: 4 pts
  const goalPts = isGK || isDef ? 6 : isMid ? 5 : 4;
  const goals = s.goals_scored ?? 0;
  if (goals > 0) {
    events.push({
      name: "Goals Scored",
      count: `${goals}`,
      pts: `+${goals * goalPts} pts`,
    });
  }

  // ── 3. Assists (+3 each, all positions) ─────────────────────────────────────
  const assists = s.assists ?? 0;
  if (assists > 0) {
    events.push({
      name: "Assists",
      count: `${assists}`,
      pts: `+${assists * 3} pts`,
    });
  }

  // ── 4. Clean sheet (GKP/DEF: +4, MID: +1, FWD: none) ───────────────────────
  const csPts = isGK || isDef ? 4 : isMid ? 1 : 0;
  if (csPts > 0 && (s.clean_sheets ?? 0) > 0) {
    events.push({
      name: "Clean Sheet",
      count: "1",
      pts: `+${csPts} pts`,
    });
  }

  // ── 5. Goals conceded penalty (GKP/DEF only: -1 per every 2 GC) ─────────────
  //   Only applies when the player did NOT keep a clean sheet.
  if ((isGK || isDef) && (s.clean_sheets ?? 0) === 0) {
    const gc = s.goals_conceded ?? 0;
    if (gc >= 2) {
      const gcPenalty = -Math.floor(gc / 2);
      events.push({
        name: "Goals Conceded",
        count: `${gc}`,
        pts: `${gcPenalty} pts`,
      });
    }
  }

  // ── 6. Saves (GKP only: +1 per 3 saves) ─────────────────────────────────────
  const saves = s.saves ?? 0;
  if (isGK && saves >= 3) {
    const savePts = Math.floor(saves / 3);
    events.push({
      name: "Saves",
      count: `${saves}`,
      pts: `+${savePts} pts`,
    });
  }

  // ── 7. Penalty save (GKP: +5) ────────────────────────────────────────────────
  // Not in current PlayerLiveStats type; can be added later

  // ── 8. Actual bonus points awarded (0–3, NOT the raw BPS score) ──────────────
  const bonusPts = s.bonus ?? 0;
  if (bonusPts > 0) {
    events.push({
      name: "Bonus Points",
      count: `${bonusPts}`,
      pts: `+${bonusPts} pts`,
    });
  }

  // ── 9. Yellow card (-1) ───────────────────────────────────────────────────────
  if ((s.yellow_cards ?? 0) > 0) {
    events.push({ name: "Yellow Card", count: "1", pts: "-1 pts" });
  }

  // ── 10. Red card (-3) ────────────────────────────────────────────────────────
  if ((s.red_cards ?? 0) > 0) {
    events.push({ name: "Red Card", count: "1", pts: "-3 pts" });
  }

  // ── 11. Own goals (-2 each) ───────────────────────────────────────────────────
  const ownGoals = s.own_goals ?? 0;
  if (ownGoals > 0) {
    events.push({
      name: "Own Goals",
      count: `${ownGoals}`,
      pts: `-${ownGoals * 2} pts`,
    });
  }

  // ── 12. Captain / Triple Captain multiplier row ───────────────────────────────
  //   Appended last so the user sees: base events → then the multiplier applied.
  const mult = player.multiplier ?? 1;
  if (mult === 3) {
    events.push({ name: "Triple Captain", count: "×3", pts: "" });
  } else if (mult === 2) {
    events.push({ name: "Captain Multiplier", count: "×2", pts: "" });
  }

  return events;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  player,
  isOpen,
  onClose,
  onDiscuss,
}) => {
  if (!isOpen || !player) return null;

  const gwEvents = getGameweekBreakdown(player);
  const isDefOrGk = player.position === "GKP" || player.position === "DEF";

  const nextFixtureOpp = player.currentFixture?.opponent || "PL";
  const nextFixtureLoc = player.currentFixture?.isHome ? "H" : "A";
  const nextFixtureFdr = player.currentFixture?.difficulty || 3;

  const xGVal = player.xG !== undefined ? player.xG.toFixed(2) : "0.05";
  const xAVal = player.xA !== undefined ? player.xA.toFixed(2) : "0.05";
  const xGIVal = player.xGI !== undefined ? player.xGI.toFixed(2) : ((player.xG || 0) + (player.xA || 0)).toFixed(2);
  const xGCVal = player.xGC !== undefined ? player.xGC.toFixed(2) : "1.15";

  // Build position-specific tactical metric rows
  const tacticalMetrics = isDefOrGk
    ? [
        {
          label: "Expected Goals Conceded (xGC)",
          value: xGCVal,
        },
        {
          label: "Expected Goal Involvement (xGI)",
          value: xGIVal,
        },
        {
          label: "Goal Threat & Creation",
          value: `xG: ${xGVal} · xA: ${xAVal}`,
        },
        {
          label: "Next Match",
          value: `${nextFixtureOpp} (${nextFixtureLoc}) · FDR ${nextFixtureFdr}`,
        },
        {
          label: "Touchline ML Projection",
          value: `${player.projectedPoints} xP · ${player.startProbability}% Start`,
        },
        {
          label: "Ownership & Value",
          value: `£${player.price.toFixed(1)}m · ${player.selectedByPercent}% TSB`,
        },
      ]
    : [
        {
          label: "Expected Goals (xG)",
          value: xGVal,
        },
        {
          label: "Expected Assists (xA)",
          value: xAVal,
        },
        {
          label: "Expected Goal Involvement (xGI)",
          value: xGIVal,
        },
        {
          label: "Next Match",
          value: `${nextFixtureOpp} (${nextFixtureLoc}) · FDR ${nextFixtureFdr}`,
        },
        {
          label: "Touchline ML Projection",
          value: `${player.projectedPoints} xP · ${player.startProbability}% Start`,
        },
        {
          label: "Ownership & Value",
          value: `£${player.price.toFixed(1)}m · ${player.selectedByPercent}% TSB`,
        },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      {/* Modal Container */}
      <div className="bg-[#0B0E14] border border-white/[0.08] w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl pb-safe shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header Section */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <JerseyIcon
              teamShort={player.teamShort}
              isGK={player.position === "GKP"}
              size={38}
              priority
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-100 leading-tight">
                  {player.fullName || player.webName}
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-white/[0.06]">
                  {player.position}
                </span>
                {player.isCaptain && (
                  <span className="text-[9px] font-bold px-1 rounded-sm bg-neutral-200 text-neutral-950 font-mono">
                    C
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-neutral-400 mt-0.5">
                {player.team} · £{player.price.toFixed(1)}m
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider font-mono text-neutral-500 block">
                GW Points
              </span>
              <span className="text-lg font-bold font-mono text-neutral-100 leading-tight">
                {player.gameweekPoints} <span className="text-xs font-normal text-neutral-400">pts</span>
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs max-h-[60vh] sm:max-h-[65vh]">
          {/* Status Alert if not available */}
          {player.status !== "available" && player.news && (
            <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-white/[0.06] text-neutral-300 text-xs flex items-center justify-between">
              <span className="truncate">{player.news}</span>
              {player.chanceOfPlaying !== undefined && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-bold ml-2 flex-shrink-0 border border-white/[0.04]">
                  {player.chanceOfPlaying}%
                </span>
              )}
            </div>
          )}

          {/* Section 1: GW Breakdown */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase block mb-1">
              GW Breakdown
            </span>

            {gwEvents.length > 0 ? (
              <div className="divide-y divide-white/[0.04] border-y border-white/[0.04]">
                {gwEvents.map((row, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between py-2 px-1 ${
                      row.pts === ""
                        ? "border-t border-white/[0.08] mt-1"
                        : ""
                    }`}
                  >
                    <span
                      className={`font-medium ${
                        row.pts === ""
                          ? "text-amber-400 text-[10px] uppercase tracking-widest"
                          : "text-neutral-300"
                      }`}
                    >
                      {row.name}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span
                        className={`font-bold ${
                          row.pts === ""
                            ? "text-amber-400 text-sm"
                            : "text-neutral-400"
                        }`}
                      >
                        {row.count}
                      </span>
                      {row.pts !== "" && (
                        <>
                          <span className="text-neutral-600">•</span>
                          <span
                            className={`font-medium ${
                              row.pts.startsWith("-")
                                ? "text-rose-400"
                                : "text-neutral-200"
                            }`}
                          >
                            {row.pts}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2.5 px-2 text-center rounded bg-neutral-950/40 border border-white/[0.04] text-neutral-500 font-mono text-[11px]">
                No match events recorded yet for current Gameweek
              </div>
            )}
          </div>

          {/* Section 2: Tactical & Model Metrics */}
          <div className="border-t border-white/[0.06] pt-3 space-y-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase block mb-1">
              Tactical & Model Metrics
            </span>

            <div className="divide-y divide-white/[0.04] border-y border-white/[0.04]">
              {tacticalMetrics.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-1"
                >
                  <span className="text-neutral-400 font-medium">{item.label}</span>
                  <span className="text-neutral-200 font-mono font-medium text-right">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Handoff Footer: Flat, Editorial Buttons */}
        <div className="p-3 bg-neutral-950/80 border-t border-white/[0.06] flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => {
              onClose();
              onDiscuss(player);
            }}
            className="w-full py-2.5 text-sm font-medium text-neutral-200 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors text-center active:scale-[0.99]"
          >
            Discuss with AI
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-transparent border border-neutral-800/80 rounded-lg transition-colors text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
