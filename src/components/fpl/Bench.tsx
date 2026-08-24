"use client";

import React from "react";
import { Player } from "@/types/fpl";
import { PlayerCard } from "./PlayerCard";

interface BenchProps {
  benchPlayers: Player[];
  onPlayerClick?: (player: Player) => void;
}

export const Bench: React.FC<BenchProps> = ({ benchPlayers, onPlayerClick }) => {
  // Sort: GK first (benchOrder 0), then outfield subs 1, 2, 3
  const sortedSubs = [...benchPlayers].sort(
    (a, b) => (a.benchOrder ?? 99) - (b.benchOrder ?? 99)
  );

  const getBenchTag = (player: Player, index: number) => {
    if (player.position === "GKP") return "GK";
    return `B${player.benchOrder ?? index}`;
  };

  return (
    <div className="w-full bg-neutral-900/40 border border-white/[0.06] rounded-xl p-3">
      {/* Bench Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] mb-2 px-1 text-xs">
        <span className="text-[10px] uppercase tracking-wider font-medium text-neutral-400">
          Substitutes
        </span>
        <span className="text-[10px] text-neutral-500 font-mono">
          Auto-sub order (B1 → B3)
        </span>
      </div>

      {/* Bench Cards Row */}
      <div className="flex items-center justify-between px-1">
        {sortedSubs.map((player, idx) => (
          <div key={player.id} className="relative flex flex-col items-center">
            <PlayerCard
              player={player}
              isBench={true}
              benchLabel={getBenchTag(player, idx)}
              onClick={onPlayerClick}
              showProjected={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
