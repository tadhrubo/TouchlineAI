"use client";

import React from "react";
import { Player } from "@/types/fpl";
import { JerseyIcon } from "./JerseyIcon";
import { SampleTier, calculateXEO } from "@/utils/eo";

interface PlayerCardProps {
  player: Player;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  onClick?: (player: Player) => void;
  showProjected?: boolean;
  isBench?: boolean;
  benchLabel?: string;
  sampleTier?: SampleTier;
  userRank?: number;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCaptain = false,
  isViceCaptain = false,
  onClick,
  showProjected = true,
  isBench = false,
  benchLabel,
  sampleTier,
  userRank,
}) => {
  const isCap = isCaptain || player.isCaptain;
  const isVice = isViceCaptain || player.isViceCaptain;

  const eoResult = sampleTier && sampleTier !== "NO_EO"
    ? calculateXEO(player, sampleTier, userRank)
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${player.webName}, £${player.price.toFixed(1)}m, ${player.projectedPoints} xP`}
      onClick={() => onClick?.(player)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(player);
        }
      }}
      className={`group relative flex flex-col items-center justify-start cursor-pointer select-none transition-transform duration-100 hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tl-accent ${
        isBench ? "w-[76px] sm:w-[84px] md:w-[90px]" : "w-[80px] sm:w-[88px] md:w-[96px]"
      }`}
    >
      {/* Restrained Captain / Vice Captain Indicator */}
      {(isCap || isVice) && (
        <div className="absolute -top-1 -left-0.5 z-20">
          {isCap ? (
            <span className="flex items-center justify-center min-w-[15px] h-3.5 rounded-sm bg-tl-accent text-tl-accentContrast font-black text-[9px] font-mono px-1">
              C
            </span>
          ) : (
            <span className="flex items-center justify-center min-w-[15px] h-3.5 rounded-sm bg-tl-surface2 text-tl-text border border-tl-border font-bold text-[9px] font-mono px-1">
              V
            </span>
          )}
        </div>
      )}

      {/* Bench Priority Tag */}
      {isBench && benchLabel && (
        <div className="absolute -top-1 -right-0.5 z-20">
          <span className="px-1 py-0.2 text-[9px] font-mono font-medium rounded-sm bg-tl-surface text-tl-muted border border-tl-border">
            {benchLabel}
          </span>
        </div>
      )}

      {/* Status Warning Tag if flagged */}
      {player.status !== "available" && (
        <div className="absolute top-0 right-0 z-20">
          <span
            title={player.news || "Status alert"}
            className="flex items-center justify-center w-3 h-3 rounded-sm bg-tl-warning text-black font-bold font-mono text-[8px]"
          >
            !
          </span>
        </div>
      )}

      {/* [shirt icon] */}
      <div className="relative my-0.5 flex items-center justify-center">
        <JerseyIcon
          teamShort={player.teamShort}
          isGK={player.position === "GKP"}
          size={isBench ? 36 : 42}
          priority={!isBench}
        />
      </div>

      {/* Looser, editorial stack per player (NO bordered rectangle / mini-card) */}
      <div className="w-full flex flex-col items-center text-center mt-1">
        {/* Player Name */}
        <p className="text-[11px] sm:text-[12px] font-bold text-tl-text truncate leading-tight w-full tracking-tight">
          {player.webName}
        </p>

        {/* £6.2m · 2.3 xP */}
        <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-tl-muted leading-tight tabular-nums mt-0.5">
          <span>£{player.price.toFixed(1)}m</span>
          <span className="opacity-40">·</span>
          <span className="text-tl-accent font-semibold">
            {showProjected ? `${player.projectedPoints} xP` : `${player.totalPoints} pts`}
          </span>
        </div>

        {/* Subtle EO metric sub-line if active */}
        {eoResult && (
          <div className="text-[8.5px] font-mono text-tl-muted opacity-80 leading-none tabular-nums mt-0.5">
            {sampleTier === "TOP_10K_NEAR_U" && eoResult.top10k != null && eoResult.nearU != null ? (
              <span>{eoResult.top10k}% · {eoResult.nearU}%</span>
            ) : (
              <span>{eoResult.displayText}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
