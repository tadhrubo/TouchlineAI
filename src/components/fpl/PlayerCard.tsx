"use client";

import React from "react";
import { Player } from "@/types/fpl";
import { JerseyIcon } from "./JerseyIcon";
import { SampleTier, calculateXEO } from "@/utils/eo";
import { getPerformanceBadge } from "@/utils/fplBadges";

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

  const fixtureText = `${player.currentFixture.opponent} (${player.currentFixture.isHome ? "H" : "A"})`;
  const eoResult = sampleTier && sampleTier !== "NO_EO"
    ? calculateXEO(player, sampleTier, userRank)
    : null;

  const perfBadge = getPerformanceBadge(
    player.gameweekPoints ?? 0,
    player.minutesExpected ?? 90,
    player.selectedByPercent ?? 0,
    player.top10kEo ?? player.top_10k_eo,
    isCap
  );

  return (
    <div
      onClick={() => onClick?.(player)}
      className={`group relative flex flex-col items-center justify-between cursor-pointer select-none transition-transform duration-150 hover:-translate-y-0.5 active:scale-95 ${
        isBench ? "w-[76px] sm:w-[84px]" : "w-[80px] sm:w-[88px]"
      }`}
    >
      {/* Minimalist Captain / Vice Captain Badge */}
      {(isCap || isVice) && (
        <div className="absolute -top-1 -left-0.5 z-20">
          {isCap ? (
            <span className="flex items-center justify-center min-w-[16px] h-4 rounded-sm bg-neutral-100 text-neutral-950 font-black text-[9px] px-1 shadow-sm">
              C
            </span>
          ) : (
            <span className="flex items-center justify-center min-w-[16px] h-4 rounded-sm bg-neutral-800 text-neutral-300 border border-white/[0.1] font-bold text-[9px] px-1 shadow-sm">
              V
            </span>
          )}
        </div>
      )}

      {/* Bench Priority Tag or Performance Badge */}
      {isBench && benchLabel ? (
        <div className="absolute -top-1 -right-0.5 z-20">
          <span className="px-1 py-0.2 text-[9px] font-mono font-medium rounded bg-neutral-900 text-neutral-400 border border-white/[0.08]">
            {benchLabel}
          </span>
        </div>
      ) : perfBadge ? (
        <div className="absolute -top-1 -right-0.5 z-20">
          <span
            title={perfBadge.description}
            className={`px-1 py-0.2 text-[9px] font-mono rounded border shadow-sm backdrop-blur-sm ${perfBadge.colorClass}`}
          >
            {perfBadge.emoji}
          </span>
        </div>
      ) : null}

      {/* Injury / Status Alert Flag */}
      {player.status !== "available" && (
        <div className="absolute top-0 right-0 z-20">
          <span
            title={player.news || "Status alert"}
            className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 text-neutral-950 font-bold text-[9px]"
          >
            !
          </span>
        </div>
      )}

      {/* Jersey Graphic */}
      <div className="relative my-0.5 flex items-center justify-center">
        <JerseyIcon
          teamShort={player.teamShort}
          isGK={player.position === "GKP"}
          size={isBench ? 36 : 42}
          priority={!isBench}
        />
      </div>

      {/* Understated Player Information Badge */}
      <div className="w-full flex flex-col items-center mt-0.5 bg-neutral-950/85 border border-white/[0.08] rounded-md px-1 py-0.5 text-center backdrop-blur-sm">
        {/* Name */}
        <p className="text-[11px] sm:text-[11.5px] font-medium text-neutral-200 truncate leading-tight w-full">
          {player.webName}
        </p>

        {/* Fixture & Projected Points Badge */}
        <div className="flex items-center justify-center gap-1 text-[9px] sm:text-[9.5px] font-mono text-neutral-400 mt-0.5 leading-none">
          <span>{fixtureText}</span>
          {showProjected && (
            <>
              <span className="text-neutral-600">·</span>
              <span className="text-emerald-400 font-medium">
                {player.projectedPoints}
              </span>
            </>
          )}
        </div>

        {/* xEO Badge */}
        {eoResult && (
          <div className="w-full mt-0.5 pt-0.5 border-t border-white/[0.04]">
            {sampleTier === "TOP_10K_NEAR_U" && eoResult.top10k != null && eoResult.nearU != null ? (
              <div className="flex w-full items-center justify-between px-0.5 text-[8.5px] sm:text-[9.5px] font-mono leading-none tracking-tight">
                <span className="text-neutral-200" title="Top 10k EO">
                  {eoResult.top10k}%
                </span>
                <span className="text-neutral-500" title="Near You EO">
                  {eoResult.nearU}%
                </span>
              </div>
            ) : (
              <div className="w-full text-center text-[8.5px] sm:text-[9.5px] font-mono text-neutral-400 leading-none">
                {eoResult.displayText}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
