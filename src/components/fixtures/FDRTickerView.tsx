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
  { level: 1, label: "1 (Very Easy)", bg: "bg-[#00753e]", text: "text-white" },
  { level: 2, label: "2 (Easy)", bg: "bg-[#00ff87]", text: "text-neutral-950 font-bold" },
  { level: 3, label: "3 (Moderate)", bg: "bg-[#ebebe6]", text: "text-neutral-900 font-semibold" },
  { level: 4, label: "4 (Hard)", bg: "bg-[#e90052]", text: "text-white font-medium" },
  { level: 5, label: "5 (Very Hard)", bg: "bg-[#80072d]", text: "text-white font-medium" },
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
        return "bg-[#00753e] text-white";
      case 2:
        return "bg-[#00ff87] text-neutral-950 font-bold";
      case 3:
        return "bg-[#ebebe6] text-neutral-900 font-semibold";
      case 4:
        return "bg-[#e90052] text-white font-medium";
      case 5:
        return "bg-[#80072d] text-white font-medium";
      default:
        return "bg-neutral-800 text-neutral-300";
    }
  };

  return (
    <div className="w-full space-y-3 select-none">
      {/* 1. Matrix Pagination Header */}
      <div className="bg-neutral-900/60 border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
        <button
          disabled={startGW <= 1}
          onClick={() => setStartGW((prev) => Math.max(1, prev - WINDOW_SIZE))}
          className="p-1.5 rounded-md bg-neutral-900 border border-white/[0.06] text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-xs font-mono"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="text-center">
          <span className="text-xs font-bold font-mono text-neutral-100 tracking-tight block">
            Gameweeks {startGW} – {endGW}
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            FDR Matrix Ticker
          </span>
        </div>

        <button
          disabled={startGW >= maxStartGW}
          onClick={() => setStartGW((prev) => Math.min(maxStartGW, prev + WINDOW_SIZE))}
          className="p-1.5 rounded-md bg-neutral-900 border border-white/[0.06] text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-xs font-mono"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. FDR Color Legend Bar */}
      <div className="p-2.5 rounded-xl bg-neutral-900/40 border border-white/[0.06] flex items-center justify-between overflow-x-auto text-[10px] font-mono gap-1.5 no-scrollbar">
        <div className="flex items-center gap-1.5 text-neutral-400 font-medium whitespace-nowrap mr-1">
          <Info className="w-3.5 h-3.5 text-neutral-500" />
          <span>FDR:</span>
        </div>
        <div className="flex items-center gap-1 flex-1 justify-between min-w-[280px]">
          {FDR_LEGEND.map((item) => (
            <div
              key={item.level}
              className={`px-2 py-0.5 rounded text-[9.5px] whitespace-nowrap ${item.bg} ${item.text}`}
            >
              {item.level}
            </div>
          ))}
        </div>
      </div>

      {/* 3. FDR Table / Grid View */}
      <div className="bg-neutral-900/40 border border-white/[0.06] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[440px]">
            {/* Table Header */}
            <thead>
              <tr className="bg-neutral-950/80 border-b border-white/[0.06] text-[10px] font-mono text-neutral-400 uppercase">
                <th className="py-2.5 px-3 sticky left-0 bg-neutral-950/95 z-20 w-[120px] sm:w-[140px] border-r border-white/[0.04]">
                  Club
                </th>
                {visibleGWs.map((gw) => (
                  <th
                    key={gw}
                    className={`py-2.5 px-2 text-center w-[54px] font-bold ${
                      gw === currentGameweek ? "text-emerald-400" : "text-neutral-300"
                    }`}
                  >
                    GW{gw}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: 20 Clubs */}
            <tbody className="divide-y divide-white/[0.04] text-xs">
              {fdrMatrix.map((row) => (
                <tr
                  key={row.teamId}
                  className="hover:bg-neutral-900/60 transition-colors"
                >
                  {/* Sticky Team Label Column */}
                  <td className="py-2 px-3 sticky left-0 bg-[#0B0E14] z-10 border-r border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <JerseyIcon
                        teamShort={row.short_name}
                        size={20}
                        className="flex-shrink-0"
                      />
                      <span className="font-semibold text-neutral-200 text-xs truncate">
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
                          <span className="text-[10px] font-mono text-neutral-600 block">
                            -
                          </span>
                        </td>
                      );
                    }

                    const oppLabel = `${cell.opponentShort} (${cell.isHome ? "H" : "A"})`;

                    return (
                      <td key={gw} className="py-2 px-1 text-center">
                        <span
                          className={`inline-block px-1.5 py-1 rounded text-[9.5px] font-mono whitespace-nowrap shadow-sm ${getFdrClass(
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
