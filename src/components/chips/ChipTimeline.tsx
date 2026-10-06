"use client";

import React, { useState, useEffect } from "react";
import { ChipStrategyResponse, GameweekStrategy } from "@/types/fpl";
import {
  ArrowRight,
} from "lucide-react";

interface ChipTimelineProps {
  entryId: string;
  onOpenChatWithPrompt?: (prompt: string) => void;
}

export const ChipTimeline: React.FC<ChipTimelineProps> = ({
  entryId,
  onOpenChatWithPrompt,
}) => {
  const [data, setData] = useState<ChipStrategyResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "chips" | "dgw">("all");
  const [selectedGW, setSelectedGW] = useState<GameweekStrategy | null>(null);

  useEffect(() => {
    if (!entryId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/chips/${entryId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load chip strategy data");
        return res.json();
      })
      .then((json: ChipStrategyResponse) => {
        if (isMounted) {
          setData(json);
          // Default select the first upcoming recommended chip GW
          const firstRec = json.timeline.find(
            (t) => t.recommendedChip && t.status !== "completed"
          );
          setSelectedGW(firstRec || json.timeline[0]);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load strategy");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [entryId]);

  if (loading) {
    return (
      <div className="w-full min-h-[340px] flex flex-col items-center justify-center p-8 border border-[#1E2421] bg-[#0D1110] space-y-2">
        <div className="w-4 h-4 border-2 border-[#16C784] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[#7F8983]">
          CALCULATING 38-GW OPTIMALITY MATRIX...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full p-6 border border-[#1E2421] bg-[#0D1110] text-center space-y-2">
        <p className="text-xs text-[#E05252] font-mono">
          {error || "Unable to compute strategy timeline."}
        </p>
      </div>
    );
  }

  const { chipsStatus, timeline, totalProjectedStrategyGain } = data;

  const filteredTimeline = timeline.filter((item) => {
    if (activeFilter === "chips") {
      return item.recommendedChip !== null || item.usedChip !== null;
    }
    if (activeFilter === "dgw") {
      return item.isDGW || item.isBGW || item.recommendedChip !== null;
    }
    return true;
  });

  const getChipBadge = (chip: string | null) => {
    switch (chip) {
      case "WC1":
      case "WC2":
      case "Wildcard 1":
      case "Wildcard 2":
        return "text-[#F1F3EF] bg-[#111614] border-[#1E2421]";
      case "FH":
      case "Free Hit":
        return "text-[#D6A83D] bg-[#111614] border-[#D6A83D]/30";
      case "BB":
      case "Bench Boost":
        return "text-[#16C784] bg-[#111614] border-[#16C784]/30";
      case "TC":
      case "Triple Captain":
        return "text-[#F1F3EF] bg-[#111614] border-[#1E2421]";
      default:
        return "text-[#7F8983] bg-[#111614] border-[#1E2421]";
    }
  };

  return (
    <div className="w-full space-y-4 pb-8 text-[#F1F3EF]">
      {/* 1. Header Overview Ledger */}
      <div className="w-full border-b border-[#1E2421] pb-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#7F8983]">
              STRATEGY BLUEPRINT
            </div>
            <h2 className="text-lg font-bold text-[#F1F3EF] mt-0.5">
              38-Gameweek Chip Optimisation
            </h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-[#16C784] tabular-nums">
              {totalProjectedStrategyGain}
            </div>
            <div className="text-[10px] text-[#7F8983] font-mono uppercase tracking-wider">
              PROJECTED GAIN
            </div>
          </div>
        </div>

        {/* 2. Chip Status Row */}
        <div className="grid grid-cols-5 gap-2 mt-4">
          {[
            { key: "WC 1", label: "Wildcard 1", status: chipsStatus.wildcard1 },
            { key: "WC 2", label: "Wildcard 2", status: chipsStatus.wildcard2 },
            { key: "FH", label: "Free Hit", status: chipsStatus.freehit },
            { key: "BB", label: "Bench Boost", status: chipsStatus.benchBoost },
            { key: "TC", label: "Triple Cap", status: chipsStatus.tripleCaptain },
          ].map((chip) => {
            const isAvail = chip.status.available;
            return (
              <div
                key={chip.key}
                className={`p-2.5 rounded-sm border flex flex-col items-center justify-center text-center space-y-1 transition ${
                  isAvail
                    ? "bg-[#0D1110] border-[#1E2421]"
                    : "bg-[#070908] border-[#1E2421]/60 opacity-40"
                }`}
              >
                <span className="text-xs font-mono font-bold text-[#F1F3EF]">
                  {chip.key}
                </span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm leading-none font-semibold ${
                    isAvail
                      ? "text-[#16C784] bg-[#070908] border border-[#16C784]/40"
                      : "text-[#7F8983] bg-[#070908]"
                  }`}
                >
                  {isAvail ? "READY" : `GW${chip.status.usedEvent ?? "-"}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Filter Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 border border-[#1E2421] bg-[#0D1110] p-0.5 rounded-sm">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 text-xs font-mono font-semibold transition ${
              activeFilter === "all"
                ? "bg-[#070908] text-[#F1F3EF] border border-[#1E2421]"
                : "text-[#7F8983] hover:text-[#F1F3EF]"
            }`}
          >
            All 38 GWs
          </button>
          <button
            onClick={() => setActiveFilter("chips")}
            className={`px-3 py-1.5 text-xs font-mono font-semibold transition ${
              activeFilter === "chips"
                ? "bg-[#070908] text-[#F1F3EF] border border-[#1E2421]"
                : "text-[#7F8983] hover:text-[#F1F3EF]"
            }`}
          >
            Chip Windows ({data.recommendedCount})
          </button>
          <button
            onClick={() => setActiveFilter("dgw")}
            className={`px-3 py-1.5 text-xs font-mono font-semibold transition ${
              activeFilter === "dgw"
                ? "bg-[#070908] text-[#F1F3EF] border border-[#1E2421]"
                : "text-[#7F8983] hover:text-[#F1F3EF]"
            }`}
          >
            DGW / BGW
          </button>
        </div>

        <span className="text-[11px] font-mono text-[#7F8983] tabular-nums">
          {filteredTimeline.length} GAMEWEEKS
        </span>
      </div>

      {/* 4. Interactive Timeline Ledger */}
      <div className="space-y-1.5">
        {filteredTimeline.map((item) => {
          const hasChip = item.recommendedChip !== null || item.usedChip !== null;
          const isSelected = selectedGW?.gameweek === item.gameweek;
          const chipClass = getChipBadge(item.recommendedChip || item.usedChip);

          return (
            <div
              key={item.gameweek}
              onClick={() => setSelectedGW(item)}
              className={`w-full p-3 rounded-sm border transition cursor-pointer text-left ${
                isSelected
                  ? "bg-[#111614] border-[#16C784]"
                  : hasChip
                  ? "bg-[#0D1110] border-[#1E2421] hover:border-neutral-600"
                  : "bg-[#070908] border-[#1E2421] hover:bg-[#0D1110]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left: Gameweek & Tags */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col items-center justify-center w-9 h-9 rounded-sm bg-[#070908] border border-[#1E2421] flex-shrink-0">
                    <span className="text-[8px] font-mono text-[#7F8983] uppercase">GW</span>
                    <span className="text-xs font-mono font-bold text-[#F1F3EF] tabular-nums">
                      {item.gameweek}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.status === "active" && (
                        <span className="text-[9px] font-mono uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm bg-[#070908] text-[#16C784] border border-[#16C784]/40">
                          LIVE
                        </span>
                      )}
                      {item.isDGW && (
                        <span className="text-[9px] font-mono uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm bg-[#070908] text-[#F1F3EF] border border-[#1E2421]">
                          DGW
                        </span>
                      )}
                      {item.isBGW && (
                        <span className="text-[9px] font-mono uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm bg-[#070908] text-[#D6A83D] border border-[#D6A83D]/40">
                          BGW
                        </span>
                      )}
                      {item.recommendedChip && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${chipClass}`}
                        >
                          {item.chipBadge}
                        </span>
                      )}
                      {item.usedChip && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-[#070908] text-[#7F8983] border border-[#1E2421]">
                          USED: {item.usedChip}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#7F8983] truncate mt-0.5">
                      {item.rationale}
                    </p>
                  </div>
                </div>

                {/* Right: Point Gain & Indicator */}
                <div className="text-right flex-shrink-0 font-mono">
                  {item.expectedValueDelta ? (
                    <div className="text-xs font-bold text-[#16C784] tabular-nums">
                      {item.expectedValueDelta}
                    </div>
                  ) : (
                    <div className="text-xs text-[#7F8983] tabular-nums">
                      ~52 pts
                    </div>
                  )}
                  <span className="text-[9px] text-[#7F8983] block uppercase">
                    {item.deadline.split(" ")[0]} {item.deadline.split(" ")[1]}
                  </span>
                </div>
              </div>

              {/* Expanded Detail Panel if Selected */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-[#1E2421] space-y-2.5 text-xs">
                  <div className="text-[#F1F3EF]/90 leading-relaxed font-sans">
                    {item.rationale}
                  </div>

                  {item.keyMatchups && item.keyMatchups.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-[#7F8983] tracking-wider">
                        KEY FIXTURES:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.keyMatchups.map((m, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[#070908] border border-[#1E2421] text-[#F1F3EF]"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {onOpenChatWithPrompt && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenChatWithPrompt(
                          `Explain the tactical reasoning for deploying ${item.chipName || "no chip"} in Gameweek ${item.gameweek}.`
                        );
                      }}
                      className="mt-2 w-full flex items-center justify-between px-3 py-2 rounded-sm bg-[#070908] border border-[#1E2421] hover:border-[#16C784] text-[#7F8983] hover:text-[#F1F3EF] transition"
                    >
                      <span className="text-xs font-mono font-semibold text-[#16C784]">
                        CONSULT ANALYST: GW{item.gameweek} REASONING
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#7F8983]" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
