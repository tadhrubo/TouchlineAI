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
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update default position when outPlayer changes
  useEffect(() => {
    if (outPlayer) {
      setSelectedPosition(outPlayer.position);
    }
  }, [outPlayer]);

  // Fetch players from API on mount
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchPlayers() {
      try {
        setIsLoading(true);
        setFetchError(null);
        const res = await fetch("/api/fpl/bootstrap");
        if (!res.ok) throw new Error("Failed to load player database");
        const data = await res.json();

        if (isMounted) {
          // Normalize API elements to internal Player type
          const mappedPlayers: Player[] = (data.elements || []).map((el: any) => {
            const team = data.teams?.find((t: any) => t.id === el.team);
            const teamShort = team ? team.short_name : "UNK";
            const posTypes: Record<number, "GKP" | "DEF" | "MID" | "FWD"> = {
              1: "GKP",
              2: "DEF",
              3: "MID",
              4: "FWD",
            };
            const pos = posTypes[el.element_type] || "MID";

            return {
              id: el.id,
              code: el.code,
              webName: el.web_name,
              firstName: el.first_name,
              secondName: el.second_name,
              position: pos,
              team: team ? team.name : "Unknown",
              teamShort,
              price: el.now_cost / 10,
              totalPoints: el.total_points,
              goals: el.goals_scored,
              assists: el.assists,
              cleanSheets: el.clean_sheets,
              form: parseFloat(el.form) || 0,
              selectedByPercent: parseFloat(el.selected_by_percent) || 0,
              xG: parseFloat(el.expected_goals) || 0,
              xA: parseFloat(el.expected_assists) || 0,
              projectedPoints: parseFloat(el.ep_next) || 0,
              isStarter: false,
              isCaptain: false,
              isViceCaptain: false,
              chanceOfPlayingNextRound: el.chance_of_playing_next_round,
              news: el.news,
            };
          });

          setAllPlayers(mappedPlayers);
        }
      } catch (err: any) {
        if (isMounted) setFetchError(err.message || "An error occurred");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchPlayers();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Exclude current squad members from candidates
  const currentSquadIds = useMemo(() => {
    return new Set(currentSquad.map((p) => p.id));
  }, [currentSquad]);

  // Filter and sort candidate players
  const filteredPlayers = useMemo(() => {
    let list = allPlayers.filter((p) => {
      if (currentSquadIds.has(p.id) && p.id !== outPlayer?.id) return false;
      if (selectedPosition !== "ALL" && p.position !== selectedPosition) return false;
      if (selectedTeam !== "ALL" && p.teamShort !== selectedTeam) return false;
      if (maxPrice !== undefined && p.price > maxPrice) return false;
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchName = p.webName.toLowerCase().includes(query);
        const matchTeam = p.teamShort.toLowerCase().includes(query);
        if (!matchName && !matchTeam) return false;
      }
      return true;
    });

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
    maxPrice,
    searchQuery,
    customStat,
  ]);

  if (!isOpen || !mounted || !outPlayer) return null;

  const bankTextColor = currentBank < 0 ? "text-[#E05252]" : "text-[#16C784]";

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
    <div className="fixed inset-0 z-[9999] flex justify-center bg-black/80 overflow-hidden animate-fade-in">
      <div className="w-full max-w-3xl flex flex-col bg-[#070908] text-[#F1F3EF] overflow-hidden border-x border-[#1E2421] h-full">
        {/* 1. Global Market Header */}
        <div className="flex-shrink-0 bg-[#0D1110] border-b border-[#1E2421] px-4 py-3 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] font-mono text-[#7F8983] uppercase tracking-wider font-semibold">
              TRANSFER TARGETS
            </p>
            <h2 className="text-sm font-bold text-[#F1F3EF] truncate">
              Replace <span className="text-[#E05252] font-semibold">{outPlayer.webName}</span> (£{outPlayer.price.toFixed(1)}m)
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-[#070908] px-2.5 py-1.5 rounded-sm border border-[#1E2421] text-xs font-mono">
              <span className="text-[#7F8983]">BANK</span>
              <span className={`font-bold tabular-nums ${bankTextColor}`}>
                £{currentBank.toFixed(1)}m
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#070908] px-2.5 py-1.5 rounded-sm border border-[#1E2421] text-xs font-mono">
              <span className="text-[#7F8983]">FT</span>
              <span className="font-bold text-[#F1F3EF] tabular-nums">{freeTransfers}</span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close transfer market"
              className="w-8 h-8 flex items-center justify-center rounded-sm bg-[#070908] border border-[#1E2421] text-[#7F8983] hover:text-[#F1F3EF] hover:border-neutral-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Filter Grid */}
        <div className="flex-shrink-0 flex flex-col gap-2 p-3 bg-[#0D1110] border-b border-[#1E2421]">
          {/* Search Row */}
          <div className="w-full relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#7F8983] absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search player or club..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070908] border border-[#1E2421] rounded-sm pl-9 pr-8 py-2 text-xs text-[#F1F3EF] placeholder-[#7F8983] focus:outline-none focus:border-[#16C784]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-[#7F8983] hover:text-[#F1F3EF]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full font-mono text-xs">
            <select
              value={customStat}
              onChange={(e) => setCustomStat(e.target.value as CustomStatOption)}
              className="bg-[#070908] border border-[#1E2421] rounded-sm px-2.5 py-2 text-xs text-[#F1F3EF] focus:outline-none focus:border-[#16C784] appearance-none truncate"
            >
              {Object.entries(CUSTOM_STAT_LABELS).map(([key, label]) => (
                <option key={key} value={key} className="bg-[#0D1110] text-[#F1F3EF]">
                  {label}
                </option>
              ))}
            </select>

            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="bg-[#070908] border border-[#1E2421] rounded-sm px-2.5 py-2 text-xs text-[#F1F3EF] focus:outline-none focus:border-[#16C784] appearance-none truncate"
            >
              <option value="ALL" className="bg-[#0D1110] text-[#F1F3EF]">All Positions</option>
              <option value="GKP" className="bg-[#0D1110] text-[#F1F3EF]">Goalkeepers</option>
              <option value="DEF" className="bg-[#0D1110] text-[#F1F3EF]">Defenders</option>
              <option value="MID" className="bg-[#0D1110] text-[#F1F3EF]">Midfielders</option>
              <option value="FWD" className="bg-[#0D1110] text-[#F1F3EF]">Forwards</option>
            </select>

            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-[#070908] border border-[#1E2421] rounded-sm px-2.5 py-2 text-xs text-[#F1F3EF] focus:outline-none focus:border-[#16C784] appearance-none truncate"
            >
              {TEAMS_LIST.map((t) => (
                <option key={t.short} value={t.short} className="bg-[#0D1110] text-[#F1F3EF]">
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={maxPrice !== undefined ? String(maxPrice) : ""}
              onChange={(e) =>
                setMaxPrice(e.target.value ? Number(e.target.value) : undefined)
              }
              className="bg-[#070908] border border-[#1E2421] rounded-sm px-2.5 py-2 text-xs text-[#F1F3EF] focus:outline-none focus:border-[#16C784] appearance-none truncate"
            >
              <option value="" className="bg-[#0D1110] text-[#F1F3EF]">Max: No limit</option>
              {Array.from({ length: 23 }, (_, i) => (15.0 - i * 0.5).toFixed(1)).map((price) => (
                <option key={price} value={price} className="bg-[#0D1110] text-[#F1F3EF]">
                  Max: £{price}m
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Player Selection List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-2 text-xs font-mono text-[#7F8983]">
              <RefreshCw className="w-5 h-5 text-[#16C784] animate-spin" />
              <p>LOADING CANDIDATES...</p>
            </div>
          ) : fetchError ? (
            <div className="p-3 rounded-sm bg-[#0D1110] border border-[#E05252]/40 text-[#E05252] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{fetchError}</span>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-[#7F8983] bg-[#0D1110] rounded-sm border border-[#1E2421] space-y-1">
              <p>No players matched your filter criteria.</p>
              <p className="text-[11px] text-[#7F8983]/80">
                Try selecting &quot;No limit&quot; or adjusting your search query.
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
                  className="w-full p-2.5 rounded-sm border text-left flex items-center justify-between transition-colors bg-[#0D1110] border-[#1E2421] hover:border-[#16C784]/60 hover:bg-[#111614] group"
                >
                  {/* Left: Shirt & Name Info */}
                  <div className="flex items-center min-w-0 flex-1 pr-2">
                    <div className="relative w-8 h-8 flex items-center justify-center bg-[#070908] rounded-sm border border-[#1E2421] p-0.5 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={shirtUrl}
                        alt={player.webName}
                        className="h-6 object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = fallbackUrl;
                        }}
                      />
                      <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-sm text-[8px] font-mono font-bold bg-[#0D1110] text-[#7F8983] border border-[#1E2421]">
                        {player.position}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 ml-3">
                      <div className="text-sm font-bold text-[#F1F3EF] truncate">{player.webName}</div>
                      <div className="text-[10px] text-[#7F8983] uppercase font-mono mt-0.5 flex items-center gap-1.5">
                        <span>{player.teamShort} · {player.position}</span>
                        {nextFix && (
                          <span
                            className={`px-1.5 py-0.2 rounded-sm text-[9px] font-bold ${getFdrBadgeColor(
                              nextFix.difficulty
                            )}`}
                          >
                            {nextFix.opponent} ({nextFix.isHome ? "H" : "A"})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Selected Custom Stat & Price & Select Action */}
                  <div className="flex items-center gap-3 text-right flex-shrink-0 font-mono">
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#16C784] block tabular-nums">
                        {renderStatValue(player)}
                      </span>
                      <span className="text-[10px] text-[#7F8983] font-medium tabular-nums">
                        £{player.price.toFixed(1)}m
                      </span>
                    </div>

                    <div className="w-7 h-7 rounded-sm flex items-center justify-center border border-[#1E2421] bg-[#070908] text-[#7F8983] group-hover:border-[#16C784] group-hover:text-[#16C784] transition">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* 4. Footer info */}
        <div className="flex-shrink-0 p-2.5 border-t border-[#1E2421] bg-[#0D1110] text-center font-mono text-[10px] text-[#7F8983]">
          {filteredPlayers.length} CANDIDATE PLAYERS AVAILABLE
        </div>
      </div>
    </div>,
    document.body
  );
};
