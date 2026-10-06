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
    <div className="w-full py-1 space-y-3">
      {/* Top Metadata Row: Gameweek & Team context */}
      <div className="flex items-center justify-between text-xs text-[#7F8983] pb-2 border-b border-[#1E2421]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#F1F3EF] font-mono uppercase tracking-wider text-xs">
            GW {stats.nextGameweek}
          </span>
          <span className="text-[#1E2421] select-none">/</span>
          <span className="text-[#F1F3EF] font-medium truncate max-w-[200px]">
            {stats.teamName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#7F8983] font-mono tabular-nums">
          <Clock className="w-3.5 h-3.5 text-[#7F8983]" aria-hidden="true" />
          <span>{stats.deadline}</span>
        </div>
      </div>

      {/* Main KPI Columns: Powerful editorial hierarchy with dominating FPL numbers */}
      <div className="grid grid-cols-3 gap-2 py-2 text-center">
        {/* Overall Points */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#7F8983]">
            Points
          </span>
          <span className="text-3xl sm:text-4xl md:text-5xl font-black text-[#F1F3EF] font-mono tabular-nums tracking-tight mt-1">
            {stats.overallPoints.toLocaleString()}
          </span>
          <span className="text-xs font-mono tabular-nums text-[#16C784] font-semibold mt-1">
            +{stats.gameweekPoints} GW{stats.currentGameweek}
          </span>
        </div>

        {/* Overall Rank */}
        <div className="flex flex-col items-center border-x border-[#1E2421] px-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#7F8983]">
            Overall Rank
          </span>
          <span className="text-2xl sm:text-3xl md:text-4xl font-black text-[#F1F3EF] font-mono tabular-nums tracking-tight mt-1">
            #{stats.overallRank.toLocaleString()}
          </span>
          <span className="text-xs font-mono tabular-nums text-[#7F8983] mt-1">
            Top {stats.overallRankPercentile}%
          </span>
        </div>

        {/* Free Transfers */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#7F8983]">
            Transfers
          </span>
          <span className="text-2xl sm:text-3xl md:text-4xl font-black text-[#F1F3EF] font-mono tabular-nums tracking-tight mt-1">
            {ftAvailable} <span className="text-sm font-semibold text-[#16C784]">FT</span>
          </span>
          <span className="text-xs font-mono tabular-nums text-[#7F8983] mt-1">
            £{stats.inTheBank.toFixed(1)}m ITB
          </span>
        </div>
      </div>

      {/* Financial Telemetry Sub-line */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1E2421] text-xs text-[#7F8983] font-mono tabular-nums">
        <div>
          <span>Squad Value: </span>
          <span className="font-semibold text-[#F1F3EF]">
            £{stats.teamValue.toFixed(1)}m
          </span>
        </div>

        <div>
          <span>Bank: </span>
          <span className="font-semibold text-[#16C784]">
            £{stats.inTheBank.toFixed(1)}m
          </span>
        </div>
      </div>
    </div>
  );
};
