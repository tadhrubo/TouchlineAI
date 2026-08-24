"use client";

import React from "react";
import Image from "next/image";
import { Player } from "@/types/fpl";
import { PlayerCard } from "./PlayerCard";
import { SampleTier } from "@/utils/eo";

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
  const gkp = starters.filter((p) => p.position === "GKP");
  const defs = starters.filter((p) => p.position === "DEF");
  const mids = starters.filter((p) => p.position === "MID");
  const fwds = starters.filter((p) => p.position === "FWD");

  const displayFormation =
    formation || `${defs.length}-${mids.length}-${fwds.length}`;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0d121c] select-none">
      {/* Tactical Pitch Canvas with Minimalist Vector Pitch Markings */}
      <div className="relative w-full h-[520px] sm:h-[560px] overflow-hidden flex flex-col justify-between py-2.5">
        {/* Subtle tactical grid lines background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Vector Pitch Markings (Whisper-thin white lines) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pitch Outer Boundary */}
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

          {/* Half-Way Line */}
          <line
            x1="12"
            y1="50%"
            x2="calc(100% - 12px)"
            y2="50%"
            stroke="#ffffff"
            strokeWidth="1"
          />

          {/* Center Circle */}
          <circle
            cx="50%"
            cy="50%"
            r="40"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
          />
          <circle cx="50%" cy="50%" r="2" fill="#ffffff" />

          {/* Top Penalty Box */}
          <rect
            x="25%"
            y="12"
            width="50%"
            height="64"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
          />
          {/* Top 6-yard box */}
          <rect
            x="37%"
            y="12"
            width="26%"
            height="24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
          />
          <circle cx="50%" cy="52" r="1.5" fill="#ffffff" />

          {/* Bottom Penalty Box */}
          <rect
            x="25%"
            y="calc(100% - 76px)"
            width="50%"
            height="64"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
          />
          {/* Bottom 6-yard box */}
          <rect
            x="37%"
            y="calc(100% - 36px)"
            width="26%"
            height="24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
          />
          <circle cx="50%" cy="calc(100% - 52px)" r="1.5" fill="#ffffff" />
        </svg>

        {/* Top Symmetrical Pitchside Branding Banners */}
        <div className="absolute top-2 inset-x-2 sm:inset-x-3 flex items-center justify-between pointer-events-none z-10">
          {/* Left Pitchside Ad Board */}
          <div className="relative w-[96px] sm:w-[112px] h-[28px] sm:h-[32px] rounded-md overflow-hidden bg-[#0B0E14]/90 border border-white/[0.14] shadow-sm flex items-center justify-center p-0.5">
            <Image
              src="/asset/image/tl-pitchside.jpeg"
              alt="Touchline AI Pitchside Banner"
              width={112}
              height={32}
              className="w-full h-full object-contain"
              priority
              unoptimized
            />
          </div>

          {/* Right Pitchside Ad Board */}
          <div className="relative w-[96px] sm:w-[112px] h-[28px] sm:h-[32px] rounded-md overflow-hidden bg-[#0B0E14]/90 border border-white/[0.14] shadow-sm flex items-center justify-center p-0.5">
            <Image
              src="/asset/image/tl-pitchside.jpeg"
              alt="Touchline AI Pitchside Banner"
              width={112}
              height={32}
              className="w-full h-full object-contain"
              priority
              unoptimized
            />
          </div>
        </div>

        {/* Dynamic Formation Indicator (Bottom Right) */}
        <div className="absolute bottom-2 right-2.5 z-10">
          <span className="text-[10px] font-mono font-medium text-neutral-400 bg-neutral-900/80 border border-white/[0.06] rounded px-2 py-0.5">
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
        <div
          className={`relative z-10 flex items-center ${
            defs.length >= 4
              ? "justify-between px-1 sm:px-2"
              : "justify-around px-4"
          }`}
        >
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
        <div
          className={`relative z-10 flex items-center ${
            mids.length >= 4
              ? "justify-between px-1 sm:px-2"
              : "justify-around px-4"
          }`}
        >
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
        <div className="relative z-10 flex justify-around items-center px-4 pb-1">
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
