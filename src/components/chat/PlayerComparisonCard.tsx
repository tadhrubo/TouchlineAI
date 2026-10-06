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
    <div className="w-full bg-tl-surface border border-tl-border rounded-sm p-3.5 space-y-3.5 my-2">
      {/* Editorial Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-tl-border text-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-tl-muted block">
            TOUCHLINE ANALYST
          </span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-tl-text">
            MATCHDAY BRIEF
          </h4>
        </div>
        <div className="text-right font-mono">
          <span className="text-[10px] uppercase tracking-wider text-tl-muted block">CONFIDENCE</span>
          <span className="text-xs font-bold text-tl-accent tabular-nums">
            {verdict.confidence}%
          </span>
        </div>
      </div>

      {/* Side-by-Side Comparison Columns */}
      <div className="grid grid-cols-2 gap-2 text-center relative items-stretch">
        {/* Player A (Recommended) */}
        <div className="p-3 rounded-sm bg-tl-surface2 border border-tl-accent/40 flex flex-col items-center relative">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-tl-accent mb-1">
            RECOMMENDED (C)
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={playerA.photoUrl}
            alt={playerA.name}
            className="w-12 h-12 rounded-sm object-cover border border-tl-accent/60 bg-tl-bg"
          />
          <h5 className="font-bold text-xs text-tl-text mt-1.5 leading-tight truncate w-full">
            {playerA.name}
          </h5>
          <p className="text-[11px] font-mono text-tl-muted mt-0.5">
            {playerA.team} · {playerA.price}
          </p>

          <div className="mt-2.5 w-full pt-2 border-t border-tl-border space-y-1 text-[11px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-tl-muted">xP</span>
              <span className="font-bold text-tl-accent tabular-nums">
                {playerA.projectedPoints} pts
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-tl-muted">Fixture</span>
              <span className="text-tl-text tabular-nums">
                {playerA.fixture}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-tl-muted">Start Prob</span>
              <span className="text-tl-text tabular-nums">
                {playerA.startProbability}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-tl-muted">xGI/90</span>
              <span className="text-tl-text tabular-nums">
                {playerA.xGI}
              </span>
            </div>
          </div>
        </div>

        {/* Player B */}
        <div className="p-3 rounded-sm bg-tl-surface2 border border-tl-border flex flex-col items-center relative">
          <span className="text-[9px] font-mono font-medium uppercase tracking-wider text-tl-muted mb-1">
            ALTERNATIVE
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={playerB.photoUrl}
            alt={playerB.name}
            className="w-12 h-12 rounded-sm object-cover border border-tl-border bg-tl-bg"
          />
          <h5 className="font-bold text-xs text-tl-muted mt-1.5 leading-tight truncate w-full">
            {playerB.name}
          </h5>
          <p className="text-[11px] font-mono text-tl-muted mt-0.5">
            {playerB.team} · {playerB.price}
          </p>

          <div className="mt-2.5 w-full pt-2 border-t border-tl-border space-y-1 text-[11px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-tl-muted">xP</span>
              <span className="font-semibold text-tl-text tabular-nums">
                {playerB.projectedPoints} pts
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-tl-muted">Fixture</span>
              <span className="text-tl-muted tabular-nums">
                {playerB.fixture}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-tl-muted">Start Prob</span>
              <span className="text-tl-muted tabular-nums">
                {playerB.startProbability}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-tl-muted">xGI/90</span>
              <span className="text-tl-muted tabular-nums">
                {playerB.xGI}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Verdict */}
      <div className="p-3 rounded-sm bg-tl-surface2 border border-tl-border space-y-1.5 text-xs">
        <span className="font-bold text-xs text-tl-text tracking-tight block">
          {verdict.headline}
        </span>
        <p className="text-xs text-tl-muted leading-relaxed">
          {verdict.summary}
        </p>

        {/* Reasons */}
        <div className="space-y-1 pt-1.5 border-t border-tl-border text-xs text-tl-text">
          {verdict.reasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-tl-accent font-bold select-none">•</span>
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
            className="flex-1 py-1.5 px-2.5 rounded-sm bg-tl-surface2 hover:bg-tl-surface border border-tl-border text-tl-muted hover:text-tl-text text-xs font-mono transition text-center"
          >
            Why {playerA.name.split(" ").pop()}?
          </button>

          <button
            onClick={() =>
              onFollowUpQuestion?.(
                `Compare ${playerA.name} and ${playerB.name} fixture runs over the next 5 gameweeks.`
              )
            }
            className="flex-1 py-1.5 px-2.5 rounded-sm bg-tl-surface2 hover:bg-tl-surface border border-tl-border text-tl-muted hover:text-tl-text text-xs font-mono transition text-center"
          >
            5-GW Fixtures
          </button>
        </div>

        <button
          onClick={() => onSetCaptain?.(playerA.id)}
          className="w-full py-2 px-3 rounded-sm bg-tl-accent hover:opacity-90 text-tl-accentContrast text-xs font-bold uppercase tracking-wider transition"
        >
          Confirm {playerA.name.split(" ").pop()} as Captain (C)
        </button>
      </div>
    </div>
  );
};
