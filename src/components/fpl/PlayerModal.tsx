"use client";

import React from "react";
import { Player } from "@/types/fpl";
import { JerseyIcon } from "./JerseyIcon";
import { X, MessageSquare, Sparkles } from "lucide-react";

interface PlayerModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onDiscuss: (player: Player) => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  player,
  isOpen,
  onClose,
  onDiscuss,
}) => {
  if (!isOpen || !player) return null;

  // Compute calculated live contribution breakdowns based on position and points
  const isGkOrDef = player.position === "GKP" || player.position === "DEF";
  const isMid = player.position === "MID";
  const isFwd = player.position === "FWD";

  const goalPointsVal = isGkOrDef ? 6 : isMid ? 5 : 4;
  const csPointsVal = isGkOrDef ? 4 : isMid ? 1 : 0;

  // Build structured stat ledger
  const statRows = [
    {
      label: "Minutes Played",
      raw: player.minutesExpected ? `${player.minutesExpected}'` : "90'",
      pts: player.gameweekPoints > 0 ? "2 pts" : "0 pts",
    },
    {
      label: "Expected Goals (xG)",
      raw: player.xG?.toFixed(2) || "0.00",
      pts: player.xG > 0.5 ? `High Threat` : "Baseline",
    },
    {
      label: "Expected Assists (xA)",
      raw: player.xA?.toFixed(2) || "0.00",
      pts: player.xA > 0.3 ? `Creative` : "Baseline",
    },
    {
      label: "Next Match FDR",
      raw: `${player.currentFixture.opponent} (${player.currentFixture.isHome ? "H" : "A"})`,
      pts: `FDR ${player.currentFixture.difficulty}`,
    },
    {
      label: "Touchline ML Projected",
      raw: `${player.projectedPoints} xP`,
      pts: `${player.startProbability}% Start`,
    },
    {
      label: "Season Value & Ownership",
      raw: `£${player.price.toFixed(1)}m`,
      pts: `${player.selectedByPercent}% TSB`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      {/* Modal Container */}
      <div className="bg-[#0B0E14] border border-white/[0.08] w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header Section */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <JerseyIcon
              primaryColor={player.teamColor}
              secondaryColor={player.teamSecondaryColor}
              pattern={player.teamPattern}
              size={40}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-100 leading-tight">
                  {player.fullName || player.webName}
                </h3>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400 border border-white/[0.06]">
                  {player.position}
                </span>
                {player.isCaptain && (
                  <span className="text-[9px] font-black px-1 rounded-sm bg-neutral-100 text-neutral-950">
                    C
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-neutral-400 mt-0.5">
                {player.team} · £{player.price.toFixed(1)}m
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider font-mono text-neutral-500 block">
                GW Points
              </span>
              <span className="text-lg font-bold font-mono text-emerald-400 leading-tight">
                {player.gameweekPoints} <span className="text-xs font-medium text-neutral-400">pts</span>
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Injury / Status Alert if present */}
        {player.status !== "available" && player.news && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
            <span className="truncate">{player.news}</span>
            {player.chanceOfPlaying !== undefined && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-900/60 font-bold ml-2 flex-shrink-0">
                {player.chanceOfPlaying}%
              </span>
            )}
          </div>
        )}

        {/* Stats Breakdown Ledger */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1 text-xs">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">
            Performance Ledger & Metrics
          </span>

          <div className="space-y-1.5">
            {statRows.map((row, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1.5 px-2 rounded-md bg-neutral-950/40 border border-white/[0.04]"
              >
                <span className="text-neutral-400 font-medium">{row.label}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-neutral-200">{row.raw}</span>
                  <span className="text-neutral-600">·</span>
                  <span className="text-emerald-400 font-medium">{row.pts}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Handoff Footer */}
        <div className="p-3 bg-neutral-950/80 border-t border-white/[0.06] flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-900/60 hover:bg-neutral-900 border border-white/[0.06] transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onDiscuss(player);
            }}
            className="flex-[2] py-2 px-3 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discuss with AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
