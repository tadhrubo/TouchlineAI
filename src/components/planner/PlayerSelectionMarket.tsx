"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Player } from "@/types/fpl";
import { getFplKitUrl } from "@/utils/fpl";
import {
  Search,
  X,
  RefreshCw,
  AlertCircle,
  Check,
} from "lucide-react";

interface PlayerSelectionMarketProps {
  outPlayer: Player | null;
  currentBank: number;
  freeTransfers: number;
  currentSquad: Player[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedPlayer: Player) => void;
}

type CustomStatOption =
  | "totalPoints"
  | "price"
  | "goals"
  | "assists"
  | "cleanSheets"
  | "xG"
  | "xA"
  | "form"
  | "selectedByPercent"
  | "projectedPoints";

const CUSTOM_STAT_LABELS: Record<CustomStatOption, string> = {
  totalPoints: "Points",
  price: "Price",
  goals: "Goals",
  assists: "Assists",
  cleanSheets: "Clean Sheets",
  xG: "xG",
  xA: "xA",
  form: "Form",
  selectedByPercent: "Ownership %",
  projectedPoints: "xP (Projected)",
};

const TEAMS_LIST = [
  { short: "ALL", name: "All Teams" },
  { short: "ARS", name: "Arsenal" },
  { short: "AVL", name: "Aston Villa" },
  { short: "BOU", name: "Bournemouth" },
  { short: "BRE", name: "Brentford" },
  { short: "BHA", name: "Brighton" },
  { short: "CHE", name: "Chelsea" },
  { short: "CRY", name: "Crystal Palace" },
  { short: "EVE", name: "Everton" },
  { short: "FUL", name: "Fulham" },
  { short: "IPS", name: "Ipswich" },
  { short: "LEI", name: "Leicester" },
  { short: "LIV", name: "Liverpool" },
  { short: "MCI", name: "Man City" },
  { short: "MUN", name: "Man United" },
  { short: "NEW", name: "Newcastle" },
  { short: "NFO", name: "Nott'm Forest" },
  { short: "SOU", name: "Southampton" },
  { short: "TOT", name: "Tottenham" },
  { short: "WHU", name: "West Ham" },
  { short: "WOL", name: "Wolves" },
];

function getFdrBadgeColor(difficulty: number = 3): string {
  switch (difficulty) {
    case 1:
    case 2:
      return "bg-emerald-600/90 text-white";
    case 3:
      return "bg-neutral-700 text-neutral-200";
    case 4:
      return "bg-rose-700/90 text-white";
    case 5:
      return "bg-rose-950 text-rose-300 border border-rose-800";
    default:
      return "bg-neutral-700 text-neutral-200";
  }
}

export const PlayerSelectionMarket: React.FC<PlayerSelectionMarketProps> = ({
  outPlayer,
  currentBank,
  freeTransfers,
  currentSquad,
  isOpen,
  onClose,
  onSelect,
}) => {
  const [mounted, setMounted] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customStat, setCustomStat] = useState<CustomStatOption>("totalPoints");
  const [selectedTeam, setSelectedTeam] = useState<string>("ALL");
  const [selectedPosition, setSelectedPosition] = useState<string>(
    outPlayer?.position || "MID"
  );
  const [maxCostInput, setMaxCostInput] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update default position when outPlayer changes
  useEffect(() => {
    if (outPlayer) {
      setSelectedPosition(outPlayer.position);
    }
  }, [outPlayer]);

  // Fetch all players from /api/players
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setFetchError(null);

    fetch("/api/players")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load players (Status ${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setAllPlayers(data.players || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Error loading players market:", err);
          setFetchError(err.message || "Failed to load players market.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Set of current squad IDs to exclude
  const currentSquadIds = useMemo(() => {
    return new Set(currentSquad.map((p) => String(p.id)));
  }, [currentSquad]);

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let list = allPlayers.filter((p) => {
      // Exclude players already in squad (except the one being transferred out)
      if (currentSquadIds.has(String(p.id)) && p.id !== outPlayer?.id) {
        return false;
      }

      // Position filter
      if (selectedPosition !== "ALL" && p.position !== selectedPosition) {
        return false;
      }

      // Team filter
      if (selectedTeam !== "ALL" && p.teamShort !== selectedTeam) {
        return false;
      }

      // Max cost filter
      if (maxCostInput && !isNaN(Number(maxCostInput)) && Number(maxCostInput) > 0) {
        if (p.price > Number(maxCostInput)) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName =
          p.webName?.toLowerCase().includes(q) ||
          p.fullName?.toLowerCase().includes(q) ||
          p.team?.toLowerCase().includes(q);
        if (!matchesName) return false;
      }

      return true;
    });

    // Sort by customStat
    list.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      switch (customStat) {
        case "totalPoints":
          valA = a.totalPoints || 0;
          valB = b.totalPoints || 0;
          break;
        case "price":
          valA = a.price || 0;
          valB = b.price || 0;
          break;
        case "goals":
          valA = (a as any).goals_scored || (a as any).goals || 0;
          valB = (b as any).goals_scored || (b as any).goals || 0;
          break;
        case "assists":
          valA = (a as any).assists || 0;
          valB = (b as any).assists || 0;
          break;
        case "cleanSheets":
          valA = (a as any).clean_sheets || 0;
          valB = (b as any).clean_sheets || 0;
          break;
        case "xG":
          valA = a.xG || 0;
          valB = b.xG || 0;
          break;
        case "xA":
          valA = a.xA || 0;
          valB = b.xA || 0;
          break;
        case "form":
          valA = a.form || 0;
          valB = b.form || 0;
          break;
        case "selectedByPercent":
          valA = a.selectedByPercent || 0;
          valB = b.selectedByPercent || 0;
          break;
        case "projectedPoints":
          valA = a.projectedPoints || 0;
          valB = b.projectedPoints || 0;
          break;
        default:
          valA = a.totalPoints || 0;
          valB = b.totalPoints || 0;
      }

      return valB - valA;
    });

    return list;
  }, [
    allPlayers,
    currentSquadIds,
    outPlayer,
    selectedPosition,
    selectedTeam,
    maxCostInput,
    searchQuery,
    customStat,
  ]);

  if (!isOpen || !mounted || !outPlayer) return null;

  const bankTextColor = currentBank < 0 ? "text-rose-500" : "text-emerald-400";

  const renderStatValue = (player: Player) => {
    switch (customStat) {
      case "totalPoints":
        return `${player.totalPoints} pts`;
      case "price":
        return `£${player.price.toFixed(1)}m`;
      case "goals":
        return `${(player as any).goals_scored || (player as any).goals || 0} G`;
      case "assists":
        return `${(player as any).assists || 0} A`;
      case "cleanSheets":
        return `${(player as any).clean_sheets || 0} CS`;
      case "xG":
        return `${(player.xG || 0).toFixed(2)} xG`;
      case "xA":
        return `${(player.xA || 0).toFixed(2)} xA`;
      case "form":
        return `${(player.form || 0).toFixed(1)} form`;
      case "selectedByPercent":
        return `${player.selectedByPercent}% own`;
      case "projectedPoints":
        return `${(player.projectedPoints || 0).toFixed(1)} xP`;
      default:
        return `${player.totalPoints} pts`;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#0B0E14] text-neutral-100 overflow-hidden animate-fade-in">
      {/* 1. Global Market Header */}
      <div className="flex-shrink-0 bg-[#0E121A] border-b border-white/[0.08] px-4 py-3 flex items-center justify-between shadow-md">
        <div className="min-w-0 pr-2">
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
            Transfer Market
          </p>
          <h2 className="text-sm font-bold text-neutral-100 truncate">
            Replace <span className="text-rose-400 font-extrabold">{outPlayer.webName}</span> (£{outPlayer.price.toFixed(1)}m)
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Dynamic Bank & Transfers Badges with Red Negative Color */}
          <div className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1.5 rounded-lg border border-white/[0.06] text-xs font-mono">
            <span className="text-neutral-400">Bank:</span>
            <span className={`font-bold ${bankTextColor}`}>
              £{currentBank.toFixed(1)}m
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1.5 rounded-lg border border-white/[0.06] text-xs font-mono">
            <span className="text-neutral-400">FT:</span>
            <span className="font-bold text-neutral-100">{freeTransfers}</span>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Mobile-Responsive Advanced Filter Panel */}
      <div className="flex-shrink-0 flex flex-col gap-2.5 p-3 bg-[#0E121A] border-b border-white/[0.08] shadow-sm">
        {/* Search Row - Full width on mobile */}
        <div className="w-full relative flex items-center">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by player or club..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-white/[0.08] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Grid - 2 columns on mobile, row on desktop */}
        <div className="grid grid-cols-2 md:flex md:flex-row gap-2 w-full font-mono text-xs">
          <select
            value={customStat}
            onChange={(e) => setCustomStat(e.target.value as CustomStatOption)}
            className="col-span-1 bg-neutral-900 border border-white/[0.08] rounded-lg px-2.5 py-2 text-[11px] text-neutral-200 focus:outline-none focus:border-emerald-500/50 truncate"
          >
            {Object.entries(CUSTOM_STAT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="col-span-1 bg-neutral-900 border border-white/[0.08] rounded-lg px-2.5 py-2 text-[11px] text-neutral-200 focus:outline-none focus:border-emerald-500/50 truncate"
          >
            <option value="ALL">All Positions</option>
            <option value="GKP">Goalkeepers</option>
            <option value="DEF">Defenders</option>
            <option value="MID">Midfielders</option>
            <option value="FWD">Forwards</option>
          </select>

          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="col-span-1 bg-neutral-900 border border-white/[0.08] rounded-lg px-2.5 py-2 text-[11px] text-neutral-200 focus:outline-none focus:border-emerald-500/50 truncate"
          >
            {TEAMS_LIST.map((t) => (
              <option key={t.short} value={t.short}>
                {t.name}
              </option>
            ))}
          </select>

          <div className="col-span-1 flex items-center bg-neutral-900 border border-white/[0.08] rounded-lg px-2 text-[11px] text-neutral-200 overflow-hidden">
            <span className="text-neutral-400 mr-1.5 whitespace-nowrap text-[10px]">Max £M:</span>
            <input
              type="number"
              step="0.1"
              placeholder="No limit"
              value={maxCostInput}
              onChange={(e) => setMaxCostInput(e.target.value)}
              className="w-full bg-transparent text-neutral-100 focus:outline-none py-2 text-[11px] font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. Player Selection List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-2 text-xs font-mono text-neutral-400">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
            <p>Loading candidate players...</p>
          </div>
        ) : fetchError ? (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{fetchError}</span>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-neutral-400 bg-neutral-900/30 rounded-xl border border-white/[0.04] space-y-1">
            <p>No players matched your filter criteria.</p>
            <p className="text-[11px] text-neutral-500">
              Try resetting the Max Cost or adjusting the Search query.
            </p>
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const isGK = player.position === "GKP";
            const shirtUrl = getFplKitUrl(player.teamShort, isGK);
            const fallbackUrl = isGK
              ? "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0_1-66.webp"
              : "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0-66.webp";

            const nextFix = player.currentFixture || player.upcomingFixtures?.[0];

            return (
              <button
                key={player.id}
                onClick={() => onSelect(player)}
                className="w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all duration-150 bg-[#0E121A] border-white/[0.06] hover:border-emerald-500/40 hover:bg-neutral-900 active:scale-[0.99]"
              >
                {/* Left: Shirt & Name & Fixture */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  {/* Shirt Icon */}
                  <div className="relative w-9 h-9 flex items-center justify-center bg-neutral-950 rounded-lg border border-white/[0.06] p-0.5 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shirtUrl}
                      alt={player.webName}
                      className="h-7 object-contain drop-shadow"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = fallbackUrl;
                      }}
                    />
                    <span className="absolute -bottom-1 -right-1 px-1 py-0.1 rounded text-[8px] font-mono font-bold bg-neutral-900 text-neutral-300 border border-white/[0.08]">
                      {player.position}
                    </span>
                  </div>

                  {/* Player & Team Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-neutral-100 truncate">
                        {player.webName}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 flex-shrink-0">
                        {player.teamShort}
                      </span>
                    </div>

                    {/* Next Match Badge */}
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono">
                      {nextFix ? (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${getFdrBadgeColor(
                            nextFix.difficulty
                          )}`}
                        >
                          {nextFix.opponent} ({nextFix.isHome ? "H" : "A"})
                        </span>
                      ) : (
                        <span className="text-neutral-500">TBD</span>
                      )}
                      <span className="text-neutral-500">
                        xP: <strong className="text-neutral-300">{player.projectedPoints}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Selected Custom Stat & Price & Swap Button */}
                <div className="flex items-center gap-2.5 text-right flex-shrink-0 font-mono">
                  {/* Custom Stat & Price Pill */}
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 block">
                      {renderStatValue(player)}
                    </span>
                    <span className="text-[9.5px] text-neutral-400 font-medium">
                      £{player.price.toFixed(1)}m
                    </span>
                  </div>

                  {/* Buy / Swap Action Button with Comfortable Mobile Touch Target */}
                  <div className="min-w-[32px] h-8 px-2 rounded-lg flex items-center justify-center border bg-emerald-500/15 border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/25 transition">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* 4. Footer info */}
      <div className="flex-shrink-0 p-2.5 border-t border-white/[0.06] bg-neutral-950/90 text-center font-mono text-[10px] text-neutral-500">
        Showing {filteredPlayers.length} candidate players · Budget flexible for draft planning
      </div>
    </div>,
    document.body
  );
};
