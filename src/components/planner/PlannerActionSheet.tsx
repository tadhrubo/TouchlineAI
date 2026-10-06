"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Player } from "@/types/fpl";
import { getFplKitUrl } from "@/utils/fpl";
import {
  X,
  ArrowLeftRight,
  Info,
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
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 animate-fade-in p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-tl-surface border-t sm:border border-tl-border rounded-t-md sm:rounded-md p-4 shadow-2xl space-y-3.5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div className="w-10 h-1 bg-tl-border rounded-none mx-auto mb-1" />

        {/* Top Header: Player Summary */}
        <div className="flex items-center justify-between pb-2.5 border-b border-tl-border">
          <div className="flex items-center gap-2.5">
            {/* Shirt Icon */}
            <div className="relative w-10 h-10 flex items-center justify-center bg-tl-surface2 rounded-sm border border-tl-border p-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shirtUrl}
                alt={player.webName}
                className="h-8 object-contain drop-shadow"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = fallbackUrl;
                }}
              />
              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-none text-[8.5px] font-mono font-bold bg-tl-bg text-tl-muted border border-tl-border">
                {player.position}
              </span>
            </div>

            {/* Name & Club */}
            <div>
              <h3 className="text-sm font-bold text-tl-text leading-tight">
                {player.fullName || player.webName}
              </h3>
              <p className="text-xs text-tl-muted font-mono mt-0.5">
                {player.team} · <span className="text-tl-accent font-semibold tabular-nums">£{player.price.toFixed(1)}m</span>
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close action sheet"
            className="p-1 rounded-sm text-tl-muted hover:text-tl-text hover:bg-tl-surface2 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fixtures Schedule (Next 3 Matches) */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-tl-muted font-semibold block">
            Upcoming Fixtures
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {nextFixtures.length > 0 ? (
              nextFixtures.map((fix, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-none text-center font-mono flex flex-col items-center justify-center ${getFdrColor(
                    fix.difficulty
                  )}`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-tight">
                    {fix.opponent} ({fix.isHome ? "H" : "A"})
                  </span>
                  <span className="text-[9px] opacity-90 mt-0.5 tabular-nums font-semibold">
                    FDR {fix.difficulty}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-3 p-2.5 text-center text-xs font-mono text-tl-muted bg-tl-surface2 border border-tl-border rounded-none">
                No upcoming fixture data
              </div>
            )}
          </div>
        </div>

        {/* Key Quick Telemetry: Typographic Row */}
        <div className="grid grid-cols-3 gap-2 text-center py-2 px-2.5 rounded-sm bg-tl-surface2 border border-tl-border">
          <div>
            <span className="text-[10px] font-mono text-tl-muted uppercase tracking-wider block mb-0.5">Total Pts</span>
            <span className="text-sm font-mono font-bold text-tl-text tabular-nums">{player.totalPoints}</span>
          </div>
          <div className="border-x border-tl-border px-2">
            <span className="text-[10px] font-mono text-tl-muted uppercase tracking-wider block mb-0.5">Selected</span>
            <span className="text-sm font-mono font-bold text-tl-text tabular-nums">{player.selectedByPercent}%</span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-tl-muted uppercase tracking-wider block mb-0.5">Form</span>
            <span className="text-sm font-mono font-bold text-tl-accent tabular-nums">{player.form}</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Player Info Button */}
          <button
            onClick={() => {
              if (onShowInfo) {
                onShowInfo(player);
              }
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-sm bg-tl-surface2 hover:bg-tl-surface text-tl-text border border-tl-border text-xs font-semibold font-mono transition"
          >
            <Info className="w-3.5 h-3.5 text-tl-muted" />
            <span>Player Info</span>
          </button>

          {/* Replace Player CTA */}
          <button
            onClick={() => {
              onReplace(player);
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-sm bg-tl-accent hover:opacity-90 text-tl-accentContrast text-xs font-bold font-mono tracking-wide transition"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Replace Player</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
