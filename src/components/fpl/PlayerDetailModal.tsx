"use client";

import React from "react";
import { Player } from "@/types/fpl";
import { JerseyIcon } from "./JerseyIcon";
import { X, Crown, Shield, Sparkles, TrendingUp, Activity, Calendar, Award } from "lucide-react";

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

  const getFdrBg = (fdr: number) => {
    switch (fdr) {
      case 2:
        return "bg-emerald-950 text-emerald-300 border-emerald-500/40";
      case 3:
        return "bg-slate-800 text-slate-300 border-slate-600/40";
      case 4:
        return "bg-amber-950 text-amber-300 border-amber-500/40";
      case 5:
        return "bg-rose-950 text-rose-300 border-rose-500/40";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <JerseyIcon
              primaryColor={player.teamColor}
              secondaryColor={player.teamSecondaryColor}
              pattern={player.teamPattern}
              size={48}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">
                  {player.fullName}
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {player.position}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {player.team} • £{player.price.toFixed(1)}m • {player.selectedByPercent}% Selected
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close details"
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status / Injury Alert if any */}
        {player.news && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2 text-xs text-amber-200">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
              {player.chanceOfPlaying}% Chance
            </span>
            <span>{player.news}</span>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Projected</span>
            <p className="text-base font-extrabold text-emerald-400 mt-0.5">
              {player.projectedPoints} pts
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Form</span>
            <p className="text-base font-extrabold text-white mt-0.5">
              {player.form}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">xGI / 90</span>
            <p className="text-base font-extrabold text-sky-400 mt-0.5">
              {player.xGI.toFixed(2)}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Start Prob</span>
            <p className="text-base font-extrabold text-white mt-0.5">
              {player.startProbability}%
            </p>
          </div>
        </div>

        {/* Upcoming 3 Fixtures with FDR */}
        <div className="mt-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1 mb-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Next 3 Fixtures
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {player.upcomingFixtures.map((fix, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center ${getFdrBg(
                  fix.difficulty
                )}`}
              >
                <span className="text-[10px] font-bold opacity-80">
                  GW {fix.gameweek}
                </span>
                <span className="text-xs font-black">
                  {fix.opponent} ({fix.isHome ? "H" : "A"})
                </span>
                <span className="text-[9px] font-semibold mt-0.5">
                  FDR {fix.difficulty}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onSetCaptain(player.id);
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 font-bold text-xs transition active:scale-95"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              Make Captain (C)
            </button>

            <button
              onClick={() => {
                onSetViceCaptain(player.id);
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 font-bold text-xs transition active:scale-95"
            >
              <Shield className="w-4 h-4 text-slate-400" />
              Make Vice-Captain
            </button>
          </div>

          <button
            onClick={() => {
              onAskAIAboutPlayer(player);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            Analyze {player.webName} with Touchline AI
          </button>
        </div>
      </div>
    </div>
  );
};
