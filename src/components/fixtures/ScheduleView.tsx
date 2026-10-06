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
        return "bg-emerald-700 text-white font-semibold font-mono";
      case 2:
        return "bg-emerald-500 text-white font-semibold font-mono";
      case 3:
        return "bg-slate-600 text-white font-semibold font-mono";
      case 4:
        return "bg-rose-600 text-white font-semibold font-mono";
      case 5:
        return "bg-rose-800 text-white font-semibold font-mono";
      default:
        return "bg-slate-700 text-white font-semibold font-mono";
    }
  };

  return (
    <div className="w-full space-y-2 select-none">
      {/* 1. Gameweek Selector Strip */}
      <div className="flex items-center justify-between py-1 border-b border-[#1E2421]">
        <button
          disabled={selectedGameweek <= 1}
          onClick={() => onSelectGameweek(Math.max(1, selectedGameweek - 1))}
          aria-label="Previous Gameweek"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-sm bg-[#0D1110] border border-[#1E2421] text-[#7F8983] hover:text-[#F1F3EF] hover:bg-[#111614] disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center min-w-[140px]">
          <span className="text-xs font-bold font-mono text-[#F1F3EF] uppercase tracking-wider block">
            Gameweek {selectedGameweek}
          </span>
          <span className="text-[10px] font-mono text-[#7F8983]">
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
          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-sm bg-[#0D1110] border border-[#1E2421] text-[#7F8983] hover:text-[#F1F3EF] hover:bg-[#111614] disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Editorial Sports Match Schedule (No rounded cards around matches) */}
      {isLoading ? (
        <div className="w-full h-72 flex flex-col items-center justify-center p-8 rounded-sm bg-[#0D1110] border border-[#1E2421] space-y-2">
          <Clock className="w-5 h-5 text-[#16C784] animate-spin" />
          <span className="text-xs font-mono text-[#7F8983]">
            Loading GW{selectedGameweek} schedule...
          </span>
        </div>
      ) : groupedFixtures.length === 0 ? (
        <div className="w-full py-16 text-center text-[#7F8983] font-mono text-xs border border-dashed border-[#1E2421] rounded-sm">
          No matches scheduled for Gameweek {selectedGameweek}
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {groupedFixtures.map((group) => (
            <div key={group.date} className="w-full">
              {/* Editorial Date / Match Count Header */}
              <div className="pb-1.5 flex items-center justify-between border-b border-[#1E2421] text-[11px] font-mono uppercase tracking-wider">
                <span className="font-semibold text-[#F1F3EF]">{group.date}</span>
                <span className="text-[#7F8983] tabular-nums">
                  {group.matches.length} {group.matches.length === 1 ? "MATCH" : "MATCHES"}
                </span>
              </div>

              {/* Match Rows (Sit directly on the page with subtle hairline dividers) */}
              <div className="divide-y divide-[#1E2421]">
                {group.matches.map((match) => {
                  const isFinished = match.finished;
                  const isStarted = match.started;

                  return (
                    <div
                      key={match.id}
                      className="py-2.5 px-0.5 flex items-center justify-between hover:bg-[#0D1110] transition-colors"
                    >
                      {/* Home Team */}
                      <div className="flex-1 flex items-center justify-end gap-2 text-right min-w-0">
                        <span className="text-xs font-bold font-mono text-[#F1F3EF] truncate">
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
                          <div className="flex items-center gap-1.5 font-mono text-xs font-black text-[#F1F3EF] tabular-nums">
                            <span>{match.team_h.score ?? 0}</span>
                            <span className="text-[#7F8983]">-</span>
                            <span>{match.team_a.score ?? 0}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-mono font-bold text-[#F1F3EF] tabular-nums">
                            {match.kickoff_formatted?.time || "15:00"}
                          </span>
                        )}
                        {isFinished && (
                          <span className="text-[8.5px] font-mono uppercase tracking-wider text-[#7F8983] mt-0.5">
                            FT
                          </span>
                        )}
                        {isStarted && !isFinished && (
                          <span className="text-[8.5px] font-mono uppercase tracking-widest text-[#16C784] font-bold mt-0.5">
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
                        <span className="text-xs font-bold font-mono text-[#F1F3EF] truncate">
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
