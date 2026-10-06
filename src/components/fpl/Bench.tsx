"use client";

import React from "react";
import { Player } from "@/types/fpl";
import { PlayerCard } from "./PlayerCard";
import { SampleTier } from "@/utils/eo";

interface BenchProps {
  benchPlayers: Player[];
  onPlayerClick?: (player: Player) => void;
  sampleTier?: SampleTier;
  userRank?: number;
}

export const Bench: React.FC<BenchProps> = ({
  benchPlayers,
  onPlayerClick,
  sampleTier,
  userRank,
}) => {
  // Sort: GK first (benchOrder 0), then outfield subs 1, 2, 3
  const sortedSubs = [...benchPlayers].sort(
    (a, b) => (a.benchOrder ?? 99) - (b.benchOrder ?? 99)
  );

  const getBenchTag = (player: Player, index: number) => {
    if (player.position === "GKP") return "GK";
    return `B${player.benchOrder ?? index}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-tl-surface border border-tl-border rounded-sm p-3 md:p-3.5">
      {/* Bench Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-tl-border mb-2 px-0.5 text-xs">
        <span className="text-[10px] md:text-xs uppercase tracking-wider font-semibold text-tl-muted">
          Substitutes
        </span>
        <span className="text-[10px] md:text-xs text-tl-muted font-mono">
          Auto-sub order (B1 → B3)
        </span>
      </div>

      {/* Bench Cards Row */}
      <div className="flex items-center justify-around px-0.5 gap-2 md:gap-6">
        {sortedSubs.map((player, idx) => (
          <div key={player.id} className="relative flex flex-col items-center">
            <PlayerCard
              player={player}
              isBench={true}
              benchLabel={getBenchTag(player, idx)}
              onClick={onPlayerClick}
              showProjected={true}
              sampleTier={sampleTier}
              userRank={userRank}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
