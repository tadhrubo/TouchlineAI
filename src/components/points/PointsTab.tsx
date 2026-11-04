"use client";

import React, { useState, useMemo } from "react";
import { TeamStats, Player } from "@/types/fpl";
import { BadgeLegend } from "../fpl/BadgeLegend";
import { JerseyIcon } from "../fpl/JerseyIcon";
import { PitchBranding } from "../ui/PitchBranding";
import { Grid, List } from "lucide-react";

interface PointsTabProps {
  stats: TeamStats;
  players: Player[];
  captainId: string;
  viceCaptainId: string;
  onPlayerClick?: (player: Player) => void;
}

function formatNumber(num?: number | null): string {
  if (num == null || isNaN(num) || num === 0) return "-";
  return num.toLocaleString();
}

/**
 * Editorial match event indicators with unified typographic tags & micro-shapes.
 * Zero emoji slop: clean, scannable sports terminal notation.
 */
const MatchEventIcons: React.FC<{ stats?: any }> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="flex items-center justify-center gap-1 text-[9px] font-mono leading-none flex-wrap">
      {stats.goals_scored && stats.goals_scored > 0 ? (
        <span
          title={`Goals: ${stats.goals_scored}`}
          className="font-bold text-tl-accent font-mono"
        >
          G{stats.goals_scored > 1 ? `x${stats.goals_scored}` : ""}
        </span>
      ) : null}
      {stats.assists && stats.assists > 0 ? (
        <span
          title={`Assists: ${stats.assists}`}
          className="font-semibold text-tl-text font-mono"
        >
          A{stats.assists > 1 ? `x${stats.assists}` : ""}
        </span>
      ) : null}
      {stats.bonus && stats.bonus > 0 ? (
        <span
          className="font-bold text-tl-accent font-mono"
          title={`Bonus: ${stats.bonus}`}
        >
          +{stats.bonus}
        </span>
      ) : null}
      {stats.bps && stats.bps > 0 && (!stats.bonus || stats.bonus === 0) ? (
        <span className="text-[8px] text-tl-muted font-mono" title={`BPS: ${stats.bps}`}>
          {stats.bps}bps
        </span>
      ) : null}
      {stats.clean_sheets && stats.clean_sheets > 0 ? (
        <span
          title="Clean Sheet"
          className="font-mono text-tl-muted font-medium text-[8.5px]"
        >
          CS
        </span>
      ) : null}
      {stats.penalties_saved && stats.penalties_saved > 0 ? (
        <span
          title="Penalty Saved"
          className="font-bold text-tl-accent font-mono text-[8.5px]"
        >
          PS
        </span>
      ) : null}
      {stats.penalties_missed && stats.penalties_missed > 0 ? (
        <span
          title="Penalty Missed"
          className="font-bold text-tl-negative font-mono text-[8.5px]"
        >
          PM
        </span>
      ) : null}
      {stats.own_goals && stats.own_goals > 0 ? (
        <span
          title="Own Goal"
          className="font-bold text-tl-negative font-mono text-[8.5px]"
        >
          OG
        </span>
      ) : null}
      {stats.yellow_cards && stats.yellow_cards > 0 ? (
        <span
          title="Yellow Card"
          className="inline-block w-1.5 h-2.5 rounded-[1px] bg-amber-400"
        />
      ) : null}
      {stats.red_cards && stats.red_cards > 0 ? (
        <span
          title="Red Card"
          className="inline-block w-1.5 h-2.5 rounded-[1px] bg-rose-600"
        />
      ) : null}
      {stats.saves && stats.saves >= 3 ? (
        <span
          title={`Saves: ${stats.saves}`}
          className="font-mono text-[8.5px] text-tl-muted"
        >
          S:{stats.saves}
        </span>
      ) : null}
    </div>
  );
};

const isGk = (p: any) => p.position === "GKP" || p.elementType === 1 || p.element_type === 1;
const isDef = (p: any) => p.position === "DEF" || p.elementType === 2 || p.element_type === 2;
const isMid = (p: any) => p.position === "MID" || p.elementType === 3 || p.element_type === 3;
const isFwd = (p: any) => p.position === "FWD" || p.elementType === 4 || p.element_type === 4;

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
  const safetyScore = liveData.safety_score || 42;

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
    const startGK = modStarters.find(isGk);
    const benchGK = modBench.find(isGk);
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

    // 2. Outfield Autosubs: Strict priority order B1 -> B2 -> B3
    const outfieldBench = modBench
      .filter((p) => !isGk(p))
      .sort((a, b) => (a.benchOrder ?? 99) - (b.benchOrder ?? 99));

    const failedStarters = modStarters.filter(
      (p) => !isGk(p) && p.matchFinished && (p.stats?.minutes || 0) === 0
    );

    // Track dynamic active outfield lineup across successive substitutions
    let activeLineup = [...modStarters];
    if (startGK?.isSubbedOut && benchGK?.isSubbedIn) {
      activeLineup = activeLineup.map((p) => (p.id === startGK.id ? benchGK : p));
    }

    for (const failedStarter of failedStarters) {
      // Iterate through ALL un-subbed bench outfielders in strict bench priority order (1 -> 2 -> 3)
      for (const candidate of outfieldBench) {
        if (candidate.isSubbedIn) continue;
        // Candidate must have played minutes > 0
        if ((candidate.stats?.minutes || 0) <= 0) continue;

        // Test if replacing failedStarter with candidate maintains legal 11-player formation:
        // Formation rules: GKP === 1, DEF >= 3, MID >= 2, FWD >= 1
        const candidateLineup = activeLineup.map((p) =>
          p.id === failedStarter.id ? candidate : p
        );

        const gkCount = candidateLineup.filter(isGk).length;
        const defCount = candidateLineup.filter(isDef).length;
        const midCount = candidateLineup.filter(isMid).length;
        const fwdCount = candidateLineup.filter(isFwd).length;

        if (gkCount === 1 && defCount >= 3 && midCount >= 2 && fwdCount >= 1) {
          failedStarter.isSubbedOut = true;
          candidate.isSubbedIn = true;
          activeLineup = candidateLineup;
          break; // Found first eligible candidate who preserves legal formation
        }
      }
    }

    const activePlayers = [
      ...modStarters.filter((p) => !p.isSubbedOut),
      ...modBench.filter((p) => p.isSubbedIn),
    ];
    const playedCount = activePlayers.filter(
      (p) => (p.stats?.minutes && p.stats.minutes > 0) || p.matchStarted
    ).length;

    return {
      effectiveStarters: modStarters,
      effectiveBench: modBench,
      effectivePlayedCount: playedCount,
    };
  }, [starters, bench, autosubsEnabled]);

  // Vice-Captain Multiplier Fallback calculations
  const captainPlayer = useMemo(
    () =>
      effectiveStarters?.find((p: any) => p.isCaptain || (captainId && String(p.id) === String(captainId))) ||
      effectiveBench?.find((p: any) => p.isCaptain || (captainId && String(p.id) === String(captainId))),
    [effectiveStarters, effectiveBench, captainId]
  );

  const viceCaptainPlayer = useMemo(
    () =>
      effectiveStarters?.find((p: any) => p.isViceCaptain || (viceCaptainId && String(p.id) === String(viceCaptainId))) ||
      effectiveBench?.find((p: any) => p.isViceCaptain || (viceCaptainId && String(p.id) === String(viceCaptainId))),
    [effectiveStarters, effectiveBench, viceCaptainId]
  );

  const captainPlayedZero = Boolean(
    autosubsEnabled &&
      captainPlayer &&
      captainPlayer.matchFinished &&
      (captainPlayer.stats?.minutes || 0) === 0
  );

  const captainMultiplier = captainPlayer?.multiplier || 2;

  const vcEligible = Boolean(
    viceCaptainPlayer &&
      ((viceCaptainPlayer.stats?.minutes || 0) > 0 || !viceCaptainPlayer.matchFinished)
  );

  // Dynamic Live Points calculation reflecting autosubs and VC multiplier transfer
  const livePoints = useMemo(() => {
    const activePlayers = autosubsEnabled
      ? [
          ...effectiveStarters.filter((p: any) => !p.isSubbedOut),
          ...effectiveBench.filter((p: any) => p.isSubbedIn),
        ]
      : starters;

    const hasAnyStats = activePlayers.some(
      (p: any) =>
        (p.gameweekPoints != null && p.gameweekPoints > 0) ||
        (p.stats?.total_points != null && p.stats.total_points > 0) ||
        (p.stats?.minutes != null && p.stats.minutes > 0) ||
        p.matchStarted ||
        p.matchFinished
    );

    if (!hasAnyStats && (liveData.live_points || stats.gameweekPoints)) {
      return liveData.live_points || stats.gameweekPoints || 0;
    }

    return activePlayers.reduce((sum: number, p: any) => {
      const rawPts = p.gameweekPoints ?? p.stats?.total_points ?? 0;
      const isCaptain = p.isCaptain || (captainId && String(p.id) === String(captainId));
      const isViceCaptain = p.isViceCaptain || (viceCaptainId && String(p.id) === String(viceCaptainId));

      const mult = isCaptain
        ? (captainPlayedZero ? 0 : p.multiplier || 2)
        : (isViceCaptain && captainPlayedZero && vcEligible)
          ? captainMultiplier
          : (p.multiplier && !isCaptain ? p.multiplier : 1);

      return sum + rawPts * mult;
    }, 0);
  }, [
    autosubsEnabled,
    effectiveStarters,
    effectiveBench,
    starters,
    captainId,
    viceCaptainId,
    captainPlayedZero,
    vcEligible,
    captainMultiplier,
    liveData.live_points,
    stats.gameweekPoints,
  ]);

  const safetyDiff = livePoints - safetyScore;

  let gks = effectiveStarters.filter(isGk);
  let defs = effectiveStarters.filter(isDef);
  let mids = effectiveStarters.filter(isMid);
  let fwds = effectiveStarters.filter(isFwd);

  // Structural fail-safe if position metadata is missing:
  if (effectiveStarters.length === 11 && (gks.length === 0 || defs.length === 0 || fwds.length === 0)) {
    gks = effectiveStarters.slice(0, 1);
    defs = effectiveStarters.slice(1, 5);
    mids = effectiveStarters.slice(5, 9);
    fwds = effectiveStarters.slice(9, 11);
  }

  /**
   * Editorial Unboxed Live Player Stack:
   * Replaces claustrophobic 4-border cards with clean, high-contrast, whitespace-driven typography.
   */
  const renderLivePlayerCard = (player: any, isBenchCard = false) => {
    const rawPts = player.gameweekPoints ?? player.stats?.total_points ?? 0;
    const isCaptain = player.isCaptain || (captainId && String(player.id) === String(captainId));
    const isViceCaptain = player.isViceCaptain || (viceCaptainId && String(player.id) === String(viceCaptainId));

    const mult = isCaptain
      ? (captainPlayedZero ? 0 : player.multiplier || 2)
      : (isViceCaptain && captainPlayedZero && vcEligible)
        ? captainMultiplier
        : (player.multiplier && !isCaptain ? player.multiplier : 1);
    const pts = rawPts * mult;

    const top10kEo = player.top10kEo ?? player.top_10k_eo ?? player.eo ?? 0;
    const globalOwnership = player.selectedByPercent ?? 0;

    const isGK = player.position === "GKP" || player.elementType === 1 || player.element_type === 1;

    return (
      <div
        key={player.id}
        role="button"
        tabIndex={0}
        onClick={() => onPlayerClick?.(player)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPlayerClick?.(player);
          }
        }}
        className={`group relative flex flex-col items-center justify-start cursor-pointer select-none transition-transform duration-100 hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tl-accent ${
          isBenchCard ? "w-[76px] sm:w-[84px] md:w-[90px]" : "w-[80px] sm:w-[88px] md:w-[94px]"
        } ${player.isSubbedOut ? "opacity-40 grayscale" : "opacity-100"}`}
      >
        {/* Tactical Sub In / Sub Out Micro-Tags */}
        {player.isSubbedIn && (
          <div className="absolute -top-1 -left-1 z-30">
            <span className="flex items-center justify-center px-1 h-3.5 rounded-sm bg-tl-accent text-tl-accentContrast text-[8px] font-mono font-black">
              IN
            </span>
          </div>
        )}
        {player.isSubbedOut && (
          <div className="absolute -top-1 -left-1 z-30">
            <span className="flex items-center justify-center px-1 h-3.5 rounded-sm bg-tl-negative text-tl-text text-[8px] font-mono font-bold">
              OUT
            </span>
          </div>
        )}

        {/* Captaincy / Vice Captaincy Badges */}
        {isCaptain && (
          <div className="absolute -top-1 -right-0.5 z-20">
            <span
              className={`flex items-center justify-center min-w-[15px] h-3.5 rounded-sm font-black text-[9px] font-mono px-1 ${
                captainPlayedZero
                  ? "bg-tl-surface2 text-tl-muted border border-tl-border line-through opacity-70"
                  : "bg-tl-accent text-tl-accentContrast"
              }`}
              title={captainPlayedZero ? "Captain played 0 mins (VC active)" : "Captain"}
            >
              {player.multiplier === 3 ? "3C" : "C"}
            </span>
          </div>
        )}
        {!isCaptain && isViceCaptain && (
          <div className="absolute -top-1 -right-0.5 z-20">
            <span
              className={`flex items-center justify-center min-w-[15px] h-3.5 rounded-sm font-bold text-[9px] font-mono px-1 ${
                captainPlayedZero && vcEligible
                  ? "bg-tl-accent text-tl-accentContrast font-black"
                  : "bg-tl-surface2 text-tl-text border border-tl-border"
              }`}
              title={
                captainPlayedZero && vcEligible
                  ? `Vice-Captain inherited ${captainMultiplier}x multiplier`
                  : "Vice-Captain"
              }
            >
              {captainPlayedZero && vcEligible ? (captainMultiplier === 3 ? "3V" : "V") : "V"}
            </span>
          </div>
        )}

        {/* Shirt Container */}
        <div className="relative my-0.5 flex items-center justify-center">
          <JerseyIcon
            teamShort={player.teamShort}
            teamCode={player.teamCode ?? player.team_code}
            kitUrl={player.kitUrl}
            isGK={isGK}
            size={isBenchCard ? 36 : 42}
            priority={!isBenchCard}
          />
        </div>

        {/* Editorial Unboxed Player Typography */}
        <div className="w-full flex flex-col items-center text-center mt-1">
          {/* Player Name */}
          <p className="text-[11px] sm:text-[12px] font-bold text-tl-text truncate leading-tight w-full tracking-tight">
            {player.webName}
          </p>

          {/* Points Display */}
          <div className="flex items-center justify-center gap-1 font-mono leading-tight tabular-nums mt-0.5">
            <span
              className={`text-xs sm:text-[13px] font-black tabular-nums ${
                player.isSubbedOut
                  ? "text-tl-muted line-through opacity-50"
                  : pts > 0
                  ? "text-tl-accent"
                  : "text-tl-muted"
              }`}
            >
              {pts} <span className="text-[9px] font-normal text-tl-muted">pts</span>
            </span>
          </div>

          {/* Dual EO Telemetry */}
          <div className="text-[8.5px] font-mono text-tl-muted opacity-80 leading-none tabular-nums mt-0.5">
            <span>{top10kEo}%</span>
            <span className="mx-0.5 opacity-40">·</span>
            <span>{globalOwnership}%</span>
          </div>

          {/* Clean Event Micro-Tags */}
          <div className="min-h-[14px] flex items-center justify-center mt-0.5">
            <MatchEventIcons stats={player.stats} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-3.5 animate-fade-in select-none text-tl-text">
      {/* 1. Flat Editorial Live Rank Dashboard Header (Stark 3-Tier Hierarchy) */}
      <div className="grid grid-cols-3 gap-2 py-2 border-b border-tl-border text-center">
        {/* Tier 2 Secondary: GW Rank */}
        <div className="flex flex-col justify-center border-r border-tl-border pr-1">
          <span className="text-[10px] text-tl-muted font-semibold uppercase tracking-wider opacity-80">
            GW Rank
          </span>
          <span className="text-xl sm:text-2xl md:text-3xl font-black font-mono tabular-nums text-tl-text mt-0.5">
            {formatNumber(liveData.gw_rank)}
          </span>
        </div>

        {/* Tier 1 Primary: Live Rank & Delta */}
        <div className="flex flex-col justify-center border-r border-tl-border px-1">
          <span className="text-[10px] text-tl-muted font-semibold uppercase tracking-wider opacity-80">
            Live Rank
          </span>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="text-2xl sm:text-3xl md:text-4xl font-black font-mono tabular-nums text-tl-text">
              #{formatNumber(liveData.live_rank)}
            </span>
            {rankDelta > 0 ? (
              <span className="text-tl-accent font-mono font-bold text-xs">▲</span>
            ) : rankDelta < 0 ? (
              <span className="text-tl-negative font-mono font-bold text-xs">▼</span>
            ) : (
              <span className="text-tl-muted text-xs">━</span>
            )}
          </div>
          <span className="text-[10px] font-mono tabular-nums text-tl-muted opacity-80 truncate mt-0.5">
            Old: #{formatNumber(liveData.old_rank)} ({rankPercentChange >= 0 ? `+${rankPercentChange}` : rankPercentChange}%)
          </span>
        </div>

        {/* Tier 1 Dominant: Live Points */}
        <div className="flex flex-col justify-center pl-1">
          <span className="text-[10px] text-tl-muted font-semibold uppercase tracking-wider opacity-80">
            Live Points
          </span>
          <span className="text-3xl sm:text-4xl md:text-5xl font-black font-mono tabular-nums text-tl-accent mt-0.5">
            {livePoints} <span className="text-xs font-semibold text-tl-accent">pts</span>
          </span>
          <span className="text-[10px] font-mono tabular-nums text-tl-muted opacity-80 truncate mt-0.5">
            Safety: {safetyScore} <span className={safetyDiff >= 0 ? "text-tl-accent" : "text-tl-negative"}>Δ:{safetyDiff >= 0 ? `+${safetyDiff}` : safetyDiff}</span>
          </span>
        </div>
      </div>

      {/* 2. Controls Bar: Neutral Autosubs & Layout Mode */}
      <div className="flex items-center justify-between py-1 border-b border-tl-border text-xs font-mono">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutosubsEnabled(!autosubsEnabled)}
            className={`px-2 py-0.5 rounded-sm text-xs font-mono transition border ${
              autosubsEnabled
                ? "bg-tl-surface2 text-tl-text border-tl-border font-bold"
                : "bg-transparent text-tl-muted border-tl-border hover:text-tl-text"
            }`}
          >
            Autosubs {autosubsEnabled ? "ON" : "OFF"}
          </button>

          <span className="text-tl-muted text-xs font-mono">
            Played: <strong className="text-tl-accent font-semibold tabular-nums">{effectivePlayedCount}/11</strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <BadgeLegend />

          {/* Layout Toggle */}
          <div className="flex bg-tl-surface rounded-sm p-0.5 border border-tl-border">
            <button
              onClick={() => setLayoutMode("pitch")}
              aria-label="Pitch view"
              className={`p-1 rounded-sm transition ${
                layoutMode === "pitch"
                  ? "bg-tl-surface2 text-tl-text"
                  : "text-tl-muted hover:text-tl-text"
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
                  ? "bg-tl-surface2 text-tl-text"
                  : "text-tl-muted hover:text-tl-text"
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
          <div className="relative w-full max-w-2xl mx-auto rounded-sm overflow-hidden border border-tl-border bg-[var(--pitch-bg)] select-none p-3 flex flex-col justify-between min-h-[480px] sm:min-h-[520px] md:min-h-[570px] transition-colors">
            {/* Subtle tactical grid lines background */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Vector Pitch Markings */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="12"
                y="12"
                width="calc(100% - 24px)"
                height="calc(100% - 24px)"
                fill="none"
                stroke="var(--pitch-line)"
                strokeWidth="1"
              />
              <line
                x1="12"
                y1="50%"
                x2="calc(100% - 12px)"
                y2="50%"
                stroke="var(--pitch-line)"
                strokeWidth="1"
              />
              <circle
                cx="50%"
                cy="50%"
                r="44"
                fill="none"
                stroke="var(--pitch-line)"
                strokeWidth="1"
              />
            </svg>

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
            <div className="w-full max-w-2xl mx-auto p-2.5 md:p-3 rounded-sm bg-tl-surface border border-tl-border space-y-1.5">
              <div className="flex items-center justify-between text-[10px] md:text-xs font-mono text-tl-muted px-1">
                <span className="uppercase tracking-wider font-semibold">Substitutes Bench</span>
                <span className="text-[10px] opacity-70">Dual EO & Telemetry</span>
              </div>
              <div className="flex justify-around items-center gap-2 md:gap-6">
                {effectiveBench.map((p, idx) => (
                  <div key={p.id} className="relative flex flex-col items-center flex-1 max-w-[80px] md:max-w-[92px]">
                    <span className="text-[9px] font-mono text-tl-muted mb-0.5">
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
        <div className="p-3 bg-tl-surface border border-tl-border rounded-sm space-y-3">
          <div className="flex flex-wrap gap-3 justify-start">
            {effectiveStarters.map((player) => renderLivePlayerCard(player, false))}
            {effectiveBench.map((player) => renderLivePlayerCard(player, true))}
          </div>
        </div>
      )}
    </div>
  );
};
