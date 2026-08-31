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
    <div className="w-full max-w-2xl mx-auto bg-neutral-900/40 border border-white/[0.06] rounded-xl p-3 md:p-4">
      {/* Bench Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] mb-2 px-1 text-xs">
        <span className="text-[10px] md:text-xs uppercase tracking-wider font-medium text-neutral-400">
          Substitutes
        </span>
        <span className="text-[10px] md:text-xs text-neutral-500 font-mono">
          Auto-sub order (B1 → B3)
        </span>
      </div>

      {/* Bench Cards Row */}
      <div className="flex items-center justify-around px-1 gap-2 md:gap-6">
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
