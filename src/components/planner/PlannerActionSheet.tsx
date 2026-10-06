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
      return "bg-emerald-700 text-white font-semibold font-mono";
    case 2:
      return "bg-emerald-500 text-white font-semibold font-mono";
    case 3:
      return "bg-slate-600 text-white font-semibold font-mono";
    case 4:
      return "bg-rose-600 text-white font-semibold font-mono";
    case 5:
      return "bg-rose-800 text-white font-semibold font-mono";
    default:
      return "bg-slate-700 text-white font-semibold font-mono";
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
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#0F141E] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-1 mb-2" />

        {/* Top Header: Player Summary */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            {/* Shirt Icon */}
            <div className="relative w-12 h-12 flex items-center justify-center bg-white/[0.03] rounded-xl border border-white/10 p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shirtUrl}
                alt={player.webName}
                className="h-10 object-contain drop-shadow"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = fallbackUrl;
                }}
              />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-950 text-neutral-300 border border-white/10">
                {player.position}
              </span>
            </div>

            {/* Name & Club */}
            <div>
              <h3 className="text-base font-bold text-neutral-100 leading-tight">
                {player.fullName || player.webName}
              </h3>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                {player.team} · <span className="text-emerald-400 font-bold tabular-nums">£{player.price.toFixed(1)}m</span>
              </p>
            </div>
          </div>

          {/* Close Button with 44px min touch target */}
          <button
            onClick={onClose}
            aria-label="Close action sheet"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] border border-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
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
                  className={`p-2.5 rounded-xl text-center font-mono flex flex-col items-center justify-center ${getFdrColor(
                    fix.difficulty
                  )}`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-tight">
                    {fix.opponent} ({fix.isHome ? "H" : "A"})
                  </span>
                  <span className="text-[9px] opacity-80 mt-0.5 tabular-nums font-semibold">
                    FDR {fix.difficulty}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-3 p-3 text-center text-xs font-mono text-neutral-400 bg-white/[0.02] border border-white/5 rounded-xl">
                No upcoming fixture data
              </div>
            )}
          </div>
        </div>

        {/* Key Quick Telemetry: Typographic Row */}
        <div className="grid grid-cols-3 gap-2 text-center py-2 px-3 rounded-xl bg-white/[0.02] border border-white/10">
          <div>
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-0.5">Total Pts</span>
            <span className="text-base font-mono font-bold text-neutral-100 tabular-nums">{player.totalPoints}</span>
          </div>
          <div className="border-x border-white/5 px-2">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-0.5">Selected</span>
            <span className="text-base font-mono font-bold text-neutral-100 tabular-nums">{player.selectedByPercent}%</span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-0.5">Form</span>
            <span className="text-base font-mono font-bold text-emerald-400 tabular-nums">{player.form}</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Player Info Button */}
          <button
            onClick={() => {
              if (onShowInfo) {
                onShowInfo(player);
              }
              onClose();
            }}
            className="min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 border border-white/10 text-xs font-semibold font-mono transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Info className="w-4 h-4 text-neutral-400" />
            <span>Player Info</span>
          </button>

          {/* Replace Player CTA: Confident Solid CTA */}
          <button
            onClick={() => {
              onReplace(player);
              onClose();
            }}
            className="min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-gray-950 text-xs font-bold font-mono tracking-wide transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
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
