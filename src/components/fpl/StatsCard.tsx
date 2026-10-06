"use client";

import React from "react";
import { TeamStats } from "@/types/fpl";
import { Clock } from "lucide-react";

interface StatsCardProps {
  stats: TeamStats;
  onOpenChips?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({ stats }) => {
  const ftAvailable =
    stats.ft_available ?? stats.ftAvailable ?? stats.freeTransfers ?? 1;

  return (
    <div className="w-full py-2 space-y-3">
      {/* Top Metadata Row: Gameweek & Team context */}
      <div className="flex items-center justify-between text-xs text-gray-400 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-medium text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            GW {stats.nextGameweek}
          </span>
          <span className="text-gray-600 select-none">/</span>
          <span className="text-gray-300 font-medium truncate max-w-[160px]">
            {stats.teamName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono tabular-nums">
          <Clock className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
          <span>{stats.deadline}</span>
        </div>
      </div>

      {/* Main KPI Columns: Flat typographic hierarchy */}
      <div className="grid grid-cols-3 gap-2 py-1 text-center">
        {/* Overall Points */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] md:text-xs uppercase tracking-wider font-semibold text-gray-400">
            Points
          </span>
          <span className="text-xl md:text-2xl font-bold text-white font-mono tabular-nums tracking-tight mt-0.5">
            {stats.overallPoints.toLocaleString()}
          </span>
          <span className="text-xs font-mono tabular-nums text-emerald-400 font-medium mt-0.5">
            +{stats.gameweekPoints} GW{stats.currentGameweek}
          </span>
        </div>

        {/* Overall Rank */}
        <div className="flex flex-col items-center border-x border-white/10 px-1">
          <span className="text-[10px] md:text-xs uppercase tracking-wider font-semibold text-gray-400">
            Overall Rank
          </span>
          <span className="text-xl md:text-2xl font-bold text-white font-mono tabular-nums tracking-tight mt-0.5">
            #{stats.overallRank.toLocaleString()}
          </span>
          <span className="text-xs font-mono tabular-nums text-gray-400 mt-0.5">
            Top {stats.overallRankPercentile}%
          </span>
        </div>

        {/* Free Transfers */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] md:text-xs uppercase tracking-wider font-semibold text-gray-400">
            Transfers
          </span>
          <span className="text-xl md:text-2xl font-bold text-emerald-400 font-mono tabular-nums tracking-tight mt-0.5">
            {ftAvailable} <span className="text-sm font-normal text-emerald-300">FT</span>
          </span>
          <span className="text-xs font-mono tabular-nums text-gray-400 mt-0.5">
            £{stats.inTheBank.toFixed(1)}m ITB
          </span>
        </div>
      </div>

      {/* Financial Telemetry Sub-line */}
      <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs text-gray-400 font-mono tabular-nums">
        <div>
          <span>Squad Value: </span>
          <span className="font-semibold text-white">
            £{stats.teamValue.toFixed(1)}m
          </span>
        </div>

        <div>
          <span>Bank: </span>
          <span className="font-semibold text-emerald-400">
            £{stats.inTheBank.toFixed(1)}m
          </span>
        </div>
      </div>
    </div>
  );
};
