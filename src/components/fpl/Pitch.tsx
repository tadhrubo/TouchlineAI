"use client";

import React from "react";
import { Player } from "@/types/fpl";
import { PlayerCard } from "./PlayerCard";
import { SampleTier } from "@/utils/eo";
import { PitchBranding } from "../ui/PitchBranding";

interface PitchProps {
  players: Player[];
  onPlayerClick?: (player: Player) => void;
  captainId?: string;
  viceCaptainId?: string;
  formation?: string;
  sampleTier?: SampleTier;
  userRank?: number;
}

export const Pitch: React.FC<PitchProps> = ({
  players,
  onPlayerClick,
  captainId,
  viceCaptainId,
  formation,
  sampleTier,
  userRank,
}) => {
  // Filter starting XI by position
  const starters = players.filter((p) => !p.isBench);
  const isGk = (p: Player) => p.position === "GKP" || p.elementType === 1 || p.element_type === 1;
  const isDef = (p: Player) => p.position === "DEF" || p.elementType === 2 || p.element_type === 2;
  const isMid = (p: Player) => p.position === "MID" || p.elementType === 3 || p.element_type === 3;
  const isFwd = (p: Player) => p.position === "FWD" || p.elementType === 4 || p.element_type === 4;

  let gkp = starters.filter(isGk);
  let defs = starters.filter(isDef);
  let mids = starters.filter(isMid);
  let fwds = starters.filter(isFwd);

  // Structural fail-safe: If positional metadata is missing and would collapse into 0-11-0,
  // distribute starters according to standard FPL lineup order (Pick 1 = GK, Picks 2-5 = DEF, Picks 6-9 = MID, Picks 10-11 = FWD)
  if (starters.length === 11 && (gkp.length === 0 || defs.length === 0 || fwds.length === 0)) {
    gkp = starters.slice(0, 1);
    defs = starters.slice(1, 5);
    mids = starters.slice(5, 9);
    fwds = starters.slice(9, 11);
  }

  const displayFormation =
    formation && formation !== "0-11-0"
      ? formation
      : `${defs.length}-${mids.length}-${fwds.length}`;

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-sm overflow-hidden border border-tl-border bg-[var(--pitch-bg)] select-none transition-colors">
      {/* Tactical Pitch Canvas with Minimalist Vector Pitch Markings */}
      <div className="relative w-full h-[520px] sm:h-[560px] md:h-[590px] overflow-hidden flex flex-col justify-between py-2.5 md:py-3.5">
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
          {/* Pitch Outer Boundary */}
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

          {/* Half-Way Line */}
          <line
            x1="12"
            y1="50%"
            x2="calc(100% - 12px)"
            y2="50%"
            stroke="var(--pitch-line)"
            strokeWidth="1"
          />

          {/* Center Circle */}
          <circle
            cx="50%"
            cy="50%"
            r="42"
            fill="none"
            stroke="var(--pitch-line)"
            strokeWidth="1"
          />
          <circle cx="50%" cy="50%" r="2" fill="var(--pitch-line)" />

          {/* Top Penalty Box */}
          <rect
            x="25%"
            y="12"
            width="50%"
            height="64"
            fill="none"
            stroke="var(--pitch-line)"
            strokeWidth="1"
          />
          {/* Top 6-yard box */}
          <rect
            x="37%"
            y="12"
            width="26%"
            height="24"
            fill="none"
            stroke="var(--pitch-line)"
            strokeWidth="1"
          />
          <circle cx="50%" cy="52" r="1.5" fill="var(--pitch-line)" />

          {/* Bottom Penalty Box */}
          <rect
            x="25%"
            y="calc(100% - 76px)"
            width="50%"
            height="64"
            fill="none"
            stroke="var(--pitch-line)"
            strokeWidth="1"
          />
          {/* Bottom 6-yard box */}
          <rect
            x="37%"
            y="calc(100% - 36px)"
            width="26%"
            height="24"
            fill="none"
            stroke="var(--pitch-line)"
            strokeWidth="1"
          />
          <circle cx="50%" cy="calc(100% - 52px)" r="1.5" fill="var(--pitch-line)" />
        </svg>

        {/* Top Symmetrical Pitchside Branding (Disabled) */}
        <PitchBranding />

        {/* Dynamic Formation Indicator (Bottom Right) */}
        <div className="absolute bottom-2 right-2.5 z-10">
          <span className="text-[10px] font-mono font-medium text-tl-muted bg-tl-surface border border-tl-border rounded-sm px-2 py-0.5">
            {displayFormation}
          </span>
        </div>

        {/* --- ROW 1: GOALKEEPER --- */}
        <div className="relative z-10 flex justify-center items-center pt-1">
          {gkp.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isCaptain={captainId === player.id || player.isCaptain}
              isViceCaptain={viceCaptainId === player.id || player.isViceCaptain}
              onClick={onPlayerClick}
              sampleTier={sampleTier}
              userRank={userRank}
            />
          ))}
        </div>

        {/* --- ROW 2: DEFENDERS --- */}
        <div className="relative z-10 flex items-center justify-around w-full gap-1.5 sm:gap-3 md:gap-6 px-2 md:px-4">
          {defs.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isCaptain={captainId === player.id || player.isCaptain}
              isViceCaptain={viceCaptainId === player.id || player.isViceCaptain}
              onClick={onPlayerClick}
              sampleTier={sampleTier}
              userRank={userRank}
            />
          ))}
        </div>

        {/* --- ROW 3: MIDFIELDERS --- */}
        <div className="relative z-10 flex items-center justify-around w-full gap-1.5 sm:gap-3 md:gap-6 px-2 md:px-4">
          {mids.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isCaptain={captainId === player.id || player.isCaptain}
              isViceCaptain={viceCaptainId === player.id || player.isViceCaptain}
              onClick={onPlayerClick}
              sampleTier={sampleTier}
              userRank={userRank}
            />
          ))}
        </div>

        {/* --- ROW 4: FORWARDS --- */}
        <div className="relative z-10 flex justify-around items-center w-full gap-2 md:gap-6 px-4 md:px-6 pb-1">
          {fwds.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isCaptain={captainId === player.id || player.isCaptain}
              isViceCaptain={viceCaptainId === player.id || player.isViceCaptain}
              onClick={onPlayerClick}
              sampleTier={sampleTier}
              userRank={userRank}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
