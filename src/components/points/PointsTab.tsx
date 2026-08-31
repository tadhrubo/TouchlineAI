"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Player, TeamStats } from "@/types/fpl";
import { BadgeLegend } from "../fpl/BadgeLegend";
import { getPerformanceBadge } from "@/utils/fplBadges";
import { PitchBranding } from "../ui/PitchBranding";
import {
  List,
  Grid,
  Shield,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
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
    <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px] leading-none flex-wrap">
      {stats.goals_scored && stats.goals_scored > 0 ? (
        <span title={`Goals: ${stats.goals_scored}`}>⚽ {stats.goals_scored}</span>
      ) : null}
      {stats.assists && stats.assists > 0 ? (
        <span title={`Assists: ${stats.assists}`} className="text-emerald-400 font-bold">
          Ⓐ {stats.assists}
        </span>
      ) : null}
      {stats.clean_sheets && stats.clean_sheets > 0 ? (
        <span title="Clean Sheet">🛡️</span>
      ) : null}
      {stats.bonus && stats.bonus > 0 ? (
        <span title={`Bonus Points: ${stats.bonus}`} className="text-yellow-400">
          ⭐ {stats.bonus}
        </span>
      ) : null}
      {stats.yellow_cards && stats.yellow_cards > 0 ? (
        <span title="Yellow Card">🟨</span>
      ) : null}
      {stats.red_cards && stats.red_cards > 0 ? (
        <span title="Red Card">🟥</span>
      ) : null}
      {stats.saves && stats.saves >= 3 ? (
        <span title={`Saves: ${stats.saves}`}>🧤 {stats.saves}</span>
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

    // 2. Outfield Autosub: Only replace starters whose matches finished with 0 mins
    const zeroMinsFinished = modStarters.filter(
      (p) => p.position !== "GKP" && p.matchFinished && (p.stats?.minutes || 0) === 0
    );

    for (const starter of zeroMinsFinished) {
      const subCandidate = modBench.find(
        (b) =>
          b.position !== "GKP" &&
          !b.isSubbedIn &&
          ((b.stats?.minutes || 0) > 0 || !b.matchFinished)
      );

      if (subCandidate) {
        // Formation constraints check (min 3 DEF, 2 MID, 1 FWD)
        const defCount = modStarters.filter(
          (p) => p.position === "DEF" && !p.isSubbedOut
        ).length;

        if (starter.position === "DEF" && defCount <= 3 && subCandidate.position !== "DEF") {
          const benchDef = modBench.find(
            (b) =>
              b.position === "DEF" &&
              !b.isSubbedIn &&
              ((b.stats?.minutes || 0) > 0 || !b.matchFinished)
          );
          if (benchDef) {
            starter.isSubbedOut = true;
            benchDef.isSubbedIn = true;
          }
          continue;
        }

        starter.isSubbedOut = true;
        subCandidate.isSubbedIn = true;
      }
    }

    let playedSum = 0;
    for (const p of modStarters) {
      if (!p.isSubbedOut && ((p.stats?.minutes || 0) > 0 || p.matchStarted)) playedSum++;
    }
    for (const b of modBench) {
      if (b.isSubbedIn && ((b.stats?.minutes || 0) > 0 || b.matchStarted)) playedSum++;
    }

    return {
      effectiveStarters: modStarters,
      effectiveBench: modBench,
      effectivePlayedCount: playedSum,
    };
  }, [starters, bench, autosubsEnabled]);

  // Position grouping for Pitch layout
  const gks = effectiveStarters.filter((p) => p.position === "GKP");
  const defs = effectiveStarters.filter((p) => p.position === "DEF");
  const mids = effectiveStarters.filter((p) => p.position === "MID");
  const fwds = effectiveStarters.filter((p) => p.position === "FWD");

  const renderLivePlayerCard = (player: Player, isBench = false) => {
    const isGK = player.element_type === 1 || player.elementType === 1 || player.position === "GKP";
    const baseCode = player.team_code || player.teamCode || 0;
    const shirtCode = isGK ? `${baseCode}_1` : `${baseCode}`;
    const shirtUrl = player.kitUrl || `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${shirtCode}-66.webp`;
    const fallbackUrl = isGK
      ? "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0_1-66.webp"
      : "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0-66.webp";

    const pts = player.gw_points ?? player.live_points ?? player.gameweekPoints ?? (player.stats?.total_points || 0);
    const mins = player.stats?.minutes ?? 0;
    const hasPlayed = mins > 0 || (player.matchStarted && player.matchFinished);
    const isYetToPlay = Boolean(player.yetToPlay || (!hasPlayed && !player.matchFinished));
    const isBlanked = (player.matchFinished || hasPlayed) && pts <= 0;

    const top10kEo = Math.round(
      player.top_10k_eo ?? player.top10kEo ?? (player.selectedByPercent * 1.5)
    );
    const globalOwnership = Math.round(player.selectedByPercent || 0);

    const badge = getPerformanceBadge(
      pts,
      mins,
      player.selectedByPercent,
      player.top_10k_eo ?? player.top10kEo,
      player.isSubbedIn,
      player.isSubbedOut
    );

    const isBenchDimmed = isBench && !player.isSubbedIn;

    return (
      <div
        key={player.id}
        onClick={() => onPlayerClick && onPlayerClick(player)}
        className={`flex flex-col items-center justify-center relative flex-1 min-w-0 max-w-[80px] md:max-w-[92px] cursor-pointer transition-transform duration-150 hover:scale-105 ${
          player.isSubbedOut
            ? "opacity-40"
            : isBenchDimmed
            ? "opacity-60 hover:opacity-100"
            : "opacity-100"
        }`}
      >
        {/* Sub In / Sub Out Indicators */}
        {player.isSubbedIn && (
          <span className="absolute -top-1.5 -left-1.5 z-30 bg-emerald-500 text-black text-[8px] md:text-[9px] font-extrabold px-1 rounded shadow border border-emerald-400 leading-tight">
            ▲ IN
          </span>
        )}
        {player.isSubbedOut && (
          <span className="absolute -top-1.5 -left-1.5 z-30 bg-rose-600 text-white text-[8px] md:text-[9px] font-extrabold px-1 rounded shadow border border-rose-500 leading-tight">
            ▼ OUT
          </span>
        )}

        {/* Captaincy / Vice Captaincy Badges */}
        {player.isCaptain && (
          <div className="absolute -top-1 -right-0.5 z-20 flex items-center justify-center w-4 h-4 md:w-4.5 md:h-4.5 rounded-full bg-amber-400 text-black font-extrabold text-[9px] md:text-[10px] shadow-md border border-amber-200">
            {player.multiplier === 3 ? "3C" : "C"}
          </div>
        )}
        {!player.isCaptain && player.isViceCaptain && (
          <div className="absolute -top-1 -right-0.5 z-20 flex items-center justify-center w-4 h-4 md:w-4.5 md:h-4.5 rounded-full bg-neutral-300 text-black font-extrabold text-[9px] md:text-[10px] shadow-md border border-neutral-100">
            V
          </div>
        )}

        {/* Shirt & Badge Container */}
        <div className="relative w-10 h-10 md:w-11 md:h-11 flex items-center justify-center">
          {badge && (
            <div className="absolute -top-2 -left-3 z-20 bg-[#131722] rounded-full text-[11px] md:text-xs shadow-sm leading-none border border-gray-700 p-[3px]">
              {badge}
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shirtUrl}
            alt={player.webName}
            className="w-9 h-9 md:w-10 md:h-10 object-contain drop-shadow"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = fallbackUrl;
            }}
          />
          {hasPlayed && (
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-black shadow" />
          )}
        </div>

        {/* Line 1: Player Name */}
        <div className="w-full mt-0.5 px-0.5 py-0.5 rounded-t bg-black/90 border-t border-x border-white/[0.08] backdrop-blur-sm text-center shadow">
          <p className="text-[10px] md:text-[11px] font-semibold text-neutral-200 truncate leading-tight">
            {player.webName}
          </p>
        </div>

        {/* Line 2: Large Live Points */}
        <div
          className={`w-full py-0.5 border-x text-center font-mono font-bold leading-tight ${
            player.isSubbedOut
              ? "bg-neutral-950 text-neutral-600 border-neutral-800 line-through text-[11px] md:text-xs"
              : player.isSubbedIn || pts > 0
              ? "bg-emerald-500 text-white border-emerald-600 text-xs md:text-sm shadow-sm"
              : isYetToPlay
              ? "bg-gray-900 text-gray-300 border-gray-800 text-[11px] md:text-xs"
              : isBlanked
              ? "bg-gray-600 text-white border-gray-500 text-[11px] md:text-xs"
              : "bg-gray-900 text-gray-400 border-gray-800 text-[11px] md:text-xs"
          }`}
        >
          {pts}
        </div>

        {/* Line 3: Dual EO (Top 10k EO % and Global Ownership %) */}
        <div className="w-full bg-black/95 text-center text-[9px] md:text-[10px] font-mono font-medium text-gray-300 py-0.5 border-x border-white/[0.08]">
          <span>{top10kEo}%</span> <span className="text-gray-500">·</span> <span>{globalOwnership}%</span>
        </div>

        {/* Line 4: Match Event Icons Row */}
        <div className="w-full bg-[#0B0E14] text-center pb-1 rounded-b border-b border-x border-white/[0.08] min-h-[14px]">
          <MatchEventIcons stats={player.stats} />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-3 animate-fade-in">
      {/* 1. LiveFPL-Style 3-Column Live Rank Dashboard Header */}
      <div className="grid grid-cols-3 gap-2 bg-[#131722] border border-gray-800 rounded-xl p-3 md:p-5 text-center shadow-lg">
        {/* Column 1: GW Rank */}
        <div className="flex flex-col justify-center border-r border-gray-800 pr-1">
          <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider">
            GW Rank
          </span>
          <span className="text-base sm:text-lg md:text-2xl font-bold font-mono text-white mt-0.5">
            {formatNumber(liveData.gw_rank)}
          </span>
        </div>

        {/* Column 2: Live Rank & Delta */}
        <div className="flex flex-col justify-center border-r border-gray-800 px-1">
          <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider">
            Live Rank
          </span>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <span className="text-base sm:text-lg md:text-2xl font-bold font-mono text-white">
              {formatNumber(liveData.live_rank)}
            </span>
            {rankDelta > 0 ? (
              <span className="text-emerald-500 font-bold text-xs md:text-sm">▲</span>
            ) : rankDelta < 0 ? (
              <span className="text-rose-500 font-bold text-xs md:text-sm">▼</span>
            ) : (
              <span className="text-neutral-500 text-xs">━</span>
            )}
          </div>
          <span className="text-[9px] md:text-[11px] font-mono text-gray-400 truncate">
            Old: {formatNumber(liveData.old_rank)} ({rankPercentChange >= 0 ? `+${rankPercentChange}` : rankPercentChange}%)
          </span>
        </div>

        {/* Column 3: Points & Safety Score */}
        <div className="flex flex-col justify-center pl-1">
          <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider">
            Points
          </span>
          <span className="text-base sm:text-lg md:text-2xl font-bold font-mono text-emerald-400 mt-0.5">
            {livePoints} <span className="text-[10px] md:text-xs font-normal text-emerald-500">pts</span>
          </span>
          <span className="text-[9px] md:text-[11px] font-mono text-gray-400 truncate">
            Safety: {safetyScore} <span className={safetyDiff >= 0 ? "text-emerald-400" : "text-rose-400"}>Δ:{safetyDiff >= 0 ? `+${safetyDiff}` : safetyDiff}</span>
          </span>
        </div>
      </div>

      {/* 2. Controls Bar: Autosubs & Layout Mode */}
      <div className="flex items-center justify-between px-3 py-2 md:py-2.5 rounded-xl bg-neutral-900/60 border border-white/[0.06] text-xs font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutosubsEnabled(!autosubsEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] md:text-xs font-mono transition-all border ${
              autosubsEnabled
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                : "bg-neutral-900 text-neutral-400 border-white/[0.06] hover:text-neutral-200"
            }`}
          >
            <span>Autosubs</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                autosubsEnabled ? "bg-emerald-400" : "bg-neutral-600"
              }`}
            />
          </button>

          <span className="text-neutral-400 text-[11px] md:text-xs">
            Played: <strong className="text-emerald-400">{effectivePlayedCount}/11</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <BadgeLegend />

          {/* Layout Toggle */}
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/[0.08]">
            <button
              onClick={() => setLayoutMode("pitch")}
              className={`p-1 rounded transition-colors ${
                layoutMode === "pitch"
                  ? "bg-neutral-800 text-emerald-400"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
              title="Pitch View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode("list")}
              className={`p-1 rounded transition-colors ${
                layoutMode === "list"
                  ? "bg-neutral-800 text-emerald-400"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
              title="Compact List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Matchday Pitch or List View */}
      {layoutMode === "pitch" ? (
        <div className="w-full space-y-3">
          {/* Tactical Pitch Canvas */}
          <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0d121c] select-none p-3 md:p-4 shadow-lg flex flex-col justify-between min-h-[480px] sm:min-h-[520px] md:min-h-[560px]">
            {/* Subtle tactical grid lines background */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Vector Pitch Markings */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
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
                rx="2"
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
            <div className="w-full max-w-2xl mx-auto p-2.5 md:p-3 rounded-xl bg-neutral-900/40 border border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] md:text-xs font-mono text-neutral-400 px-1">
                <span>SUBSTITUTES BENCH</span>
                <span className="text-[9px] md:text-[10px] text-neutral-500">Live Dual EO & Event Telemetry</span>
              </div>
              <div className="flex justify-around items-center gap-2 md:gap-6">
                {effectiveBench.map((p, idx) => (
                  <div key={p.id} className="relative flex flex-col items-center flex-1 max-w-[80px] md:max-w-[92px]">
                    <span className="text-[9px] md:text-[10px] font-mono text-neutral-500 mb-0.5">
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
        <div className="p-3 bg-[#0B0E14] border border-white/[0.06] rounded-xl space-y-3">
          <div className="flex flex-wrap gap-2 justify-start">
            {effectiveStarters.map((player) => renderLivePlayerCard(player, false))}
            {effectiveBench.map((player) => renderLivePlayerCard(player, true))}
          </div>
        </div>
      )}
    </div>
  );
};
