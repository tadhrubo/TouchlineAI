"use client";

import React, { useState, useMemo } from "react";
import { JerseyIcon } from "../fpl/JerseyIcon";
import { TeamFDRRow } from "@/app/api/fixtures/route";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

interface FDRTickerViewProps {
  currentGameweek: number;
  fdrMatrix: TeamFDRRow[];
  isLoading?: boolean;
}

const FDR_LEGEND = [
  { level: 1, label: "1 (Very Easy)", bg: "bg-emerald-700", text: "text-white font-semibold font-mono" },
  { level: 2, label: "2 (Easy)", bg: "bg-emerald-500", text: "text-white font-semibold font-mono" },
  { level: 3, label: "3 (Neutral)", bg: "bg-slate-600", text: "text-white font-semibold font-mono" },
  { level: 4, label: "4 (Hard)", bg: "bg-rose-600", text: "text-white font-semibold font-mono" },
  { level: 5, label: "5 (Very Hard)", bg: "bg-rose-800", text: "text-white font-semibold font-mono" },
];

export const FDRTickerView: React.FC<FDRTickerViewProps> = ({
  currentGameweek,
  fdrMatrix,
  isLoading = false,
}) => {
  const [startGW, setStartGW] = useState<number>(Math.max(1, currentGameweek));
  const WINDOW_SIZE = 6; // Display 6 gameweeks horizontally

  const maxStartGW = Math.max(1, 38 - WINDOW_SIZE + 1);
  const endGW = Math.min(38, startGW + WINDOW_SIZE - 1);

  const visibleGWs = useMemo(() => {
    const gws: number[] = [];
    for (let i = startGW; i <= endGW; i++) {
      gws.push(i);
    }
    return gws;
  }, [startGW, endGW]);

  const getFdrClass = (fdr: number) => {
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
    <div className="w-full space-y-2.5 select-none text-[#F1F3EF]">
      {/* 1. Matrix Pagination Header */}
      <div className="border border-[#1E2421] bg-[#0D1110] p-2.5 flex items-center justify-between">
        <button
          disabled={startGW <= 1}
          onClick={() => setStartGW((prev) => Math.max(1, prev - WINDOW_SIZE))}
          aria-label="Previous Gameweeks"
          className="h-8 px-3 rounded-sm bg-[#070908] border border-[#1E2421] text-[#7F8983] hover:text-[#F1F3EF] hover:border-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5 text-xs font-mono"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PREV</span>
        </button>

        <div className="text-center">
          <span className="text-xs font-bold font-mono text-[#F1F3EF] tracking-tight block tabular-nums">
            GAMEWEEKS {startGW} – {endGW}
          </span>
          <span className="text-[10px] font-mono text-[#7F8983] uppercase tracking-wider">
            FIXTURE DIFFICULTY MATRIX
          </span>
        </div>

        <button
          disabled={startGW >= maxStartGW}
          onClick={() => setStartGW((prev) => Math.min(maxStartGW, prev + WINDOW_SIZE))}
          aria-label="Next Gameweeks"
          className="h-8 px-3 rounded-sm bg-[#070908] border border-[#1E2421] text-[#7F8983] hover:text-[#F1F3EF] hover:border-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5 text-xs font-mono"
        >
          <span className="hidden sm:inline">NEXT</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. FDR Color Legend Bar */}
      <div className="p-2 border border-[#1E2421] bg-[#070908] flex items-center justify-between overflow-x-auto text-[10px] font-mono gap-2 no-scrollbar">
        <div className="flex items-center gap-1.5 text-[#7F8983] font-medium whitespace-nowrap mr-1">
          <Info className="w-3 h-3 text-[#7F8983]" />
          <span>FDR SCALE:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-1 justify-between min-w-[280px]">
          {FDR_LEGEND.map((item) => (
            <div
              key={item.level}
              className={`px-2 py-0.5 rounded-sm text-[9px] whitespace-nowrap ${item.bg} ${item.text}`}
            >
              {item.level}
            </div>
          ))}
        </div>
      </div>

      {/* 3. FDR Table / Grid View (Dense data directly on page) */}
      <div className="border border-[#1E2421] bg-[#070908] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[440px]">
            {/* Table Header */}
            <thead>
              <tr className="bg-[#0D1110] border-b border-[#1E2421] text-[10px] font-mono text-[#7F8983] uppercase">
                <th className="py-2.5 px-3 sticky left-0 bg-[#0D1110] z-20 w-[120px] sm:w-[140px] border-r border-[#1E2421]">
                  CLUB
                </th>
                {visibleGWs.map((gw) => (
                  <th
                    key={gw}
                    className={`py-2 px-2 text-center w-[54px] font-bold ${
                      gw === currentGameweek ? "text-[#16C784]" : "text-[#F1F3EF]"
                    }`}
                  >
                    GW{gw}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: 20 Clubs */}
            <tbody className="divide-y divide-[#1E2421] text-xs">
              {fdrMatrix.map((row) => (
                <tr
                  key={row.teamId}
                  className="hover:bg-[#0D1110] transition-colors"
                >
                  {/* Sticky Team Label Column */}
                  <td className="py-2 px-3 sticky left-0 bg-[#070908] z-10 border-r border-[#1E2421]">
                    <div className="flex items-center gap-2">
                      <JerseyIcon
                        teamShort={row.short_name}
                        size={18}
                        className="flex-shrink-0"
                      />
                      <span className="font-semibold text-[#F1F3EF] text-xs truncate">
                        {row.short_name}
                      </span>
                    </div>
                  </td>

                  {/* GW Cells */}
                  {visibleGWs.map((gw) => {
                    const cell = row.schedule.find((s) => s.gw === gw);
                    if (!cell || cell.opponentId === 0) {
                      return (
                        <td key={gw} className="py-2 px-1 text-center">
                          <span className="text-[10px] font-mono text-[#7F8983] block">
                            -
                          </span>
                        </td>
                      );
                    }

                    const oppLabel = `${cell.opponentShort} (${cell.isHome ? "H" : "A"})`;

                    return (
                      <td key={gw} className="py-2 px-1 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-sm text-[9px] whitespace-nowrap ${getFdrClass(
                            cell.fdr
                          )}`}
                          title={`${row.name} vs ${cell.opponentName} (${
                            cell.isHome ? "Home" : "Away"
                          }) - FDR ${cell.fdr}`}
                        >
                          {oppLabel}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
