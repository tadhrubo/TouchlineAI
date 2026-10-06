"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { getPerformanceBadge } from "@/utils/fplBadges";
import { PitchBranding } from "../ui/PitchBranding";
import { calculateNetTransfers } from "@/utils/fplTransfers";

export interface LeagueTransfer {
  in: string;
  out: string;
  elementIn?: number;
  elementOut?: number;
  time?: string;
}

export interface LeaguePlayer {
  id: number;
  pickPosition: number;
  webName: string;
  fullName: string;
  team: string;
  teamShort: string;
  position: string;
  elementType: number;
  multiplier: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isBench: boolean;
  benchOrder: number | null;
  livePoints: number;
  rawPoints: number;
  minutes: number;
  goals: number;
  assists: number;
  bonus: number;
  cleanSheet: number;
  kitUrl: string;
  played: boolean;
  selectedByPercent?: number;
  top10kEo?: number;
  top_10k_eo?: number;
  leagueOwnershipPercent?: number;
  league_ownership_percent?: number;
  matchFinished?: boolean;
  matchStarted?: boolean;
  yetToPlay?: boolean;
  isSubbedIn?: boolean;
  isSubbedOut?: boolean;
}

interface LeaguePitchViewProps {
  managerName?: string;
  teamName?: string;
  transfers: number;
  transfersCost?: number;
  teamValue: number;
  bank: number;
  playedCount: number;
  maxPlayedCount: number;
  activeChip: string | null;
  ftLeft?: number;
  activeTransfers?: LeagueTransfer[];
  starters: LeaguePlayer[];
  bench: LeaguePlayer[];
  layoutMode?: "list" | "pitch";
  autosubsEnabled?: boolean;
}

const PlayerCompactCard: React.FC<{
  player: LeaguePlayer;
  isBench: boolean;
}> = ({ player, isBench }) => {
  const isGK = player.elementType === 1 || player.position === "GKP";
  const fallbackUrl = isGK
    ? "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0_1-66.webp"
    : "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0-66.webp";

  const pts = player.livePoints ?? player.rawPoints ?? 0;
  const hasPlayed = (player.played && player.minutes > 0) || player.minutes > 0;
  const isFinished = Boolean(player.matchFinished || (hasPlayed && !player.yetToPlay));
  const isYetToPlay = Boolean(player.yetToPlay || (!hasPlayed && !player.matchFinished));
  const isBlanked = (isFinished && pts <= 0) || (hasPlayed && pts <= 0);
  const isBenchDimmed = isBench && !player.isSubbedIn;

  // Use local mini-league ownership percent as primary EO for contextual mini-league performance badges
  const localEo = player.league_ownership_percent ?? player.leagueOwnershipPercent;
  const badge = getPerformanceBadge(
    pts,
    player.minutes ?? 0,
    player.selectedByPercent ?? 0,
    localEo ?? player.top10kEo,
    player.isSubbedIn,
    player.isSubbedOut
  );

  const leagueOwnership = Math.round(
    player.league_ownership_percent ?? player.leagueOwnershipPercent ?? 0
  );

  return (
    <div
      className={`flex flex-col w-[18%] min-w-[55px] max-w-[65px] md:min-w-[70px] md:max-w-[80px] items-center transition-all ${
        player.isSubbedOut
          ? "opacity-40"
          : isBenchDimmed
          ? "opacity-50 mix-blend-luminosity hover:opacity-100"
          : "opacity-100"
      }`}
    >
      {/* Shirt & Badges */}
      <div className="relative mb-1 flex items-center justify-center">
        {/* Performance Badge (Template, Spy, Differential Hero, etc.) */}
        {badge && (
          <div className="absolute -top-2 -left-3 z-10 bg-tl-surface rounded-full text-[11px] md:text-xs shadow-sm leading-none border border-tl-border p-[3px]">
            {badge}
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={player.kitUrl || fallbackUrl}
          alt={player.webName}
          className="h-8 md:h-9 object-contain drop-shadow"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = fallbackUrl;
          }}
        />

        {/* Sub In / Sub Out Indicators */}
        {player.isSubbedIn && (
          <span className="absolute -top-1.5 -left-1.5 z-20 bg-emerald-500 text-black text-[8px] md:text-[9px] font-extrabold px-1 rounded shadow border border-emerald-400 leading-tight">
            ▲ IN
          </span>
        )}
        {player.isSubbedOut && (
          <span className="absolute -top-1.5 -left-1.5 z-20 bg-rose-600 text-white text-[8px] md:text-[9px] font-extrabold px-1 rounded shadow border border-rose-500 leading-tight">
            ▼ OUT
          </span>
        )}

        {/* Captaincy / Vice Captaincy Badges */}
        {player.isCaptain && (
          <span className="absolute -bottom-1 -right-2 bg-amber-400 text-black text-[9px] md:text-[10px] font-bold px-1 rounded-full border border-amber-300 shadow">
            {player.multiplier === 3 ? "3C" : "C"}
          </span>
        )}
        {!player.isCaptain && player.isViceCaptain && (
          <span className="absolute -bottom-1 -right-2 bg-neutral-200 text-black text-[9px] md:text-[10px] font-bold px-1 rounded-full border border-neutral-400 shadow">
            V
          </span>
        )}
      </div>

      {/* Name Bar */}
      <div className="w-full bg-tl-surface text-tl-text text-[9px] md:text-[11px] font-bold truncate text-center px-0.5 py-0.5 border border-tl-border rounded-t-sm">
        {player.webName}
      </div>

      {/* Points Bar */}
      <div
        className={`w-full text-center text-[10px] md:text-xs font-mono font-bold py-0.5 border-x ${
          player.isSubbedOut
            ? "bg-tl-bg text-tl-muted border-tl-border line-through"
            : player.isSubbedIn || pts > 0
            ? "bg-tl-accent text-tl-accentContrast border-tl-accent"
            : isYetToPlay
            ? "bg-tl-surface2 text-tl-muted border-tl-border"
            : isBlanked
            ? "bg-tl-surface2 text-tl-text border-tl-border"
            : "bg-tl-surface2 text-tl-muted border-tl-border"
        }`}
      >
        {pts}
      </div>

      {/* Mini-League Local Ownership % */}
      <div className="w-full text-center text-[9px] md:text-[10px] font-mono text-tl-muted bg-tl-bg rounded-b-sm pb-0.5 border-x border-b border-tl-border">
        {leagueOwnership}%
      </div>
    </div>
  );
};

export const LeaguePitchView: React.FC<LeaguePitchViewProps> = ({
  managerName,
  teamName,
  transfers,
  transfersCost = 0,
  teamValue,
  bank,
  playedCount,
  maxPlayedCount,
  activeChip,
  ftLeft = 1,
  activeTransfers = [],
  starters,
  bench,
  layoutMode = "list",
  autosubsEnabled = true,
}) => {
  // Filter out any intermediate wildcard tinkering to only display true net transfers
  const netTransfers = useMemo(() => calculateNetTransfers(activeTransfers), [activeTransfers]);

  // Autosub Simulation Logic: ONLY substitute starters out if their match is finished with 0 minutes
  const { effectiveStarters, effectiveBench, effectiveLivePts, effectivePlayedCount } =
    useMemo(() => {
      if (!autosubsEnabled || activeChip === "BB") {
        const totalPts = starters.reduce((acc, p) => acc + (p.livePoints || p.rawPoints || 0), 0);
        return {
          effectiveStarters: starters,
          effectiveBench: bench,
          effectiveLivePts: totalPts,
          effectivePlayedCount: playedCount,
        };
      }

      const modStarters = starters.map((p) => ({ ...p, isSubbedIn: false, isSubbedOut: false }));
      const modBench = bench.map((p) => ({ ...p, isSubbedIn: false, isSubbedOut: false }));

      // 1. Goalkeeper check: ONLY sub out if starter's match is finished AND starter played 0 minutes
      const startingGK = modStarters.find((p) => p.elementType === 1 || p.position === "GKP");
      const benchGK = modBench.find((p) => p.elementType === 1 || p.position === "GKP");

      if (
        startingGK &&
        benchGK &&
        startingGK.matchFinished &&
        startingGK.minutes === 0 &&
        (benchGK.minutes > 0 || benchGK.played || benchGK.matchFinished)
      ) {
        startingGK.isSubbedOut = true;
        benchGK.isSubbedIn = true;
      }

      // 2. Outfield players check: ONLY sub out starters whose match has completely finished with 0 minutes
      const finishedZeroMinsStarters = modStarters.filter(
        (p) =>
          p.elementType !== 1 &&
          p.position !== "GKP" &&
          p.matchFinished &&
          p.minutes === 0
      );

      for (const starter of finishedZeroMinsStarters) {
        // Find first eligible outfield bench player in bench order
        const availableBenchSub = modBench.find(
          (b) =>
            b.elementType !== 1 &&
            b.position !== "GKP" &&
            !b.isSubbedIn &&
            (b.minutes > 0 || b.played || !b.matchFinished)
        );

        if (availableBenchSub) {
          // Check formation constraints before subbing
          // Minimum starting: 3 DEF, 2 MID, 1 FWD
          const defCount = modStarters.filter(
            (p) => (p.elementType === 2 || p.position === "DEF") && !p.isSubbedOut
          ).length;

          const isStarterDef = starter.elementType === 2 || starter.position === "DEF";
          const isSubDef = availableBenchSub.elementType === 2 || availableBenchSub.position === "DEF";

          if (isStarterDef && defCount <= 3 && !isSubDef) {
            // Find a defender on bench instead
            const benchDef = modBench.find(
              (b) =>
                (b.elementType === 2 || b.position === "DEF") &&
                !b.isSubbedIn &&
                (b.minutes > 0 || b.played || !b.matchFinished)
            );
            if (benchDef) {
              starter.isSubbedOut = true;
              benchDef.isSubbedIn = true;
            }
            continue;
          }

          starter.isSubbedOut = true;
          availableBenchSub.isSubbedIn = true;
        }
      }

      // Compute total live points from active XI
      let livePtsSum = 0;
      let playedCountSum = 0;

      for (const p of modStarters) {
        if (!p.isSubbedOut) {
          livePtsSum += p.livePoints || p.rawPoints || 0;
          if (p.minutes > 0 || p.played) playedCountSum++;
        }
      }
      for (const b of modBench) {
        if (b.isSubbedIn) {
          livePtsSum += b.livePoints || b.rawPoints || 0;
          if (b.minutes > 0 || b.played) playedCountSum++;
        }
      }

      return {
        effectiveStarters: modStarters,
        effectiveBench: modBench,
        effectiveLivePts: livePtsSum,
        effectivePlayedCount: playedCountSum,
      };
    }, [starters, bench, autosubsEnabled, activeChip, playedCount]);

  // LiveFPL Compact List View (Default)
  if (layoutMode === "list") {
    return (
      <div className="p-3 bg-tl-surface border-t border-tl-border rounded-none space-y-2.5">
        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs font-mono text-tl-muted pb-2 border-b border-tl-border">
          <div className="flex items-center gap-2">
            <span>
              FT Left: <strong className="text-tl-text font-bold tabular-nums">{ftLeft}</strong>
            </span>
            <span className="text-tl-border select-none">|</span>
            <span>
              TV: <strong className="text-tl-text tabular-nums">£{teamValue.toFixed(1)}m</strong>
            </span>
            <span className="text-tl-border select-none">|</span>
            <span>
              Bank: <strong className="text-tl-text tabular-nums">£{bank.toFixed(1)}m</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {activeChip && (
              <span className="bg-tl-surface2 border border-tl-border text-tl-text px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-semibold">
                {activeChip}
              </span>
            )}
            <span className="text-tl-muted font-mono">
              Played: <strong className="text-tl-accent font-semibold tabular-nums">{effectivePlayedCount}/{maxPlayedCount}</strong>
            </span>
          </div>
        </div>

        {/* LiveFPL GW Active Transfers Bar (Net Transfers Only) */}
        {netTransfers && netTransfers.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center text-[10px] px-2.5 py-1.5 bg-tl-surface2 rounded-sm border border-tl-border shadow-sm">
            <span className="text-tl-muted font-mono text-[9px] uppercase tracking-wider font-semibold">
              Transfers ({netTransfers.length}):
            </span>
            {netTransfers.map((t, idx) => (
              <div key={idx} className="flex items-center gap-1 font-mono">
                <span className="text-rose-500 line-through decoration-rose-900/60 font-medium">{t.out}</span>
                <span className="text-tl-muted">→</span>
                <span className="text-tl-accent font-semibold">{t.in}</span>
                {idx < netTransfers.length - 1 && <span className="text-tl-border ml-1">·</span>}
              </div>
            ))}
            {transfersCost > 0 && (
              <span className="text-rose-500 font-bold ml-1 font-mono text-[10px]">
                (-{transfersCost})
              </span>
            )}
          </div>
        )}

        {/* Compact Players Flex Layout - Starters and Bench Flow Consecutively */}
        <div className="flex flex-wrap gap-1.5 justify-start">
          {effectiveStarters.map((player) => (
            <PlayerCompactCard
              key={`${player.id}-${player.pickPosition}`}
              player={player}
              isBench={false}
            />
          ))}
          {effectiveBench.map((player) => (
            <PlayerCompactCard
              key={`${player.id}-${player.pickPosition}`}
              player={player}
              isBench={true}
            />
          ))}
        </div>
      </div>
    );
  }

  // Pitch View
  const gks = effectiveStarters.filter((p) => p.elementType === 1 || p.position === "GKP");
  const defs = effectiveStarters.filter((p) => p.elementType === 2 || p.position === "DEF");
  const mids = effectiveStarters.filter((p) => p.elementType === 3 || p.position === "MID");
  const fwds = effectiveStarters.filter((p) => p.elementType === 4 || p.position === "FWD");

  const renderPlayer = (player: LeaguePlayer, isBench = false) => {
    const isGK = player.elementType === 1 || player.position === "GKP";
    const fallbackUrl = isGK
      ? "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0_1-66.webp"
      : "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0-66.webp";

    const pts = player.livePoints ?? player.rawPoints ?? 0;
    const hasPlayed = (player.played && player.minutes > 0) || player.minutes > 0;
    const isFinished = Boolean(player.matchFinished || (hasPlayed && !player.yetToPlay));
    const isYetToPlay = Boolean(player.yetToPlay || (!hasPlayed && !player.matchFinished));
    const isBlanked = (isFinished && pts <= 0) || (hasPlayed && pts <= 0);

    const localEo = player.league_ownership_percent ?? player.leagueOwnershipPercent;
    const badge = getPerformanceBadge(
      pts,
      player.minutes ?? 0,
      player.selectedByPercent ?? 0,
      localEo ?? player.top10kEo,
      player.isSubbedIn,
      player.isSubbedOut
    );

    const leagueOwnership = Math.round(
      player.league_ownership_percent ?? player.leagueOwnershipPercent ?? 0
    );

    return (
      <div
        key={`${player.id}-${player.pickPosition}`}
        className="flex flex-col items-center justify-center relative flex-1 min-w-0 max-w-[76px] transition-transform duration-150 hover:scale-105"
      >
        {/* Sub In / Sub Out Indicators */}
        {player.isSubbedIn && (
          <span className="absolute -top-1.5 -left-1.5 z-30 bg-emerald-500 text-black text-[8px] font-extrabold px-1 rounded shadow border border-emerald-400 leading-tight">
            ▲ IN
          </span>
        )}
        {player.isSubbedOut && (
          <span className="absolute -top-1.5 -left-1.5 z-30 bg-rose-600 text-white text-[8px] font-extrabold px-1 rounded shadow border border-rose-500 leading-tight">
            ▼ OUT
          </span>
        )}

        {/* Captaincy / Vice Captaincy / Chip Badge */}
        {player.isCaptain && (
          <div className="absolute -top-1 -right-0.5 z-20 flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-black font-extrabold text-[9px] shadow-md border border-amber-200">
            {player.multiplier === 3 ? "3C" : "C"}
          </div>
        )}
        {!player.isCaptain && player.isViceCaptain && (
          <div className="absolute -top-1 -right-0.5 z-20 flex items-center justify-center w-4 h-4 rounded-full bg-neutral-300 text-black font-extrabold text-[9px] shadow-md border border-neutral-100">
            V
          </div>
        )}

        {/* Kit Shirt Graphics with Fallback Handling */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          {/* Performance Badge on Top-Left */}
          {badge && (
            <div className="absolute -top-2 -left-3 z-20 bg-tl-surface rounded-full text-[11px] shadow-sm leading-none border border-tl-border p-[3px]">
              {badge}
            </div>
          )}
          <Image
            src={player.kitUrl || fallbackUrl}
            alt={player.webName}
            width={40}
            height={40}
            className={`w-9 h-9 object-contain drop-shadow-md ${
              player.isSubbedOut ? "opacity-40" : ""
            }`}
            unoptimized
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target && target.src !== fallbackUrl) {
                target.src = fallbackUrl;
              }
            }}
          />
          {/* Minutes played indicator dot */}
          {player.played && (
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-tl-accent border border-black shadow" />
          )}
        </div>

        {/* Player Name Tag */}
        <div className="w-full mt-0.5 px-0.5 py-0.5 rounded bg-tl-surface/90 border border-tl-border backdrop-blur-sm text-center shadow">
          <p className="text-[10px] font-semibold text-tl-text truncate leading-tight">
            {player.webName}
          </p>
        </div>

        {/* Live Points & Ownership Badge */}
        <div className="w-full mt-0.5 px-1 py-0.2 rounded bg-tl-surface2/90 border border-tl-border text-center flex flex-col items-center justify-center">
          <span
            className={`text-[10px] font-mono font-bold leading-tight ${
              player.isSubbedOut
                ? "text-tl-muted line-through"
                : player.isSubbedIn || pts > 0
                ? "text-tl-accent font-bold"
                : isYetToPlay
                ? "text-tl-muted"
                : isBlanked
                ? "text-tl-text font-semibold"
                : "text-tl-muted"
            }`}
          >
            {pts} pts
          </span>
          <span className="text-[8px] font-mono text-tl-muted leading-none">
            {leagueOwnership}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full p-2.5 rounded-sm bg-tl-surface border border-tl-border space-y-2 text-tl-text">
      {/* Quick Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-sm bg-tl-bg border border-tl-border text-xs font-mono text-tl-muted">
        <div className="flex items-center gap-2">
          <span>
            FT: <strong className="text-tl-text font-bold tabular-nums">{ftLeft}</strong>
          </span>
          <span className="text-tl-border select-none">|</span>
          <span>
            TV: <strong className="text-tl-text tabular-nums">£{teamValue.toFixed(1)}m</strong>
          </span>
          <span className="text-tl-border select-none">|</span>
          <span>
            BANK: <strong className="text-tl-text tabular-nums">£{bank.toFixed(1)}m</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeChip && (
            <span className="bg-tl-surface2 border border-tl-border text-tl-text px-1.5 py-0.5 rounded-sm text-[10px] font-mono tracking-wider font-semibold">
              {activeChip}
            </span>
          )}
          <span className="text-tl-muted font-mono">
            PLAYED: <strong className="text-tl-accent font-semibold tabular-nums">{effectivePlayedCount}/{maxPlayedCount}</strong>
          </span>
        </div>
      </div>

      {/* LiveFPL GW Active Transfers Bar (Net Transfers Only) */}
      {netTransfers && netTransfers.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center text-[10px] px-2.5 py-1.5 bg-tl-bg rounded-sm border border-tl-border">
          <span className="text-tl-muted font-mono text-[9px] uppercase tracking-wider font-semibold">
            TRANSFERS ({netTransfers.length}):
          </span>
          {netTransfers.map((t, idx) => (
            <div key={idx} className="flex items-center gap-1 font-mono">
              <span className="text-rose-500 line-through font-medium">{t.out}</span>
              <span className="text-tl-muted">→</span>
              <span className="text-tl-accent font-semibold">{t.in}</span>
              {idx < netTransfers.length - 1 && <span className="text-tl-border ml-1">·</span>}
            </div>
          ))}
          {transfersCost > 0 && (
            <span className="text-rose-500 font-bold ml-1 font-mono text-[10px]">
              (-{transfersCost})
            </span>
          )}
        </div>
      )}

      {/* Mini Pitch Area */}
      <div className="relative w-full rounded-sm overflow-hidden border border-tl-border bg-[var(--pitch-bg)] p-3 flex flex-col justify-between min-h-[340px] select-none">
        {/* Subtle tactical grid lines background */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
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
            rx="1"
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
            r="36"
            fill="none"
            stroke="var(--pitch-line)"
            strokeWidth="1"
          />
        </svg>

        {/* Top Symmetrical Pitchside Branding */}
        <PitchBranding />

        {/* Goalkeeper Line */}
        <div className="relative z-10 flex justify-center items-center py-1">
          {gks.map((p) => renderPlayer(p))}
        </div>

        {/* Defenders Line */}
        <div className="relative z-10 flex justify-around items-center py-1 gap-1">
          {defs.map((p) => renderPlayer(p))}
        </div>

        {/* Midfielders Line */}
        <div className="relative z-10 flex justify-around items-center py-1 gap-1">
          {mids.map((p) => renderPlayer(p))}
        </div>

        {/* Forwards Line */}
        <div className="relative z-10 flex justify-around items-center py-1 gap-1">
          {fwds.map((p) => renderPlayer(p))}
        </div>
      </div>

      {/* Bench Row */}
      {effectiveBench.length > 0 && (
        <div className="w-full p-2 rounded-sm bg-tl-surface border border-tl-border space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-tl-muted px-1">
            <span>BENCH</span>
            {activeChip === "BB" && (
              <span className="bg-tl-surface2 border border-tl-border text-tl-text px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-semibold">
                BENCH BOOST ACTIVE
              </span>
            )}
          </div>
          <div className="flex justify-around items-center gap-1">
            {effectiveBench.map((p, idx) => (
              <div key={`${p.id}-${p.pickPosition}`} className="relative flex flex-col items-center">
                <span className="text-[9px] font-mono text-tl-muted mb-0.5">
                  {idx === 0 ? "GK" : `B${idx}`}
                </span>
                {renderPlayer(p, true)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
