"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { JerseyIcon } from "../fpl/JerseyIcon";
import { MatchFixture } from "@/app/api/fixtures/route";
import { ChevronLeft, ChevronRight, Clock, Calendar } from "lucide-react";

interface ScheduleViewProps {
  currentGameweek: number;
  selectedGameweek: number;
  fixtures: MatchFixture[];
  isLoading?: boolean;
  onSelectGameweek: (gw: number) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  currentGameweek,
  selectedGameweek,
  fixtures,
  isLoading = false,
  onSelectGameweek,
}) => {
  // Group 10 matches by kickoff date
  const groupedFixtures = useMemo(() => {
    const groups: { date: string; matches: MatchFixture[] }[] = [];
    const dateMap = new Map<string, MatchFixture[]>();

    fixtures.forEach((match) => {
      const dateKey = match.kickoff_formatted?.date || "TBD";
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(match);
    });

    dateMap.forEach((matches, date) => {
      groups.push({ date, matches });
    });

    return groups;
  }, [fixtures]);

  const getFdrPillClass = (fdr: number) => {
    switch (fdr) {
      case 1:
        return "bg-[#00753e] text-white";
      case 2:
        return "bg-[#00ff87] text-neutral-950 font-bold";
      case 3:
        return "bg-[#ebebe6] text-neutral-900 font-semibold";
      case 4:
        return "bg-[#e90052] text-white";
      case 5:
        return "bg-[#80072d] text-white";
      default:
        return "bg-neutral-800 text-neutral-300";
    }
  };

  return (
    <div className="w-full space-y-3 select-none">
      {/* 1. Gameweek Selector Header */}
      <div className="bg-neutral-900/60 border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
        <button
          disabled={selectedGameweek <= 1}
          onClick={() => onSelectGameweek(Math.max(1, selectedGameweek - 1))}
          className="p-1.5 rounded-md bg-neutral-900 border border-white/[0.06] text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center min-w-[120px]">
          <span className="text-xs font-bold font-mono text-neutral-100 tracking-tight block">
            Gameweek {selectedGameweek}
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            {selectedGameweek === currentGameweek
              ? "Active Gameweek"
              : selectedGameweek < currentGameweek
              ? "Completed"
              : `Upcoming (${selectedGameweek - currentGameweek} GWs away)`}
          </span>
        </div>

        <button
          disabled={selectedGameweek >= 38}
          onClick={() => onSelectGameweek(Math.min(38, selectedGameweek + 1))}
          className="p-1.5 rounded-md bg-neutral-900 border border-white/[0.06] text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Date-Grouped Match Schedule */}
      {isLoading ? (
        <div className="w-full h-72 flex flex-col items-center justify-center p-8 rounded-xl bg-neutral-900/30 border border-white/[0.04] space-y-2">
          <Clock className="w-5 h-5 text-neutral-400 animate-spin" />
          <span className="text-xs font-mono text-neutral-400">
            Loading GW{selectedGameweek} schedule...
          </span>
        </div>
      ) : groupedFixtures.length === 0 ? (
        <div className="w-full py-16 text-center rounded-xl bg-neutral-900/20 border border-white/[0.04] text-neutral-500 font-mono text-xs">
          No matches scheduled for Gameweek {selectedGameweek}
        </div>
      ) : (
        <div className="space-y-3">
          {groupedFixtures.map((group) => (
            <div
              key={group.date}
              className="bg-neutral-900/40 border border-white/[0.06] rounded-xl overflow-hidden shadow-sm"
            >
              {/* Date Group Header */}
              <div className="px-3.5 py-2 bg-neutral-950/60 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-neutral-500" />
                  <span className="text-[11px] font-mono font-medium text-neutral-300">
                    {group.date}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500">
                  {group.matches.length} {group.matches.length === 1 ? "Match" : "Matches"}
                </span>
              </div>

              {/* Match Rows */}
              <div className="divide-y divide-white/[0.04]">
                {group.matches.map((match) => {
                  const isFinished = match.finished;
                  const isStarted = match.started;

                  return (
                    <div
                      key={match.id}
                      className="px-3 py-2.5 flex items-center justify-between hover:bg-neutral-900/60 transition-colors"
                    >
                      {/* Home Team */}
                      <div className="flex-1 flex items-center justify-end gap-2 text-right min-w-0">
                        <span className="text-xs font-semibold text-neutral-200 truncate">
                          {match.team_h.short_name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded ${getFdrPillClass(
                            match.team_h.fdr
                          )}`}
                          title={`Fixture Difficulty: ${match.team_h.fdr}`}
                        >
                          FDR {match.team_h.fdr}
                        </span>
                        <JerseyIcon
                          teamShort={match.team_h.short_name}
                          size={22}
                          className="flex-shrink-0"
                        />
                      </div>

                      {/* Score / Kickoff Center Pill */}
                      <div className="px-3 min-w-[70px] text-center flex flex-col items-center">
                        {isStarted || isFinished ? (
                          <div className="flex items-center gap-1 font-mono text-xs font-bold text-neutral-100 bg-neutral-950 px-2 py-0.5 rounded border border-white/[0.08]">
                            <span>{match.team_h.score ?? 0}</span>
                            <span className="text-neutral-500">-</span>
                            <span>{match.team_a.score ?? 0}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono font-medium text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-white/[0.06]">
                            {match.kickoff_formatted?.time || "15:00"}
                          </span>
                        )}
                        {isFinished && (
                          <span className="text-[8px] font-mono uppercase text-neutral-500 mt-0.5">
                            FT
                          </span>
                        )}
                        {isStarted && !isFinished && (
                          <span className="text-[8px] font-mono uppercase text-emerald-400 mt-0.5 animate-pulse">
                            LIVE
                          </span>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex-1 flex items-center justify-start gap-2 text-left min-w-0">
                        <JerseyIcon
                          teamShort={match.team_a.short_name}
                          size={22}
                          className="flex-shrink-0"
                        />
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded ${getFdrPillClass(
                            match.team_a.fdr
                          )}`}
                          title={`Fixture Difficulty: ${match.team_a.fdr}`}
                        >
                          FDR {match.team_a.fdr}
                        </span>
                        <span className="text-xs font-semibold text-neutral-200 truncate">
                          {match.team_a.short_name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
