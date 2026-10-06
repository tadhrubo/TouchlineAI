"use client";

import React from "react";
import { Player } from "@/types/fpl";
import { JerseyIcon } from "./JerseyIcon";
import { X, Crown, Shield } from "lucide-react";

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
      case 1:
        return "bg-emerald-700 text-white font-semibold font-mono";
      case 2:
        return "bg-emerald-500 text-white font-semibold font-mono";
      case 3:
        return "bg-slate-600 text-white font-semibold font-mono";
      case 4:
        return "bg-rose-600 text-white font-semibold font-mono";
      case 5:
        return "bg-rose-800 text-white font-semibold font-mono";
      default:
        return "bg-slate-700 text-white font-semibold font-mono";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[#0D1110] border border-[#1E2421] rounded-t-md sm:rounded-md p-4 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E2421]">
          <div className="flex items-center gap-3">
            <JerseyIcon
              teamShort={player.teamShort}
              isGK={player.position === "GKP"}
              size={40}
              priority
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#F1F3EF] tracking-tight leading-tight">
                  {player.fullName || player.webName}
                </h2>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-none bg-[#111614] text-[#7F8983] border border-[#1E2421] uppercase">
                  {player.position}
                </span>
              </div>
              <p className="text-xs font-mono tabular-nums text-[#7F8983] mt-0.5">
                {player.team} · £{player.price.toFixed(1)}m · {player.selectedByPercent}% Selected
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close player details"
            className="p-1 rounded-sm text-[#7F8983] hover:text-[#F1F3EF] transition"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Status / Injury Alert if any */}
        {player.news && (
          <div className="p-2.5 rounded-sm bg-[#1A0E10] border border-[#E05252]/40 flex items-start gap-2.5 text-xs text-[#fca5a5]">
            {player.chanceOfPlaying !== undefined && (
              <span className="font-mono tabular-nums font-bold uppercase tracking-wider text-[10px] bg-[#E05252]/20 text-[#fca5a5] px-1.5 py-0.5 rounded-none border border-[#E05252]/30 flex-shrink-0">
                {player.chanceOfPlaying}%
              </span>
            )}
            <span className="leading-relaxed">{player.news}</span>
          </div>
        )}

        {/* Key Metrics: Flat Typographic Design */}
        <div className="grid grid-cols-4 gap-2 text-center p-2.5 rounded-sm bg-[#111614] border border-[#1E2421]">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7F8983]">
              Projected
            </span>
            <p className="text-sm sm:text-base font-bold font-mono tabular-nums text-[#16C784] mt-0.5">
              {player.projectedPoints} <span className="text-[10px] font-normal text-[#7F8983]">pts</span>
            </p>
          </div>
          <div className="flex flex-col items-center border-l border-[#1E2421]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7F8983]">
              Form
            </span>
            <p className="text-sm sm:text-base font-bold font-mono tabular-nums text-[#F1F3EF] mt-0.5">
              {player.form}
            </p>
          </div>
          <div className="flex flex-col items-center border-l border-[#1E2421]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7F8983]">
              xGI / 90
            </span>
            <p className="text-sm sm:text-base font-bold font-mono tabular-nums text-[#F1F3EF] mt-0.5">
              {player.xGI.toFixed(2)}
            </p>
          </div>
          <div className="flex flex-col items-center border-l border-[#1E2421]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7F8983]">
              Start Prob
            </span>
            <p className="text-sm sm:text-base font-bold font-mono tabular-nums text-[#F1F3EF] mt-0.5">
              {player.startProbability}%
            </p>
          </div>
        </div>

        {/* Upcoming 3 Fixtures with FDR */}
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-semibold text-[#7F8983] uppercase tracking-wider font-mono">
            Upcoming Fixtures
          </h4>
          <div className="grid grid-cols-3 gap-1.5">
            {player.upcomingFixtures.map((fix, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-none text-center flex flex-col items-center justify-center ${getFdrStyle(
                  fix.difficulty
                )}`}
              >
                <span className="text-[10px] font-mono tabular-nums font-semibold opacity-80">
                  GW {fix.gameweek}
                </span>
                <span className="text-xs font-bold mt-0.5 truncate max-w-full">
                  {fix.opponent} ({fix.isHome ? "H" : "A"})
                </span>
                <span className="text-[9px] font-mono tabular-nums font-medium mt-0.5 opacity-90">
                  FDR {fix.difficulty}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-[#1E2421]">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onSetCaptain(player.id);
                onClose();
              }}
              className="py-2 px-3 rounded-sm bg-[#111614] hover:bg-[#171e1b] border border-[#1E2421] text-[#F1F3EF] font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-[#16C784]" aria-hidden="true" />
              <span>Make Captain (C)</span>
            </button>

            <button
              onClick={() => {
                onSetViceCaptain(player.id);
                onClose();
              }}
              className="py-2 px-3 rounded-sm bg-[#111614] hover:bg-[#171e1b] border border-[#1E2421] text-[#7F8983] hover:text-[#F1F3EF] font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-[#7F8983]" aria-hidden="true" />
              <span>Make Vice-Captain</span>
            </button>
          </div>

          <button
            onClick={() => {
              onAskAIAboutPlayer(player);
              onClose();
            }}
            className="w-full py-2 px-3 rounded-sm bg-[#16C784] hover:bg-[#13ab71] text-[#070908] font-bold font-mono uppercase tracking-wider text-xs transition flex items-center justify-center gap-1.5"
          >
            Analyze {player.webName} with Touchline Analyst
          </button>
        </div>
      </div>
    </div>
  );
};
