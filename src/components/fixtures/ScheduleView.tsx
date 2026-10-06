"use client";

import React, { useMemo } from "react";
import { JerseyIcon } from "../fpl/JerseyIcon";
import { MatchFixture } from "@/app/api/fixtures/route";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

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
  // Group matches by kickoff date
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
        return "bg-emerald-500 text-black font-black font-mono shadow-sm";
      case 2:
        return "bg-emerald-700 text-white font-bold font-mono";
      case 3:
        return "bg-slate-600 text-white font-semibold font-mono";
      case 4:
        return "bg-rose-600 text-white font-bold font-mono";
      case 5:
        return "bg-red-950 text-rose-200 border border-rose-600/80 font-black font-mono";
      default:
        return "bg-slate-700 text-white font-semibold font-mono";
    }
  };

  return (
    <div className="w-full space-y-2 select-none text-tl-text">
      {/* 1. Gameweek Selector Strip */}
      <div className="flex items-center justify-between py-1 border-b border-tl-border">
        <button
          disabled={selectedGameweek <= 1}
          onClick={() => onSelectGameweek(Math.max(1, selectedGameweek - 1))}
          aria-label="Previous Gameweek"
          className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-sm bg-tl-surface border border-tl-border text-tl-muted hover:text-tl-text hover:bg-tl-surface2 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center min-w-[140px]">
          <span className="text-xs font-bold font-mono text-tl-text uppercase tracking-wider block">
            Gameweek {selectedGameweek}
          </span>
          <span className="text-[10px] font-mono text-tl-muted">
            {selectedGameweek === currentGameweek
              ? "Active Matchday"
              : selectedGameweek < currentGameweek
              ? "Completed"
              : `Upcoming (${selectedGameweek - currentGameweek} GWs away)`}
          </span>
        </div>

        <button
          disabled={selectedGameweek >= 38}
          onClick={() => onSelectGameweek(Math.min(38, selectedGameweek + 1))}
          aria-label="Next Gameweek"
          className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-sm bg-tl-surface border border-tl-border text-tl-muted hover:text-tl-text hover:bg-tl-surface2 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Editorial Sports Match Schedule */}
      {isLoading ? (
        <div className="w-full h-72 flex flex-col items-center justify-center p-8 rounded-sm bg-tl-surface border border-tl-border space-y-2">
          <Clock className="w-5 h-5 text-tl-accent animate-spin" />
          <span className="text-xs font-mono text-tl-muted">
            Loading GW{selectedGameweek} schedule...
          </span>
        </div>
      ) : groupedFixtures.length === 0 ? (
        <div className="w-full py-16 text-center text-tl-muted font-mono text-xs border border-dashed border-tl-border rounded-sm">
          No matches scheduled for Gameweek {selectedGameweek}
        </div>
      ) : (
        <div className="space-y-3.5 pt-1">
          {groupedFixtures.map((group) => (
            <div key={group.date} className="w-full">
              {/* Editorial Date / Match Count Header */}
              <div className="pb-1.5 flex items-center justify-between border-b border-tl-border text-[11px] font-mono uppercase tracking-wider">
                <span className="font-semibold text-tl-text">{group.date}</span>
                <span className="text-tl-muted tabular-nums">
                  {group.matches.length} {group.matches.length === 1 ? "MATCH" : "MATCHES"}
                </span>
              </div>

              {/* Match Rows */}
              <div className="divide-y divide-tl-border">
                {group.matches.map((match) => {
                  const isFinished = match.finished;
                  const isStarted = match.started;

                  return (
                    <div
                      key={match.id}
                      className="py-2.5 px-0.5 flex items-center justify-between hover:bg-tl-surface transition-colors"
                    >
                      {/* Home Team */}
                      <div className="flex-1 flex items-center justify-end gap-2 text-right min-w-0">
                        <span className="text-xs font-bold font-mono text-tl-text truncate">
                          {match.team_h.short_name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded-none ${getFdrPillClass(
                            match.team_h.fdr
                          )}`}
                          title={`Fixture Difficulty: ${match.team_h.fdr}`}
                        >
                          {match.team_h.fdr}
                        </span>
                        <JerseyIcon
                          teamShort={match.team_h.short_name}
                          size={22}
                          className="flex-shrink-0"
                        />
                      </div>

                      {/* Score / Kickoff Center Column */}
                      <div className="px-3 min-w-[76px] text-center flex flex-col items-center">
                        {isStarted || isFinished ? (
                          <div className="flex items-center gap-1.5 font-mono text-xs font-black text-tl-text tabular-nums">
                            <span>{match.team_h.score ?? 0}</span>
                            <span className="text-tl-muted">-</span>
                            <span>{match.team_a.score ?? 0}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-mono font-bold text-tl-text tabular-nums">
                            {match.kickoff_formatted?.time || "15:00"}
                          </span>
                        )}
                        {isFinished && (
                          <span className="text-[8.5px] font-mono uppercase tracking-wider text-tl-muted mt-0.5">
                            FT
                          </span>
                        )}
                        {isStarted && !isFinished && (
                          <span className="text-[8.5px] font-mono uppercase tracking-widest text-tl-accent font-bold mt-0.5">
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
                          className={`text-[9px] font-mono px-1 py-0.2 rounded-none ${getFdrPillClass(
                            match.team_a.fdr
                          )}`}
                          title={`Fixture Difficulty: ${match.team_a.fdr}`}
                        >
                          {match.team_a.fdr}
                        </span>
                        <span className="text-xs font-bold font-mono text-tl-text truncate">
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
