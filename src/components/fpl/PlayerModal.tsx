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

function getGameweekBreakdown(player: Player): PointEvent[] {
  const total = player.gameweekPoints || 0;
  if (total <= 0) {
    return [];
  }

  const events: PointEvent[] = [];
  let remaining = total;

  // Base minutes played (>= 60 mins is +2 pts, <60 is +1 pt)
  const minsVal = total >= 2 ? 2 : 1;
  events.push({
    name: "Minutes Played",
    count: minsVal === 2 ? "90'" : "45'",
    pts: `+${minsVal} pts`,
  });
  remaining -= minsVal;

  const isDef = player.position === "DEF" || player.position === "GKP";
  const isMid = player.position === "MID";

  const goalPts = isDef ? 6 : isMid ? 5 : 4;
  const csPts = isDef ? 4 : isMid ? 1 : 0;

  let goals = 0;
  let assists = 0;
  let cleanSheets = 0;
  let bonus = 0;
  let saves = 0;

  // Clean sheet attribution
  if (isDef && remaining >= 4 && (remaining % 4 === 0 || remaining === 4 || remaining === 7)) {
    cleanSheets = 1;
    remaining -= 4;
  } else if (remaining >= goalPts) {
    goals = Math.floor(remaining / goalPts);
    remaining -= goals * goalPts;
  }

  // Assists attribution
  if (remaining >= 3) {
    assists = Math.floor(remaining / 3);
    remaining -= assists * 3;
  }

  // Bonus attribution
  if (remaining >= 1 && remaining <= 3) {
    bonus = remaining;
    remaining = 0;
  } else if (isDef && remaining === 4 && cleanSheets === 0) {
    cleanSheets = 1;
    remaining = 0;
  } else if (player.position === "GKP" && remaining >= 1) {
    saves = remaining * 3;
    remaining = 0;
  }

  if (cleanSheets > 0 && csPts > 0) {
    events.push({ name: "Clean Sheet", count: "1", pts: `+${csPts} pts` });
  }
  if (goals > 0) {
    events.push({ name: "Goals Scored", count: `${goals}`, pts: `+${goals * goalPts} pts` });
  }
  if (assists > 0) {
    events.push({ name: "Goal Assists", count: `${assists}`, pts: `+${assists * 3} pts` });
  }
  if (saves > 0) {
    events.push({ name: "Saves Made", count: `${saves}`, pts: `+${Math.floor(saves / 3)} pts` });
  }
  if (bonus > 0) {
    events.push({ name: "Bonus Points (BPS)", count: `${bonus}`, pts: `+${bonus} pts` });
  }

  // Any remaining fractional contribution
  if (remaining > 0) {
    events.push({ name: "Match Contribution", count: "1", pts: `+${remaining} pts` });
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
  const xGIVal = player.xGI !== undefined ? player.xGI.toFixed(2) : ((player.xG || 0) + (player.xA || 0)).toFixed(2);

  const tacticalMetrics = [
    {
      label: "Expected Goals (xG)",
      value: player.xG !== undefined ? player.xG.toFixed(2) : "0.00",
    },
    {
      label: "Expected Assists (xA)",
      value: player.xA !== undefined ? player.xA.toFixed(2) : "0.00",
    },
    {
      label: "Expected Goal Involvement (xGI)",
      value: xGIVal,
    },
    {
      label: "Next Match",
      value: `${player.currentFixture.opponent} (${player.currentFixture.isHome ? "H" : "A"}) · FDR ${player.currentFixture.difficulty}`,
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
              primaryColor={player.teamColor}
              secondaryColor={player.teamSecondaryColor}
              pattern={player.teamPattern}
              size={38}
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
                    className="flex items-center justify-between py-2 px-1"
                  >
                    <span className="text-neutral-300 font-medium">{row.name}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-neutral-400">{row.count}</span>
                      <span className="text-neutral-600">•</span>
                      <span className="text-neutral-200 font-medium">{row.pts}</span>
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
