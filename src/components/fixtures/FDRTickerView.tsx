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
  { level: 1, label: "1 (Very Easy)", bg: "bg-emerald-500 text-black font-black font-mono" },
  { level: 2, label: "2 (Easy)", bg: "bg-emerald-700 text-white font-bold font-mono" },
  { level: 3, label: "3 (Neutral)", bg: "bg-slate-600 text-white font-semibold font-mono" },
  { level: 4, label: "4 (Hard)", bg: "bg-rose-600 text-white font-bold font-mono" },
  { level: 5, label: "5 (Very Hard)", bg: "bg-red-950 text-rose-200 border border-rose-600/80 font-black font-mono" },
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
    <div className="w-full space-y-2.5 select-none text-tl-text">
      {/* 1. Matrix Pagination Header */}
      <div className="border border-tl-border bg-tl-surface p-2 flex items-center justify-between">
        <button
          disabled={startGW <= 1}
          onClick={() => setStartGW((prev) => Math.max(1, prev - WINDOW_SIZE))}
          aria-label="Previous Gameweeks"
          className="h-8 px-3 rounded-sm bg-tl-bg border border-tl-border text-tl-muted hover:text-tl-text disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5 text-xs font-mono font-semibold"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PREV</span>
        </button>

        <div className="text-center">
          <span className="text-xs font-black font-mono text-tl-text tracking-tight block tabular-nums">
            GAMEWEEKS {startGW} – {endGW}
          </span>
          <span className="text-[10px] font-mono text-tl-muted uppercase tracking-wider">
            FIXTURE DIFFICULTY MATRIX
          </span>
        </div>

        <button
          disabled={startGW >= maxStartGW}
          onClick={() => setStartGW((prev) => Math.min(maxStartGW, prev + WINDOW_SIZE))}
          aria-label="Next Gameweeks"
          className="h-8 px-3 rounded-sm bg-tl-bg border border-tl-border text-tl-muted hover:text-tl-text disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5 text-xs font-mono font-semibold"
        >
          <span className="hidden sm:inline">NEXT</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. High-Contrast FDR Color Legend Bar */}
      <div className="p-2 border border-tl-border bg-tl-bg flex items-center justify-between overflow-x-auto text-[10px] font-mono gap-2 no-scrollbar">
        <div className="flex items-center gap-1.5 text-tl-muted font-semibold whitespace-nowrap mr-1">
          <Info className="w-3.5 h-3.5 text-tl-muted" />
          <span>FDR SCALE:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-1 justify-between min-w-[280px]">
          {FDR_LEGEND.map((item) => (
            <div
              key={item.level}
              className={`px-2 py-0.5 rounded-sm text-[9.5px] whitespace-nowrap ${item.bg}`}
            >
              {item.level} {item.level === 1 ? "Easy" : item.level === 5 ? "Hard" : ""}
            </div>
          ))}
        </div>
      </div>

      {/* 3. FDR Table / Grid View */}
      <div className="border border-tl-border bg-tl-bg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[460px]">
            {/* Table Header: Prominent Gameweek column headers */}
            <thead>
              <tr className="bg-tl-surface border-b border-tl-border text-xs font-mono text-tl-muted">
                <th className="py-2 px-3 sticky left-0 bg-tl-surface z-20 w-[110px] sm:w-[130px] border-r border-tl-border font-bold uppercase tracking-wider text-[11px]">
                  Club
                </th>
                {visibleGWs.map((gw) => (
                  <th
                    key={gw}
                    className={`py-2 px-2 text-center w-[54px] font-bold text-xs tabular-nums ${
                      gw === currentGameweek
                        ? "text-tl-accent bg-tl-surface2 border-b-2 border-tl-accent"
                        : "text-tl-text"
                    }`}
                  >
                    GW{gw}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: Subtle hairline dividers */}
            <tbody className="divide-y divide-tl-border text-xs">
              {fdrMatrix.map((row) => (
                <tr
                  key={row.teamId}
                  className="hover:bg-tl-surface2/60 transition-colors"
                >
                  {/* Sticky Team Label Column */}
                  <td className="py-2 px-3 sticky left-0 bg-tl-bg z-10 border-r border-tl-border">
                    <div className="flex items-center gap-2">
                      <JerseyIcon
                        teamShort={row.short_name}
                        size={18}
                        className="flex-shrink-0"
                      />
                      <span className="font-bold font-mono text-tl-text text-xs tracking-wide truncate">
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
                          <span className="text-[10px] font-mono text-tl-muted/40 block">
                            -
                          </span>
                        </td>
                      );
                    }

                    const oppLabel = `${cell.opponentShort} (${cell.isHome ? "H" : "A"})`;

                    return (
                      <td key={gw} className="py-1.5 px-1 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-mono whitespace-nowrap ${getFdrClass(
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
