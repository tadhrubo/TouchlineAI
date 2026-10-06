"use client";

import React from "react";
import { PlayerComparisonData } from "@/types/fpl";

interface PlayerComparisonCardProps {
  data: PlayerComparisonData;
  onSetCaptain?: (playerId: string) => void;
  onFollowUpQuestion?: (question: string) => void;
}

export const PlayerComparisonCard: React.FC<PlayerComparisonCardProps> = ({
  data,
  onSetCaptain,
  onFollowUpQuestion,
}) => {
  const { playerA, playerB, verdict } = data;

  return (
    <div className="w-full bg-gray-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 my-2 shadow-xl shadow-black/40">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
        <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
          Armband Evaluation
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono tabular-nums text-xs font-semibold">
          {verdict.confidence}% Confidence
        </span>
      </div>

      {/* Side-by-Side Headshots & Metrics */}
      <div className="grid grid-cols-2 gap-3 text-center relative items-stretch">
        {/* VS Indicator */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-gray-950/90 border border-white/15 backdrop-blur-md flex items-center justify-center text-xs font-mono font-bold text-gray-400 shadow-lg select-none"
        >
          vs
        </div>

        {/* Player A (Recommended) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col items-center relative transition-all">
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-emerald-400 text-gray-950 font-bold text-[10px] uppercase tracking-wider shadow-sm select-none">
            Recommended
          </span>
          <img
            src={playerA.photoUrl}
            alt={playerA.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-emerald-400/70 mt-1 shadow-md bg-gray-800"
          />
          <h5 className="font-semibold text-sm text-white mt-2 leading-tight truncate w-full tracking-tight">
            {playerA.name}
          </h5>
          <p className="text-xs font-mono tabular-nums text-gray-400 mt-0.5">
            {playerA.team} · {playerA.price}
          </p>

          <div className="mt-3 w-full pt-2.5 border-t border-white/10 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium">xP</span>
              <span className="font-mono tabular-nums font-bold text-emerald-400 text-sm">
                {playerA.projectedPoints} pts
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium">Fixture</span>
              <span className="font-mono tabular-nums text-gray-200">
                {playerA.fixture}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium">Start Prob</span>
              <span className="font-mono tabular-nums text-gray-200">
                {playerA.startProbability}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium">xGI / 90</span>
              <span className="font-mono tabular-nums text-gray-200">
                {playerA.xGI}
              </span>
            </div>
          </div>
        </div>

        {/* Player B */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col items-center relative transition-all">
          <img
            src={playerB.photoUrl}
            alt={playerB.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-white/20 mt-1 shadow-md bg-gray-800"
          />
          <h5 className="font-semibold text-sm text-gray-300 mt-2 leading-tight truncate w-full tracking-tight">
            {playerB.name}
          </h5>
          <p className="text-xs font-mono tabular-nums text-gray-400 mt-0.5">
            {playerB.team} · {playerB.price}
          </p>

          <div className="mt-3 w-full pt-2.5 border-t border-white/10 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium">xP</span>
              <span className="font-mono tabular-nums font-semibold text-gray-300 text-sm">
                {playerB.projectedPoints} pts
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium">Fixture</span>
              <span className="font-mono tabular-nums text-gray-300">
                {playerB.fixture}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium">Start Prob</span>
              <span className="font-mono tabular-nums text-gray-300">
                {playerB.startProbability}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium">xGI / 90</span>
              <span className="font-mono tabular-nums text-gray-300">
                {playerB.xGI}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Verdict */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2 text-xs">
        <span className="font-semibold text-sm text-white tracking-tight block">
          {verdict.headline}
        </span>
        <p className="text-xs text-gray-300 leading-relaxed">
          {verdict.summary}
        </p>

        {/* Reasons */}
        <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs text-gray-300">
          {verdict.reasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold select-none">•</span>
              <span className="leading-relaxed">{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up Prompts & Confirm Action */}
      <div className="space-y-2.5 pt-1">
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() =>
              onFollowUpQuestion?.(
                `Explain in depth why ${playerA.name}'s underlying metrics make him superior to ${playerB.name}.`
              )
            }
            className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 text-gray-300 hover:text-white text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 flex items-center justify-center text-center"
          >
            Why {playerA.name.split(" ").pop()}?
          </button>

          <button
            onClick={() =>
              onFollowUpQuestion?.(
                `Compare ${playerA.name} and ${playerB.name} fixture runs over the next 5 gameweeks.`
              )
            }
            className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 text-gray-300 hover:text-white text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 flex items-center justify-center text-center"
          >
            5-GW Fixtures
          </button>
        </div>

        <button
          onClick={() => onSetCaptain?.(playerA.id)}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 active:scale-[0.99] text-gray-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 flex items-center justify-center gap-2"
        >
          Confirm {playerA.name.split(" ").pop()} as Captain (C)
        </button>
      </div>
    </div>
  );
};
