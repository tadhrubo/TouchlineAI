"use client";

import React from "react";
import Image from "next/image";

interface LeaguePlayer {
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
}

interface LeaguePitchViewProps {
  managerName: string;
  teamName: string;
  transfers: number;
  teamValue: number;
  bank: number;
  playedCount: number;
  maxPlayedCount: number;
  activeChip: string | null;
  starters: LeaguePlayer[];
  bench: LeaguePlayer[];
}

export const LeaguePitchView: React.FC<LeaguePitchViewProps> = ({
  managerName,
  teamName,
  transfers,
  teamValue,
  bank,
  playedCount,
  maxPlayedCount,
  activeChip,
  starters,
  bench,
}) => {
  const gks = starters.filter((p) => p.elementType === 1);
  const defs = starters.filter((p) => p.elementType === 2);
  const mids = starters.filter((p) => p.elementType === 3);
  const fwds = starters.filter((p) => p.elementType === 4);

  const renderPlayer = (player: LeaguePlayer, isBench = false) => {
    return (
      <div
        key={player.id}
        className="flex flex-col items-center justify-center relative flex-1 min-w-0 max-w-[76px] transition-transform duration-150 hover:scale-105"
      >
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

        {/* Kit Shirt Graphics */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          <Image
            src={player.kitUrl}
            alt={player.webName}
            width={40}
            height={40}
            className="w-9 h-9 object-contain drop-shadow-md"
            unoptimized
          />
          {/* Minutes played indicator dot */}
          {player.played && (
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-black shadow" />
          )}
        </div>

        {/* Player Name Tag */}
        <div className="w-full mt-0.5 px-0.5 py-0.5 rounded bg-black/85 border border-white/[0.08] backdrop-blur-sm text-center shadow">
          <p className="text-[10px] font-medium text-neutral-200 truncate leading-tight">
            {player.webName}
          </p>
        </div>

        {/* Live Points Badge */}
        <div className="w-full mt-0.5 px-1 py-0.2 rounded bg-neutral-900/90 border border-white/[0.06] text-center flex items-center justify-center gap-1">
          <span
            className={`text-[10px] font-mono font-semibold ${
              player.livePoints > 0
                ? "text-emerald-400"
                : player.minutes > 0
                ? "text-neutral-300"
                : "text-neutral-500"
            }`}
          >
            {player.livePoints} pts
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full p-2.5 rounded-xl bg-[#0B0E14] border border-white/[0.08] space-y-2.5 shadow-inner">
      {/* Quick Status Bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-neutral-900/80 border border-white/[0.06] text-[11px] font-mono text-neutral-300">
        <div className="flex items-center gap-2">
          <span>
            FT: <strong className="text-neutral-100">{transfers}</strong>
          </span>
          <span className="text-neutral-600">|</span>
          <span>
            TV: <strong className="text-neutral-100">£{teamValue.toFixed(1)}m</strong>
          </span>
          <span className="text-neutral-600">|</span>
          <span>
            Bank: <strong className="text-neutral-100">£{bank.toFixed(1)}m</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeChip && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-950/80 text-purple-300 border border-purple-800">
              {activeChip}
            </span>
          )}
          <span className="text-emerald-400 font-semibold">
            Played: {playedCount}/{maxPlayedCount}
          </span>
        </div>
      </div>

      {/* Mini Pitch Area */}
      <div className="relative w-full rounded-lg overflow-hidden bg-gradient-to-b from-[#143823] via-[#0f2c1b] to-[#0c2416] border border-emerald-900/40 p-3 flex flex-col justify-between min-h-[320px] shadow-lg">
        {/* Top pitch lines */}
        <div className="absolute inset-x-0 top-0 h-14 border-b border-white/[0.07] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-10 border border-white/[0.07] rounded-b-md pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/[0.07] pointer-events-none" />

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
      {bench.length > 0 && (
        <div className="w-full p-2 rounded-lg bg-neutral-900/60 border border-white/[0.06] space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 px-1">
            <span>BENCH</span>
            {activeChip === "BB" && (
              <span className="text-purple-400 font-bold">BENCH BOOST ACTIVE</span>
            )}
          </div>
          <div className="flex justify-around items-center gap-1">
            {bench.map((p, idx) => (
              <div key={p.id} className="relative flex flex-col items-center">
                <span className="text-[9px] font-mono text-neutral-500 mb-0.5">
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
