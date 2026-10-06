"use client";

import React from "react";
import { Player } from "@/types/fpl";
import { JerseyIcon } from "./JerseyIcon";
import { X, Crown, Shield, Sparkles, Calendar } from "lucide-react";

interface PlayerDetailModalProps {
  player: Player | null;
  onClose: () => void;
  onSetCaptain: (playerId: string) => void;
  onSetViceCaptain: (playerId: string) => void;
  onAskAIAboutPlayer: (player: Player) => void;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  player,
  onClose,
  onSetCaptain,
  onSetViceCaptain,
  onAskAIAboutPlayer,
}) => {
  if (!player) return null;

  const getFdrStyle = (fdr: number) => {
    switch (fdr) {
      case 2:
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
      case 3:
        return "bg-white/[0.04] text-gray-300 border-white/10";
      case 4:
        return "bg-amber-500/10 text-amber-300 border-amber-500/20";
      case 5:
        return "bg-rose-500/10 text-rose-300 border-rose-500/20";
      default:
        return "bg-white/[0.04] text-gray-300 border-white/10";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/90 animate-slide-up max-h-[90vh] overflow-y-auto space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <JerseyIcon
              teamShort={player.teamShort}
              isGK={player.position === "GKP"}
              size={48}
              priority
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                  {player.fullName || player.webName}
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/[0.08] text-gray-300 border border-white/10 uppercase">
                  {player.position}
                </span>
              </div>
              <p className="text-xs font-mono tabular-nums text-gray-400 mt-1">
                {player.team} · £{player.price.toFixed(1)}m · {player.selectedByPercent}% Selected
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close player details"
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Status / Injury Alert if any */}
        {player.news && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-200">
            {player.chanceOfPlaying !== undefined && (
              <span className="font-mono tabular-nums font-bold uppercase tracking-wider text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30 flex-shrink-0">
                {player.chanceOfPlaying}%
              </span>
            )}
            <span className="leading-relaxed">{player.news}</span>
          </div>
        )}

        {/* Key Metrics: Flat Typographic Design */}
        <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Projected
            </span>
            <p className="text-base font-bold font-mono tabular-nums text-emerald-400 mt-1">
              {player.projectedPoints} <span className="text-[10px] font-normal text-gray-400">pts</span>
            </p>
          </div>
          <div className="flex flex-col items-center border-l border-white/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Form
            </span>
            <p className="text-base font-bold font-mono tabular-nums text-white mt-1">
              {player.form}
            </p>
          </div>
          <div className="flex flex-col items-center border-l border-white/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              xGI / 90
            </span>
            <p className="text-base font-bold font-mono tabular-nums text-sky-400 mt-1">
              {player.xGI.toFixed(2)}
            </p>
          </div>
          <div className="flex flex-col items-center border-l border-white/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Start Prob
            </span>
            <p className="text-base font-bold font-mono tabular-nums text-white mt-1">
              {player.startProbability}%
            </p>
          </div>
        </div>

        {/* Upcoming 3 Fixtures with FDR */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
            Next 3 Fixtures
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {player.upcomingFixtures.map((fix, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center transition-colors ${getFdrStyle(
                  fix.difficulty
                )}`}
              >
                <span className="text-[10px] font-mono tabular-nums font-semibold opacity-75">
                  GW {fix.gameweek}
                </span>
                <span className="text-xs font-bold mt-0.5 truncate max-w-full">
                  {fix.opponent} ({fix.isHome ? "H" : "A"})
                </span>
                <span className="text-[10px] font-mono tabular-nums font-medium mt-1 opacity-80">
                  FDR {fix.difficulty}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons: Strict 44px touch targets & high-contrast focus rings */}
        <div className="space-y-2.5 pt-2 border-t border-white/10">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                onSetCaptain(player.id);
                onClose();
              }}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4 text-amber-400" aria-hidden="true" />
              Make Captain (C)
            </button>

            <button
              onClick={() => {
                onSetViceCaptain(player.id);
                onClose();
              }}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 hover:text-white font-semibold text-xs transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4 text-gray-400" aria-hidden="true" />
              Make Vice-Captain
            </button>
          </div>

          <button
            onClick={() => {
              onAskAIAboutPlayer(player);
              onClose();
            }}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99] text-gray-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Analyze {player.webName} with Touchline AI
          </button>
        </div>
      </div>
    </div>
  );
};
