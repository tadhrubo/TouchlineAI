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
    <div className="w-full bg-neutral-950 border border-white/[0.08] rounded-xl p-3 space-y-3 my-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] text-xs">
        <span className="text-[10px] uppercase tracking-wider font-medium text-neutral-400">
          Armband Evaluation
        </span>
        <span className="text-[10px] font-mono text-emerald-400">
          {verdict.confidence}% Confidence
        </span>
      </div>

      {/* Side-by-Side Headshots & Metrics */}
      <div className="grid grid-cols-2 gap-2 text-center relative">
        {/* VS Indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[9px] font-mono text-neutral-500">
          vs
        </div>

        {/* Player A (Recommended) */}
        <div className="p-2.5 rounded-lg bg-neutral-900/50 border border-emerald-500/30 flex flex-col items-center relative">
          <span className="absolute -top-1.5 left-2 px-1 py-0.2 rounded bg-emerald-500 text-neutral-950 font-bold text-[8.5px]">
            RECOMMENDED
          </span>
          <img
            src={playerA.photoUrl}
            alt={playerA.name}
            className="w-12 h-12 rounded-full object-cover border border-emerald-400/60 mt-1"
          />
          <h5 className="font-bold text-xs text-neutral-100 mt-1.5 leading-tight truncate w-full">
            {playerA.name}
          </h5>
          <p className="text-[10px] font-mono text-neutral-500">
            {playerA.team} · {playerA.price}
          </p>

          <div className="mt-2 w-full pt-1.5 border-t border-white/[0.04] space-y-1 text-[10.5px]">
            <div className="flex justify-between">
              <span className="text-neutral-500">xP:</span>
              <span className="font-mono font-bold text-emerald-400">
                {playerA.projectedPoints} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Fixture:</span>
              <span className="font-mono text-neutral-300">
                {playerA.fixture}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Start Prob:</span>
              <span className="font-mono text-neutral-300">
                {playerA.startProbability}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">xGI / 90:</span>
              <span className="font-mono text-neutral-300">
                {playerA.xGI}
              </span>
            </div>
          </div>
        </div>

        {/* Player B */}
        <div className="p-2.5 rounded-lg bg-neutral-900/30 border border-white/[0.06] flex flex-col items-center">
          <img
            src={playerB.photoUrl}
            alt={playerB.name}
            className="w-12 h-12 rounded-full object-cover border border-neutral-700 mt-1"
          />
          <h5 className="font-bold text-xs text-neutral-300 mt-1.5 leading-tight truncate w-full">
            {playerB.name}
          </h5>
          <p className="text-[10px] font-mono text-neutral-500">
            {playerB.team} · {playerB.price}
          </p>

          <div className="mt-2 w-full pt-1.5 border-t border-white/[0.04] space-y-1 text-[10.5px]">
            <div className="flex justify-between">
              <span className="text-neutral-500">xP:</span>
              <span className="font-mono font-bold text-neutral-300">
                {playerB.projectedPoints} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Fixture:</span>
              <span className="font-mono text-neutral-400">
                {playerB.fixture}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Start Prob:</span>
              <span className="font-mono text-neutral-400">
                {playerB.startProbability}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">xGI / 90:</span>
              <span className="font-mono text-neutral-400">
                {playerB.xGI}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Verdict */}
      <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-white/[0.06] space-y-1.5 text-xs">
        <span className="font-bold text-neutral-100">
          {verdict.headline}
        </span>
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          {verdict.summary}
        </p>

        {/* Reasons */}
        <div className="space-y-1 pt-1 border-t border-white/[0.04] text-[10.5px] text-neutral-400">
          {verdict.reasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="text-emerald-400 select-none">•</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up Prompts & Confirm Action */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex gap-1.5">
          <button
            onClick={() =>
              onFollowUpQuestion?.(
                `Explain in depth why ${playerA.name}'s underlying metrics make him superior to ${playerB.name}.`
              )
            }
            className="flex-1 py-1.5 px-2 rounded-md bg-neutral-900 hover:bg-neutral-850 border border-white/[0.06] text-neutral-300 text-[11px] font-medium transition"
          >
            Why {playerA.name.split(" ").pop()}?
          </button>

          <button
            onClick={() =>
              onFollowUpQuestion?.(
                `Compare ${playerA.name} and ${playerB.name} fixture runs over the next 5 gameweeks.`
              )
            }
            className="flex-1 py-1.5 px-2 rounded-md bg-neutral-900 hover:bg-neutral-850 border border-white/[0.06] text-neutral-300 text-[11px] font-medium transition"
          >
            5-GW Fixtures
          </button>
        </div>

        <button
          onClick={() => onSetCaptain?.(playerA.id)}
          className="w-full py-2 px-3 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-bold transition active:scale-98"
        >
          Confirm {playerA.name.split(" ").pop()} as Captain (C)
        </button>
      </div>
    </div>
  );
};
