"use client";

import React, { useState, useEffect } from "react";
import { ChipStrategyResponse, GameweekStrategy } from "@/types/fpl";
import {
  Calendar,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  HelpCircle,
  TrendingUp,
  Shield,
  Layers,
  ArrowRight,
  Filter,
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
      <div className="w-full min-h-[380px] flex flex-col items-center justify-center p-8 rounded-xl bg-neutral-900/30 border border-white/[0.04] space-y-3">
        <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-neutral-400">
          Calculating 38-Gameweek Chip Optimality Matrix...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full p-6 rounded-xl bg-neutral-900/40 border border-white/[0.06] text-center space-y-2">
        <p className="text-xs text-rose-400 font-mono">
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

  const getChipColorClasses = (chip: string | null) => {
    switch (chip) {
      case "WC1":
      case "WC2":
      case "Wildcard 1":
      case "Wildcard 2":
        return "text-sky-400 bg-sky-950/40 border-sky-800/40";
      case "FH":
      case "Free Hit":
        return "text-amber-400 bg-amber-950/40 border-amber-800/40";
      case "BB":
      case "Bench Boost":
        return "text-emerald-400 bg-emerald-950/40 border-emerald-800/40";
      case "TC":
      case "Triple Captain":
        return "text-purple-400 bg-purple-950/40 border-purple-800/40";
      default:
        return "text-neutral-400 bg-neutral-900/40 border-white/[0.06]";
    }
  };

  return (
    <div className="w-full space-y-3 pb-8 animate-fade-in text-neutral-200">
      {/* 1. Header Overview Card */}
      <div className="w-full bg-neutral-900/60 border border-white/[0.06] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                Strategy Matrix
              </span>
              <span className="text-[10px] font-mono text-neutral-500">
                • 38-GW Simulation
              </span>
            </div>
            <h2 className="text-sm font-semibold text-neutral-100">
              Season Chip Blueprint
            </h2>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-bold text-emerald-400">
              {totalProjectedStrategyGain}
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              Total Expected Gain
            </div>
          </div>
        </div>

        {/* 2. Chip Status Pills */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
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
                className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center space-y-1 transition ${
                  isAvail
                    ? "bg-neutral-950/70 border-white/[0.08]"
                    : "bg-neutral-950/30 border-white/[0.03] opacity-50"
                }`}
              >
                <span className="text-[11px] font-mono font-bold text-neutral-200">
                  {chip.key}
                </span>
                <span
                  className={`text-[9px] font-mono px-1 py-0.5 rounded leading-none ${
                    isAvail
                      ? "text-emerald-400 bg-emerald-950/40"
                      : "text-neutral-500 bg-neutral-900/60"
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
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 bg-neutral-900/60 p-1 rounded-lg border border-white/[0.06]">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              activeFilter === "all"
                ? "bg-neutral-800 text-neutral-100 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            All 38 GWs
          </button>
          <button
            onClick={() => setActiveFilter("chips")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              activeFilter === "chips"
                ? "bg-neutral-800 text-neutral-100 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Chip Windows ({data.recommendedCount})
          </button>
          <button
            onClick={() => setActiveFilter("dgw")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              activeFilter === "dgw"
                ? "bg-neutral-800 text-neutral-100 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            DGW / BGW
          </button>
        </div>

        <span className="text-[11px] font-mono text-neutral-500">
          Showing {filteredTimeline.length} GWs
        </span>
      </div>

      {/* 4. Interactive Timeline Ledger */}
      <div className="space-y-2">
        {filteredTimeline.map((item) => {
          const hasChip = item.recommendedChip !== null || item.usedChip !== null;
          const isSelected = selectedGW?.gameweek === item.gameweek;
          const chipColor = getChipColorClasses(item.recommendedChip || item.usedChip);

          return (
            <div
              key={item.gameweek}
              onClick={() => setSelectedGW(item)}
              className={`w-full p-3 rounded-xl border transition cursor-pointer text-left ${
                isSelected
                  ? "bg-neutral-900 border-white/20 ring-1 ring-white/10"
                  : hasChip
                  ? "bg-neutral-900/80 border-white/[0.08] hover:border-white/15"
                  : "bg-neutral-950/50 border-white/[0.04] hover:bg-neutral-900/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left: Gameweek & Tags */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-neutral-950 border border-white/[0.06] flex-shrink-0">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase">GW</span>
                    <span className="text-sm font-mono font-bold text-neutral-200">
                      {item.gameweek}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.status === "active" && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          LIVE
                        </span>
                      )}
                      {item.isDGW && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          DGW
                        </span>
                      )}
                      {item.isBGW && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          BGW
                        </span>
                      )}
                      {item.recommendedChip && (
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${chipColor}`}
                        >
                          {item.chipBadge}
                        </span>
                      )}
                      {item.usedChip && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-white/[0.04]">
                          USED: {item.usedChip}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {item.rationale}
                    </p>
                  </div>
                </div>

                {/* Right: Point Gain & Indicator */}
                <div className="text-right flex-shrink-0">
                  {item.expectedValueDelta ? (
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      {item.expectedValueDelta}
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-neutral-500">
                      ~52 pts
                    </div>
                  )}
                  <span className="text-[10px] font-mono text-neutral-500 block">
                    {item.deadline.split(" ")[0]} {item.deadline.split(" ")[1]}
                  </span>
                </div>
              </div>

              {/* Expanded Detail Panel if Selected */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2 text-xs">
                  <div className="text-neutral-300 leading-relaxed">
                    {item.rationale}
                  </div>

                  {item.keyMatchups && item.keyMatchups.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-neutral-500 tracking-wider">
                        Key Fixtures / Matchups:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.keyMatchups.map((m, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-white/[0.04] text-neutral-300"
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
                      className="mt-2 w-full flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-white/[0.06] hover:border-white/20 text-neutral-300 hover:text-neutral-100 transition"
                    >
                      <span className="text-xs font-mono text-emerald-400">
                        Ask AI Assistant about GW{item.gameweek} Strategy
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
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
