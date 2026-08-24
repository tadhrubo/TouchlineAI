"use client";

import React from "react";
import { TeamStats } from "@/types/fpl";
import { Clock } from "lucide-react";

interface StatsCardProps {
  stats: TeamStats;
  onOpenChips?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({ stats }) => {
  return (
    <div className="w-full py-2 space-y-3">
      {/* Top Metadata Row: Gameweek & Team context */}
      <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-medium text-neutral-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            GW {stats.nextGameweek}
          </span>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-300 font-medium truncate max-w-[160px]">
            {stats.teamName}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono">
          <Clock className="w-3 h-3 text-neutral-500" />
          <span>{stats.deadline}</span>
        </div>
      </div>

      {/* Main KPI Columns: Flat typographic hierarchy */}
      <div className="grid grid-cols-3 gap-2 py-1 text-center">
        {/* Overall Points */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider font-medium text-neutral-500">
            Points
          </span>
          <span className="text-xl font-bold text-neutral-100 font-mono tracking-tight mt-0.5">
            {stats.overallPoints.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-emerald-400 mt-0.5">
            +{stats.gameweekPoints} GW{stats.currentGameweek}
          </span>
        </div>

        {/* Overall Rank */}
        <div className="flex flex-col items-center border-x border-white/[0.06] px-1">
          <span className="text-[10px] uppercase tracking-wider font-medium text-neutral-500">
            Overall Rank
          </span>
          <span className="text-xl font-bold text-neutral-100 font-mono tracking-tight mt-0.5">
            #{stats.overallRank.toLocaleString()}
          </span>
          <span className="text-[10px] text-neutral-500 mt-0.5">
            Top {stats.overallRankPercentile}%
          </span>
        </div>

        {/* Free Transfers */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider font-medium text-neutral-500">
            Transfers
          </span>
          <span className="text-xl font-bold text-emerald-400 font-mono tracking-tight mt-0.5">
            {stats.freeTransfers} FT
          </span>
          <span className="text-[10px] font-mono text-neutral-500 mt-0.5">
            £{stats.inTheBank.toFixed(1)}m ITB
          </span>
        </div>
      </div>

      {/* Financial Telemetry Sub-line */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs text-neutral-500 font-mono">
        <div>
          <span>Squad Value: </span>
          <span className="font-medium text-neutral-300">
            £{stats.teamValue.toFixed(1)}m
          </span>
        </div>

        <div>
          <span>Bank: </span>
          <span className="font-medium text-emerald-400">
            £{stats.inTheBank.toFixed(1)}m
          </span>
        </div>
      </div>
    </div>
  );
};
