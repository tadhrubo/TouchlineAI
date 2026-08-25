"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Player } from "@/types/fpl";
import { getFplKitUrl } from "@/utils/fpl";
import {
  X,
  ArrowLeftRight,
  Info,
  ChevronRight,
  Shield,
  TrendingUp,
} from "lucide-react";

interface PlannerActionSheetProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onReplace: (player: Player) => void;
  onShowInfo?: (player: Player) => void;
}

function getFdrColor(difficulty: number = 3): string {
  switch (difficulty) {
    case 1:
    case 2:
      return "bg-emerald-600/90 text-white border-emerald-500/40";
    case 3:
      return "bg-neutral-700 text-neutral-200 border-neutral-600/40";
    case 4:
      return "bg-rose-700/90 text-white border-rose-600/40";
    case 5:
      return "bg-rose-950 text-rose-300 border-rose-800";
    default:
      return "bg-neutral-700 text-neutral-200 border-neutral-600/40";
  }
}

export const PlannerActionSheet: React.FC<PlannerActionSheetProps> = ({
  player,
  isOpen,
  onClose,
  onReplace,
  onShowInfo,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !player || !mounted) return null;

  const isGK = player.position === "GKP";
  const shirtUrl = getFplKitUrl(player.teamShort, isGK);
  const fallbackUrl = isGK
    ? "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0_1-66.webp"
    : "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0-66.webp";

  // Build next 3 fixtures
  const nextFixtures = (player.upcomingFixtures || []).slice(0, 3);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#0F141E] border-t border-white/[0.12] rounded-t-3xl p-5 shadow-2xl space-y-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-1 mb-2" />

        {/* Top Header: Player Summary */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            {/* Shirt Icon */}
            <div className="relative w-12 h-12 flex items-center justify-center bg-neutral-900/80 rounded-xl border border-white/[0.06] p-1 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shirtUrl}
                alt={player.webName}
                className="h-10 object-contain drop-shadow"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = fallbackUrl;
                }}
              />
              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded text-[8.5px] font-mono font-bold bg-neutral-950 text-neutral-300 border border-white/[0.1]">
                {player.position}
              </span>
            </div>

            {/* Name & Club */}
            <div>
              <h3 className="text-base font-bold text-neutral-100 leading-tight">
                {player.fullName || player.webName}
              </h3>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                {player.team} · <span className="text-emerald-400 font-bold">£{player.price.toFixed(1)}m</span>
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fixtures Schedule (Next 3 Matches) */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block">
            Upcoming Fixtures
          </span>
          <div className="grid grid-cols-3 gap-2">
            {nextFixtures.length > 0 ? (
              nextFixtures.map((fix, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-xl border text-center font-mono flex flex-col items-center justify-center ${getFdrColor(
                    fix.difficulty
                  )}`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-tight">
                    {fix.opponent} ({fix.isHome ? "H" : "A"})
                  </span>
                  <span className="text-[9px] opacity-80 mt-0.5">
                    FDR {fix.difficulty}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-3 p-2 text-center text-xs font-mono text-neutral-500 bg-neutral-900/40 rounded-xl">
                No upcoming fixture data
              </div>
            )}
          </div>
        </div>

        {/* Key Quick Telemetry */}
        <div className="grid grid-cols-3 gap-2 text-center py-1">
          <div className="p-2 rounded-xl bg-neutral-900/60 border border-white/[0.04]">
            <span className="text-[9px] font-mono text-neutral-500 uppercase block">Total Pts</span>
            <span className="text-sm font-mono font-bold text-neutral-100">{player.totalPoints}</span>
          </div>
          <div className="p-2 rounded-xl bg-neutral-900/60 border border-white/[0.04]">
            <span className="text-[9px] font-mono text-neutral-500 uppercase block">Selected By</span>
            <span className="text-sm font-mono font-bold text-neutral-100">{player.selectedByPercent}%</span>
          </div>
          <div className="p-2 rounded-xl bg-neutral-900/60 border border-white/[0.04]">
            <span className="text-[9px] font-mono text-neutral-500 uppercase block">Form</span>
            <span className="text-sm font-mono font-bold text-emerald-400">{player.form}</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          {/* Player Info Button */}
          <button
            onClick={() => {
              if (onShowInfo) {
                onShowInfo(player);
              }
              onClose();
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-white/[0.08] text-xs font-semibold font-mono transition active:scale-95 shadow-sm"
          >
            <Info className="w-4 h-4 text-neutral-400" />
            <span>Player Info</span>
          </button>

          {/* Replace Player (Transfer Market) Button */}
          <button
            onClick={() => {
              onReplace(player);
              onClose();
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold font-mono transition active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.25)] border border-emerald-400/40"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Replace Player</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
