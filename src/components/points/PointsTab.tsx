"use client";

import React, { useState, useMemo } from "react";
import { Player, TeamStats } from "@/types/fpl";
import { BadgeLegend } from "../fpl/BadgeLegend";
import { PitchBranding } from "../ui/PitchBranding";
import {
  List,
  Grid,
} from "lucide-react";

interface PointsTabProps {
  stats: TeamStats;
  players: Player[];
  captainId: string;
  viceCaptainId: string;
  onPlayerClick?: (player: Player) => void;
}

function formatNumber(num?: number): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return num.toLocaleString();
}

/**
 * Event Icons Row helper
 */
const MatchEventIcons: React.FC<{ stats?: Player["stats"] }> = ({ stats }) => {
  if (!stats) return null;

  const hasEvents =
    (stats.goals_scored && stats.goals_scored > 0) ||
    (stats.assists && stats.assists > 0) ||
    (stats.clean_sheets && stats.clean_sheets > 0) ||
    (stats.bonus && stats.bonus > 0) ||
    (stats.yellow_cards && stats.yellow_cards > 0) ||
    (stats.red_cards && stats.red_cards > 0) ||
    (stats.saves && stats.saves >= 3);

  if (!hasEvents) return null;

  return (
    <div className="flex items-center justify-center gap-1 mt-0.5 text-[9.5px] leading-none flex-wrap font-mono">
      {stats.goals_scored && stats.goals_scored > 0 ? (
        <span title={`Goals: ${stats.goals_scored}`}>⚽{stats.goals_scored}</span>
      ) : null}
      {stats.assists && stats.assists > 0 ? (
        <span title={`Assists: ${stats.assists}`} className="text-[#16C784] font-bold">
          Ⓐ{stats.assists}
        </span>
      ) : null}
      {stats.clean_sheets && stats.clean_sheets > 0 ? (
        <span title="Clean Sheet">CS</span>
      ) : null}
      {stats.bonus && stats.bonus > 0 ? (
        <span title={`Bonus Points: ${stats.bonus}`} className="text-[#D6A83D] font-bold">
          +{stats.bonus}
        </span>
      ) : null}
      {stats.yellow_cards && stats.yellow_cards > 0 ? (
        <span title="Yellow Card">🟨</span>
      ) : null}
      {stats.red_cards && stats.red_cards > 0 ? (
        <span title="Red Card">🟥</span>
      ) : null}
      {stats.saves && stats.saves >= 3 ? (
        <span title={`Saves: ${stats.saves}`}>S:{stats.saves}</span>
      ) : null}
    </div>
  );
};

export const PointsTab: React.FC<PointsTabProps> = ({
  stats,
  players,
  captainId,
  viceCaptainId,
  onPlayerClick,
}) => {
  const [layoutMode, setLayoutMode] = useState<"pitch" | "list">("pitch");
  const [autosubsEnabled, setAutosubsEnabled] = useState<boolean>(true);

  // Live Rank Dashboard Metrics
  const liveData = stats.liveData || {
    gw_rank: stats.gameweekRank || 0,
    live_rank: stats.liveRank || stats.overallRank || 1,
    old_rank: stats.oldRank || stats.overallRank || 1,
    live_points: stats.gameweekPoints || stats.livePoints || 0,
    safety_score: stats.safetyScore || 42,
    rank_delta: (stats.oldRank || stats.overallRank || 1) - (stats.liveRank || stats.overallRank || 1),
    rank_percent_change: stats.rankPercentChange || 0,
  };

  const rankDelta = liveData.rank_delta ?? ((liveData.old_rank || 1) - (liveData.live_rank || 1));
  const rankPercentChange = liveData.rank_percent_change ?? 0;
  const livePoints = liveData.live_points || stats.gameweekPoints || 0;
  const safetyScore = liveData.safety_score || 42;
  const safetyDiff = livePoints - safetyScore;

  // Split starters vs bench
  const starters = useMemo(() => players.filter((p) => !p.isBench), [players]);
  const bench = useMemo(() => players.filter((p) => p.isBench), [players]);

  // Autosub Simulation Logic for matchday points
  const { effectiveStarters, effectiveBench, effectivePlayedCount } = useMemo(() => {
    if (!autosubsEnabled) {
      const playedCount = starters.filter(
        (p) => (p.stats?.minutes && p.stats.minutes > 0) || p.matchStarted
      ).length;
      return {
        effectiveStarters: starters,
        effectiveBench: bench,
        effectivePlayedCount: playedCount,
      };
    }

    const modStarters = starters.map((p) => ({ ...p, isSubbedIn: false, isSubbedOut: false }));
    const modBench = bench.map((p) => ({ ...p, isSubbedIn: false, isSubbedOut: false }));

    // 1. Goalkeeper Autosub: Only if starting GK match has finished with 0 mins
    const startGK = modStarters.find((p) => p.position === "GKP");
    const benchGK = modBench.find((p) => p.position === "GKP");
    if (
      startGK &&
      benchGK &&
      startGK.matchFinished &&
      (startGK.stats?.minutes || 0) === 0 &&
      ((benchGK.stats?.minutes || 0) > 0 || !benchGK.matchFinished)
    ) {
      startGK.isSubbedOut = true;
      benchGK.isSubbedIn = true;
    }

    // 2. Outfield Autosubs: Sort bench subs by benchOrder (1, 2, 3)
    const outfieldBench = modBench
      .filter((p) => p.position !== "GKP")
      .sort((a, b) => (a.benchOrder ?? 99) - (b.benchOrder ?? 99));

    const failedStarters = modStarters.filter(
      (p) => p.position !== "GKP" && p.matchFinished && (p.stats?.minutes || 0) === 0
    );

    for (const failedStarter of failedStarters) {
      const candidateIndex = outfieldBench.findIndex(
        (sub) => !sub.isSubbedIn && ((sub.stats?.minutes || 0) > 0 || !sub.matchFinished)
      );

      if (candidateIndex !== -1) {
        const candidate = outfieldBench[candidateIndex];

        // Ensure minimum formation rules: 3 DEFs, 2 MIDs, 1 FWD
        const projectedStarters = modStarters.map((p) =>
          p.id === failedStarter.id ? candidate : p
        );

        const defCount = projectedStarters.filter((p) => p.position === "DEF").length;
        const fwdCount = projectedStarters.filter((p) => p.position === "FWD").length;

        if (defCount >= 3 && fwdCount >= 1) {
          failedStarter.isSubbedOut = true;
          candidate.isSubbedIn = true;
        }
      }
    }

    const playedCount = modStarters.filter(
      (p) => (p.stats?.minutes && p.stats.minutes > 0) || p.matchStarted
    ).length;

    return {
      effectiveStarters: modStarters,
      effectiveBench: modBench,
      effectivePlayedCount: playedCount,
    };
  }, [starters, bench, autosubsEnabled]);

  // Position groupings
  const gks = effectiveStarters.filter((p) => p.position === "GKP");
  const defs = effectiveStarters.filter((p) => p.position === "DEF");
  const mids = effectiveStarters.filter((p) => p.position === "MID");
  const fwds = effectiveStarters.filter((p) => p.position === "FWD");

  const renderLivePlayerCard = (player: any, isBenchCard = false) => {
    const rawPts = player.gameweekPoints ?? player.stats?.total_points ?? 0;
    const mult = player.isCaptain ? player.multiplier || 2 : 1;
    const pts = rawPts * mult;

    const top10kEo = player.top10kEo ?? player.top_10k_eo ?? player.eo ?? 0;
    const globalOwnership = player.selectedByPercent ?? 0;

    const isGK = player.position === "GKP";
    const shirtUrl = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.teamShort || "0"}${
      isGK ? "_1" : ""
    }-66.webp`;
    const fallbackUrl = isGK
      ? "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0_1-66.webp"
      : "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0-66.webp";

    return (
      <div
        key={player.id}
        onClick={() => onPlayerClick?.(player)}
        className={`relative flex flex-col items-center justify-between cursor-pointer select-none transition-transform duration-100 hover:-translate-y-0.5 active:scale-95 ${
          isBenchCard ? "w-[76px] sm:w-[84px] md:w-[90px]" : "w-[80px] sm:w-[88px] md:w-[94px]"
        } ${player.isSubbedOut ? "opacity-50 grayscale" : "opacity-100"}`}
      >
        {/* Sub In / Sub Out Indicators */}
        {player.isSubbedIn && (
          <span className="absolute -top-1 -left-1 z-30 bg-[#16C784] text-[#070908] text-[8px] font-black px-1 rounded-sm leading-tight">
            ▲ IN
          </span>
        )}
        {player.isSubbedOut && (
          <span className="absolute -top-1 -left-1 z-30 bg-[#E05252] text-[#F1F3EF] text-[8px] font-bold px-1 rounded-sm leading-tight">
            ▼ OUT
          </span>
        )}

        {/* Captaincy / Vice Captaincy Badges */}
        {player.isCaptain && (
          <div className="absolute -top-1 -right-0.5 z-20 flex items-center justify-center min-w-[15px] h-3.5 rounded-sm bg-[#16C784] text-[#070908] font-black text-[9px] font-mono px-1">
            {player.multiplier === 3 ? "3C" : "C"}
          </div>
        )}
        {!player.isCaptain && player.isViceCaptain && (
          <div className="absolute -top-1 -right-0.5 z-20 flex items-center justify-center min-w-[15px] h-3.5 rounded-sm bg-[#111614] text-[#F1F3EF] border border-[#1E2421] font-bold text-[9px] font-mono px-1">
            V
          </div>
        )}

        {/* Shirt Container */}
        <div className="relative w-9 h-9 md:w-10 md:h-10 flex items-center justify-center my-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shirtUrl}
            alt={player.webName}
            className="w-8 h-8 md:w-9 md:h-9 object-contain drop-shadow"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = fallbackUrl;
            }}
          />
        </div>

        {/* Player Block */}
        <div className="w-full bg-[#0D1110] border border-[#1E2421] rounded-sm text-center">
          {/* Line 1: Player Name */}
          <div className="px-1 py-0.5 border-b border-[#1E2421]">
            <p className="text-[10px] sm:text-[11px] font-semibold text-[#F1F3EF] truncate leading-tight">
              {player.webName}
            </p>
          </div>

          {/* Line 2: Large Live Points */}
          <div
            className={`py-0.5 text-center font-mono font-bold leading-tight ${
              player.isSubbedOut
                ? "bg-[#070908] text-[#7F8983] line-through text-xs"
                : pts > 0
                ? "bg-[#16C784] text-[#070908] text-xs sm:text-sm font-black"
                : "bg-[#111614] text-[#7F8983] text-xs"
            }`}
          >
            {pts}
          </div>

          {/* Line 3: Dual EO */}
          <div className="text-center text-[9px] font-mono font-medium text-[#7F8983] py-0.5 border-t border-[#1E2421]">
            <span>{top10kEo}%</span> <span className="text-[#1E2421]">·</span> <span>{globalOwnership}%</span>
          </div>

          {/* Line 4: Match Events */}
          <div className="min-h-[12px] pb-0.5">
            <MatchEventIcons stats={player.stats} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-3.5 animate-fade-in select-none">
      {/* 1. Flat Editorial Live Rank Dashboard Header (No card wrapping) */}
      <div className="grid grid-cols-3 gap-2 py-2 border-b border-[#1E2421] text-center">
        {/* Column 1: GW Rank */}
        <div className="flex flex-col justify-center border-r border-[#1E2421] pr-1">
          <span className="text-[11px] text-[#7F8983] font-semibold uppercase tracking-wider">
            GW Rank
          </span>
          <span className="text-2xl sm:text-3xl md:text-4xl font-black font-mono tabular-nums text-[#F1F3EF] mt-0.5">
            {formatNumber(liveData.gw_rank)}
          </span>
        </div>

        {/* Column 2: Live Rank & Delta */}
        <div className="flex flex-col justify-center border-r border-[#1E2421] px-1">
          <span className="text-[11px] text-[#7F8983] font-semibold uppercase tracking-wider">
            Live Rank
          </span>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="text-2xl sm:text-3xl md:text-4xl font-black font-mono tabular-nums text-[#F1F3EF]">
              {formatNumber(liveData.live_rank)}
            </span>
            {rankDelta > 0 ? (
              <span className="text-[#16C784] font-bold text-xs">▲</span>
            ) : rankDelta < 0 ? (
              <span className="text-[#E05252] font-bold text-xs">▼</span>
            ) : (
              <span className="text-[#7F8983] text-xs">━</span>
            )}
          </div>
          <span className="text-[10px] font-mono tabular-nums text-[#7F8983] truncate mt-0.5">
            Old: {formatNumber(liveData.old_rank)} ({rankPercentChange >= 0 ? `+${rankPercentChange}` : rankPercentChange}%)
          </span>
        </div>

        {/* Column 3: Points & Safety Score */}
        <div className="flex flex-col justify-center pl-1">
          <span className="text-[11px] text-[#7F8983] font-semibold uppercase tracking-wider">
            Live Points
          </span>
          <span className="text-2xl sm:text-3xl md:text-4xl font-black font-mono tabular-nums text-[#16C784] mt-0.5">
            {livePoints} <span className="text-xs font-semibold text-[#16C784]">pts</span>
          </span>
          <span className="text-[10px] font-mono tabular-nums text-[#7F8983] truncate mt-0.5">
            Safety: {safetyScore} <span className={safetyDiff >= 0 ? "text-[#16C784]" : "text-[#E05252]"}>Δ:{safetyDiff >= 0 ? `+${safetyDiff}` : safetyDiff}</span>
          </span>
        </div>
      </div>

      {/* 2. Controls Bar: Neutral Autosubs & Layout Mode */}
      <div className="flex items-center justify-between py-1 border-b border-[#1E2421] text-xs font-mono">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutosubsEnabled(!autosubsEnabled)}
            className={`px-2 py-0.5 rounded-sm text-xs font-mono transition border ${
              autosubsEnabled
                ? "bg-[#111614] text-[#F1F3EF] border-[#1E2421] font-bold"
                : "bg-transparent text-[#7F8983] border-[#1E2421] hover:text-[#F1F3EF]"
            }`}
          >
            Autosubs {autosubsEnabled ? "ON" : "OFF"}
          </button>

          <span className="text-[#7F8983] text-xs font-mono">
            Played: <strong className="text-[#16C784] font-semibold tabular-nums">{effectivePlayedCount}/11</strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <BadgeLegend />

          {/* Layout Toggle */}
          <div className="flex bg-[#0D1110] rounded-sm p-0.5 border border-[#1E2421]">
            <button
              onClick={() => setLayoutMode("pitch")}
              aria-label="Pitch view"
              className={`p-1 rounded-sm transition ${
                layoutMode === "pitch"
                  ? "bg-[#111614] text-[#F1F3EF]"
                  : "text-[#7F8983] hover:text-[#F1F3EF]"
              }`}
              title="Pitch View"
            >
              <Grid className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              onClick={() => setLayoutMode("list")}
              aria-label="List view"
              className={`p-1 rounded-sm transition ${
                layoutMode === "list"
                  ? "bg-[#111614] text-[#F1F3EF]"
                  : "text-[#7F8983] hover:text-[#F1F3EF]"
              }`}
              title="Compact List View"
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Matchday Pitch or List View */}
      {layoutMode === "pitch" ? (
        <div className="w-full space-y-3">
          {/* Tactical Pitch Canvas */}
          <div className="relative w-full max-w-2xl mx-auto rounded-sm overflow-hidden border border-[#1E2421] bg-[#0A0E0C] select-none p-3 flex flex-col justify-between min-h-[480px] sm:min-h-[520px] md:min-h-[570px]">
            {/* Subtle tactical grid lines background */}
            <div
              className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Vector Pitch Markings */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-15"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="12"
                y="12"
                width="calc(100% - 24px)"
                height="calc(100% - 24px)"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1"
              />
              <line
                x1="12"
                y1="50%"
                x2="calc(100% - 12px)"
                y2="50%"
                stroke="#ffffff"
                strokeWidth="1"
              />
              <circle
                cx="50%"
                cy="50%"
                r="44"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1"
              />
            </svg>

            {/* Top Symmetrical Pitchside Branding */}
            <PitchBranding />

            {/* GK Line */}
            <div className="relative z-10 flex justify-center items-center py-1">
              {gks.map((p) => renderLivePlayerCard(p))}
            </div>

            {/* DEF Line */}
            <div className="relative z-10 flex justify-around items-center py-1 gap-1.5 sm:gap-3 md:gap-6 px-1 md:px-3">
              {defs.map((p) => renderLivePlayerCard(p))}
            </div>

            {/* MID Line */}
            <div className="relative z-10 flex justify-around items-center py-1 gap-1.5 sm:gap-3 md:gap-6 px-1 md:px-3">
              {mids.map((p) => renderLivePlayerCard(p))}
            </div>

            {/* FWD Line */}
            <div className="relative z-10 flex justify-around items-center py-1 gap-1.5 sm:gap-3 md:gap-6 px-2 md:px-4">
              {fwds.map((p) => renderLivePlayerCard(p))}
            </div>
          </div>

          {/* Bench Row */}
          {effectiveBench.length > 0 && (
            <div className="w-full max-w-2xl mx-auto p-2.5 md:p-3 rounded-sm bg-[#0D1110] border border-[#1E2421] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] md:text-xs font-mono text-[#7F8983] px-1">
                <span className="uppercase tracking-wider font-semibold">SUBSTITUTES BENCH</span>
                <span className="text-[10px]">Dual EO & Telemetry</span>
              </div>
              <div className="flex justify-around items-center gap-2 md:gap-6">
                {effectiveBench.map((p, idx) => (
                  <div key={p.id} className="relative flex flex-col items-center flex-1 max-w-[80px] md:max-w-[92px]">
                    <span className="text-[9px] font-mono text-[#7F8983] mb-0.5">
                      {idx === 0 ? "GK" : `B${idx}`}
                    </span>
                    {renderLivePlayerCard(p, true)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Compact List View */
        <div className="p-3 bg-[#0D1110] border border-[#1E2421] rounded-sm space-y-3">
          <div className="flex flex-wrap gap-2 justify-start">
            {effectiveStarters.map((player) => renderLivePlayerCard(player, false))}
            {effectiveBench.map((player) => renderLivePlayerCard(player, true))}
          </div>
        </div>
      )}
    </div>
  );
};
