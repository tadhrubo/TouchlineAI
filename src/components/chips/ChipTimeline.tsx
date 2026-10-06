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
      <div className="w-full min-h-[340px] flex flex-col items-center justify-center p-8 border border-tl-border bg-tl-surface space-y-2">
        <div className="w-4 h-4 border-2 border-tl-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-tl-muted">
          CALCULATING 38-GW OPTIMALITY MATRIX...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full p-6 border border-tl-border bg-tl-surface text-center space-y-2">
        <p className="text-xs text-rose-500 font-mono">
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
        return "text-tl-text bg-tl-surface2 border-tl-border";
      case "FH":
      case "Free Hit":
        return "text-amber-500 bg-tl-surface2 border-amber-500/30";
      case "BB":
      case "Bench Boost":
        return "text-tl-accent bg-tl-surface2 border-tl-accent/30";
      case "TC":
      case "Triple Captain":
        return "text-tl-text bg-tl-surface2 border-tl-border";
      default:
        return "text-tl-muted bg-tl-surface2 border-tl-border";
    }
  };

  return (
    <div className="w-full space-y-4 pb-8 text-tl-text">
      {/* 1. Header Overview Ledger */}
      <div className="w-full border-b border-tl-border pb-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-tl-muted">
              STRATEGY BLUEPRINT
            </div>
            <h2 className="text-lg font-bold text-tl-text mt-0.5">
              38-Gameweek Chip Optimisation
            </h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-tl-accent tabular-nums">
              {totalProjectedStrategyGain}
            </div>
            <div className="text-[10px] text-tl-muted font-mono uppercase tracking-wider">
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
                    ? "bg-tl-surface border-tl-border"
                    : "bg-tl-bg border-tl-border/60 opacity-40"
                }`}
              >
                <span className="text-xs font-mono font-bold text-tl-text">
                  {chip.key}
                </span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm leading-none font-semibold ${
                    isAvail
                      ? "text-tl-accent bg-tl-bg border border-tl-accent/40"
                      : "text-tl-muted bg-tl-bg"
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
        <div className="flex items-center gap-1 border border-tl-border bg-tl-surface p-0.5 rounded-sm">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 text-xs font-mono font-semibold transition ${
              activeFilter === "all"
                ? "bg-tl-bg text-tl-text border border-tl-border"
                : "text-tl-muted hover:text-tl-text"
            }`}
          >
            All 38 GWs
          </button>
          <button
            onClick={() => setActiveFilter("chips")}
            className={`px-3 py-1.5 text-xs font-mono font-semibold transition ${
              activeFilter === "chips"
                ? "bg-tl-bg text-tl-text border border-tl-border"
                : "text-tl-muted hover:text-tl-text"
            }`}
          >
            Chip Windows ({data.recommendedCount})
          </button>
          <button
            onClick={() => setActiveFilter("dgw")}
            className={`px-3 py-1.5 text-xs font-mono font-semibold transition ${
              activeFilter === "dgw"
                ? "bg-tl-bg text-tl-text border border-tl-border"
                : "text-tl-muted hover:text-tl-text"
            }`}
          >
            DGW / BGW
          </button>
        </div>

        <span className="text-[11px] font-mono text-tl-muted tabular-nums">
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
                  ? "bg-tl-surface2 border-tl-accent"
                  : hasChip
                  ? "bg-tl-surface border-tl-border hover:border-tl-muted"
                  : "bg-tl-bg border-tl-border hover:bg-tl-surface"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left: Gameweek & Tags */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col items-center justify-center w-9 h-9 rounded-sm bg-tl-bg border border-tl-border flex-shrink-0">
                    <span className="text-[8px] font-mono text-tl-muted uppercase">GW</span>
                    <span className="text-xs font-mono font-bold text-tl-text tabular-nums">
                      {item.gameweek}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.status === "active" && (
                        <span className="text-[9px] font-mono uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm bg-tl-bg text-tl-accent border border-tl-accent/40">
                          LIVE
                        </span>
                      )}
                      {item.isDGW && (
                        <span className="text-[9px] font-mono uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm bg-tl-bg text-tl-text border border-tl-border">
                          DGW
                        </span>
                      )}
                      {item.isBGW && (
                        <span className="text-[9px] font-mono uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-sm bg-tl-bg text-amber-500 border border-amber-500/40">
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
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-tl-bg text-tl-muted border border-tl-border">
                          USED: {item.usedChip}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-tl-muted truncate mt-0.5">
                      {item.rationale}
                    </p>
                  </div>
                </div>

                {/* Right: Point Gain & Indicator */}
                <div className="text-right flex-shrink-0 font-mono">
                  {item.expectedValueDelta ? (
                    <div className="text-xs font-bold text-tl-accent tabular-nums">
                      {item.expectedValueDelta}
                    </div>
                  ) : (
                    <div className="text-xs text-tl-muted tabular-nums">
                      ~52 pts
                    </div>
                  )}
                  <span className="text-[9px] text-tl-muted block uppercase">
                    {item.deadline.split(" ")[0]} {item.deadline.split(" ")[1]}
                  </span>
                </div>
              </div>

              {/* Expanded Detail Panel if Selected */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-tl-border space-y-2.5 text-xs">
                  <div className="text-tl-text/90 leading-relaxed font-sans">
                    {item.rationale}
                  </div>

                  {item.keyMatchups && item.keyMatchups.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-tl-muted tracking-wider">
                        KEY FIXTURES:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.keyMatchups.map((m, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-tl-bg border border-tl-border text-tl-text"
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
                      className="mt-2 w-full flex items-center justify-between px-3 py-2 rounded-sm bg-tl-bg border border-tl-border hover:border-tl-accent text-tl-muted hover:text-tl-text transition"
                    >
                      <span className="text-xs font-mono font-semibold text-tl-accent">
                        CONSULT ANALYST: GW{item.gameweek} REASONING
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-tl-muted" />
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
