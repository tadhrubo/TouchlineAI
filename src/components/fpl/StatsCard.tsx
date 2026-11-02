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
    <div className="w-full space-y-2 py-1 select-none">
      {/* Top Context Metadata Row */}
      <div className="flex items-center justify-between text-xs text-tl-muted pb-1.5 border-b border-tl-border leading-none">
        <div className="flex items-center gap-2">
          <span className="font-bold text-tl-text font-mono text-xs uppercase tracking-wide">
            GW {stats.nextGameweek}
          </span>
          <span className="text-tl-muted opacity-30 select-none">/</span>
          <span className="text-tl-text font-medium truncate max-w-[220px]">
            {stats.teamName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-tl-muted font-mono tabular-nums">
          <Clock className="w-3 h-3 text-tl-muted opacity-80" aria-hidden="true" />
          <span>{stats.deadline}</span>
        </div>
      </div>

      {/* Main KPI Columns: 3-Tier Typographic Scale */}
      <div className="grid grid-cols-3 gap-2 py-1 text-center">
        {/* Tier 1 Primary: Overall Points */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-tl-muted">
            Points
          </span>
          <span className="text-3xl sm:text-4xl md:text-5xl font-black text-tl-text font-mono tabular-nums tracking-tight mt-0.5">
            {stats.overallPoints.toLocaleString()}
          </span>
          <span className="text-[11px] font-mono tabular-nums text-tl-accent font-semibold mt-0.5">
            +{stats.gameweekPoints} GW{stats.currentGameweek}
          </span>
        </div>

        {/* Tier 1 Primary: Overall Rank */}
        <div className="flex flex-col items-center border-x border-tl-border px-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-tl-muted">
            Overall Rank
          </span>
          <span className="text-2xl sm:text-3xl md:text-4xl font-black text-tl-text font-mono tabular-nums tracking-tight mt-0.5">
            #{stats.overallRank.toLocaleString()}
          </span>
          <span className="text-[11px] font-mono tabular-nums text-tl-muted mt-0.5">
            Top {stats.overallRankPercentile}%
          </span>
        </div>

        {/* Tier 2 Secondary: Free Transfers */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-tl-muted">
            Transfers
          </span>
          <span className="text-2xl sm:text-3xl md:text-4xl font-black text-tl-text font-mono tabular-nums tracking-tight mt-0.5">
            {ftAvailable} <span className="text-sm font-semibold text-tl-accent font-mono">FT</span>
          </span>
          <span className="text-[11px] font-mono tabular-nums text-tl-muted mt-0.5">
            £{stats.inTheBank.toFixed(1)}m ITB
          </span>
        </div>
      </div>

      {/* Bottom Sub-Line: Squad Value and Bank */}
      <div className="flex items-center justify-between pt-1.5 border-t border-tl-border text-[11px] text-tl-muted font-mono tabular-nums leading-none">
        <div>
          <span>Squad Value: </span>
          <span className="font-semibold text-tl-text">
            £{stats.teamValue.toFixed(1)}m
          </span>
        </div>

        <div>
          <span>In the Bank: </span>
          <span className="font-semibold text-tl-accent">
            £{stats.inTheBank.toFixed(1)}m
          </span>
        </div>
      </div>
    </div>
  );
};
