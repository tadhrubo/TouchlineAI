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
    <div className="w-full bg-[#0D1110] border border-[#1E2421] rounded-sm p-3.5 space-y-3.5 my-2">
      {/* Editorial Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#1E2421] text-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#7F8983] block">
            TOUCHLINE ANALYST
          </span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#F1F3EF]">
            MATCHDAY BRIEF
          </h4>
        </div>
        <div className="text-right font-mono">
          <span className="text-[10px] uppercase tracking-wider text-[#7F8983] block">CONFIDENCE</span>
          <span className="text-xs font-bold text-[#16C784] tabular-nums">
            {verdict.confidence}%
          </span>
        </div>
      </div>

      {/* Side-by-Side Comparison Columns */}
      <div className="grid grid-cols-2 gap-2 text-center relative items-stretch">
        {/* Player A (Recommended) */}
        <div className="p-3 rounded-sm bg-[#111614] border border-[#16C784]/40 flex flex-col items-center relative">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#16C784] mb-1">
            RECOMMENDED (C)
          </span>
          <img
            src={playerA.photoUrl}
            alt={playerA.name}
            className="w-12 h-12 rounded-sm object-cover border border-[#16C784]/60 bg-[#070908]"
          />
          <h5 className="font-bold text-xs text-[#F1F3EF] mt-1.5 leading-tight truncate w-full">
            {playerA.name}
          </h5>
          <p className="text-[11px] font-mono text-[#7F8983] mt-0.5">
            {playerA.team} · {playerA.price}
          </p>

          <div className="mt-2.5 w-full pt-2 border-t border-[#1E2421] space-y-1 text-[11px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-[#7F8983]">xP</span>
              <span className="font-bold text-[#16C784] tabular-nums">
                {playerA.projectedPoints} pts
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7F8983]">Fixture</span>
              <span className="text-[#F1F3EF] tabular-nums">
                {playerA.fixture}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7F8983]">Start Prob</span>
              <span className="text-[#F1F3EF] tabular-nums">
                {playerA.startProbability}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7F8983]">xGI/90</span>
              <span className="text-[#F1F3EF] tabular-nums">
                {playerA.xGI}
              </span>
            </div>
          </div>
        </div>

        {/* Player B */}
        <div className="p-3 rounded-sm bg-[#111614] border border-[#1E2421] flex flex-col items-center relative">
          <span className="text-[9px] font-mono font-medium uppercase tracking-wider text-[#7F8983] mb-1">
            ALTERNATIVE
          </span>
          <img
            src={playerB.photoUrl}
            alt={playerB.name}
            className="w-12 h-12 rounded-sm object-cover border border-[#1E2421] bg-[#070908]"
          />
          <h5 className="font-bold text-xs text-[#7F8983] mt-1.5 leading-tight truncate w-full">
            {playerB.name}
          </h5>
          <p className="text-[11px] font-mono text-[#7F8983] mt-0.5">
            {playerB.team} · {playerB.price}
          </p>

          <div className="mt-2.5 w-full pt-2 border-t border-[#1E2421] space-y-1 text-[11px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-[#7F8983]">xP</span>
              <span className="font-semibold text-[#F1F3EF] tabular-nums">
                {playerB.projectedPoints} pts
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7F8983]">Fixture</span>
              <span className="text-[#7F8983] tabular-nums">
                {playerB.fixture}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7F8983]">Start Prob</span>
              <span className="text-[#7F8983] tabular-nums">
                {playerB.startProbability}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7F8983]">xGI/90</span>
              <span className="text-[#7F8983] tabular-nums">
                {playerB.xGI}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Verdict */}
      <div className="p-3 rounded-sm bg-[#111614] border border-[#1E2421] space-y-1.5 text-xs">
        <span className="font-bold text-xs text-[#F1F3EF] tracking-tight block">
          {verdict.headline}
        </span>
        <p className="text-xs text-[#7F8983] leading-relaxed">
          {verdict.summary}
        </p>

        {/* Reasons */}
        <div className="space-y-1 pt-1.5 border-t border-[#1E2421] text-xs text-[#F1F3EF]">
          {verdict.reasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-[#16C784] font-bold select-none">•</span>
              <span className="leading-relaxed">{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up Prompts & Confirm Action */}
      <div className="space-y-2 pt-0.5">
        <div className="flex flex-col sm:flex-row gap-1.5">
          <button
            onClick={() =>
              onFollowUpQuestion?.(
                `Explain in depth why ${playerA.name}'s underlying metrics make him superior to ${playerB.name}.`
              )
            }
            className="flex-1 py-1.5 px-2.5 rounded-sm bg-[#111614] hover:bg-[#161c19] border border-[#1E2421] text-[#7F8983] hover:text-[#F1F3EF] text-xs font-mono transition text-center"
          >
            Why {playerA.name.split(" ").pop()}?
          </button>

          <button
            onClick={() =>
              onFollowUpQuestion?.(
                `Compare ${playerA.name} and ${playerB.name} fixture runs over the next 5 gameweeks.`
              )
            }
            className="flex-1 py-1.5 px-2.5 rounded-sm bg-[#111614] hover:bg-[#161c19] border border-[#1E2421] text-[#7F8983] hover:text-[#F1F3EF] text-xs font-mono transition text-center"
          >
            5-GW Fixtures
          </button>
        </div>

        <button
          onClick={() => onSetCaptain?.(playerA.id)}
          className="w-full py-2 px-3 rounded-sm bg-[#16C784] hover:bg-[#13ab71] text-[#070908] text-xs font-bold uppercase tracking-wider transition"
        >
          Confirm {playerA.name.split(" ").pop()} as Captain (C)
        </button>
      </div>
    </div>
  );
};
