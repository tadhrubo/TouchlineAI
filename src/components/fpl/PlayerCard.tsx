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

  const fixtureText = `${player.currentFixture.opponent} (${player.currentFixture.isHome ? "H" : "A"})`;
  const eoResult = sampleTier && sampleTier !== "NO_EO"
    ? calculateXEO(player, sampleTier, userRank)
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${player.webName}, ${player.position}, £${player.price.toFixed(1)}m`}
      onClick={() => onClick?.(player)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(player);
        }
      }}
      className={`group relative flex flex-col items-center justify-between cursor-pointer select-none transition-transform duration-100 hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#16C784] rounded-sm ${
        isBench ? "w-[76px] sm:w-[84px] md:w-[90px]" : "w-[80px] sm:w-[88px] md:w-[96px]"
      }`}
    >
      {/* Restrained Captain / Vice Captain Indicator */}
      {(isCap || isVice) && (
        <div className="absolute -top-1 -left-0.5 z-20">
          {isCap ? (
            <span className="flex items-center justify-center min-w-[15px] h-3.5 rounded-sm bg-[#16C784] text-[#070908] font-black text-[9px] font-mono px-1">
              C
            </span>
          ) : (
            <span className="flex items-center justify-center min-w-[15px] h-3.5 rounded-sm bg-[#111614] text-[#F1F3EF] border border-[#1E2421] font-bold text-[9px] font-mono px-1">
              V
            </span>
          )}
        </div>
      )}

      {/* Bench Priority Tag */}
      {isBench && benchLabel && (
        <div className="absolute -top-1 -right-0.5 z-20">
          <span className="px-1 py-0.2 text-[9px] font-mono font-medium rounded-sm bg-[#0D1110] text-[#7F8983] border border-[#1E2421]">
            {benchLabel}
          </span>
        </div>
      )}

      {/* Status Warning Tag if flagged */}
      {player.status !== "available" && (
        <div className="absolute top-0 right-0 z-20">
          <span
            title={player.news || "Status alert"}
            className="flex items-center justify-center w-3 h-3 rounded-sm bg-[#D6A83D] text-[#070908] font-bold font-mono text-[8px]"
          >
            !
          </span>
        </div>
      )}

      {/* Jersey Graphic (Clean sports representation) */}
      <div className="relative my-0.5 flex items-center justify-center">
        <JerseyIcon
          teamShort={player.teamShort}
          isGK={player.position === "GKP"}
          size={isBench ? 36 : 42}
          priority={!isBench}
        />
      </div>

      {/* Understated Player Information Badge */}
      <div className="w-full flex flex-col items-center mt-0.5 bg-[#0D1110] border border-[#1E2421] rounded-sm px-1 py-0.5 text-center">
        {/* Line 1: Player Name */}
        <p className="text-[11px] sm:text-[11.5px] font-semibold text-[#F1F3EF] truncate leading-tight w-full">
          {player.webName}
        </p>

        {/* Line 2: Position / Fixture & Points */}
        <div className="flex items-center justify-center gap-1 text-[9.5px] font-mono text-[#7F8983] mt-0.5 leading-none">
          <span className="text-[#7F8983]">{player.position}</span>
          <span className="text-[#1E2421]">·</span>
          <span>{fixtureText}</span>
          {showProjected && (
            <>
              <span className="text-[#1E2421]">·</span>
              <span className="text-[#16C784] font-semibold tabular-nums">
                {player.projectedPoints}
              </span>
            </>
          )}
        </div>

        {/* Line 3: Progressive EO data row if enabled */}
        {eoResult && (
          <div className="w-full mt-0.5 pt-0.5 border-t border-[#1E2421]/60">
            {sampleTier === "TOP_10K_NEAR_U" && eoResult.top10k != null && eoResult.nearU != null ? (
              <div className="flex w-full items-center justify-between px-0.5 text-[8.5px] font-mono leading-none tracking-tight">
                <span className="text-[#F1F3EF] tabular-nums" title="Top 10k EO">
                  {eoResult.top10k}%
                </span>
                <span className="text-[#7F8983] tabular-nums" title="Near You EO">
                  {eoResult.nearU}%
                </span>
              </div>
            ) : (
              <div className="w-full text-center text-[8.5px] font-mono text-[#7F8983] leading-none tabular-nums">
                {eoResult.displayText}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
