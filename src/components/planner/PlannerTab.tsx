"use client";

import React, { useState, useMemo } from "react";
import { Player, TeamStats } from "@/types/fpl";
import { JerseyIcon } from "../fpl/JerseyIcon";
import { PlayerModal } from "../fpl/PlayerModal";
import { PlannerActionSheet } from "./PlannerActionSheet";
import { PlayerSelectionMarket } from "./PlayerSelectionMarket";
import { PitchBranding } from "../ui/PitchBranding";
import {
  SampleTier,
  SAMPLE_TIER_OPTIONS,
  calculateXEO,
  calculateTemplateOverlap,
} from "@/utils/eo";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  HelpCircle,
  ArrowLeftRight,
  X,
} from "lucide-react";

interface PlannerTabProps {
  stats: TeamStats | null;
  initialPlayers: Player[];
  captainId: string;
  viceCaptainId: string;
  sampleTier?: SampleTier;
  onSampleTierChange?: (tier: SampleTier) => void;
  onOpenChatWithPrompt?: (prompt: string) => void;
}

export const PlannerTab: React.FC<PlannerTabProps> = ({
  stats,
  initialPlayers,
  captainId: initialCaptainId,
  viceCaptainId: initialViceCaptainId,
  sampleTier: controlledSampleTier,
  onSampleTierChange,
  onOpenChatWithPrompt,
}) => {
  const currentGW = stats?.currentGameweek || 1;
  const [plannedGW, setPlannedGW] = useState<number>(stats?.nextGameweek || currentGW);
  const [plannedSquad, setPlannedSquad] = useState<Player[]>(initialPlayers);
  const [captainId, setCaptainId] = useState<string>(initialCaptainId || initialPlayers[0]?.id || "");
  const [viceCaptainId, setViceCaptainId] = useState<string>(initialViceCaptainId || initialPlayers[1]?.id || "");
  const [internalSampleTier, setInternalSampleTier] = useState<SampleTier>("TOP_10K_NEAR_U");
  const sampleTier = controlledSampleTier ?? internalSampleTier;
  const setSampleTier = (tier: SampleTier) => {
    if (onSampleTierChange) {
      onSampleTierChange(tier);
    } else {
      setInternalSampleTier(tier);
    }
  };

  // Transfer & Action Sheet States
  const [activePlayerSlot, setActivePlayerSlot] = useState<Player | null>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState<boolean>(false);
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(false);
  const [detailPlayer, setDetailPlayer] = useState<Player | null>(null);

  const [swappingPlayerId, setSwappingPlayerId] = useState<string | null>(null);
  const [showEOInfoModal, setShowEOInfoModal] = useState<boolean>(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Bank and Free Transfers computation
  const initialBank = stats?.inTheBank || 0.0;
  const initialTotalCost = useMemo(() => {
    return initialPlayers.reduce((acc, p) => acc + p.price, 0);
  }, [initialPlayers]);

  const currentTotalCost = useMemo(() => {
    return plannedSquad.reduce((acc, p) => acc + p.price, 0);
  }, [plannedSquad]);

  const calculatedBank = Number(
    (initialBank + initialTotalCost - currentTotalCost).toFixed(1)
  );

  // Transfers and hits calculation
  const initialPlayerIds = useMemo(() => {
    return new Set(initialPlayers.map((p) => p.id));
  }, [initialPlayers]);

  const transfersMade = useMemo(() => {
    return plannedSquad.filter((p) => !initialPlayerIds.has(p.id)).length;
  }, [plannedSquad, initialPlayerIds]);

  const freeTransfers =
    stats?.ft_available ?? stats?.ftAvailable ?? stats?.freeTransfers ?? 1;
  const hitCost = Math.max(0, transfersMade - freeTransfers) * 4;

  // Starting XI and Bench split
  const startingXI = useMemo(() => {
    return plannedSquad.filter((p) => !p.isBench);
  }, [plannedSquad]);

  const benchPlayers = useMemo(() => {
    return plannedSquad.filter((p) => p.isBench);
  }, [plannedSquad]);

  const defs = startingXI.filter((p) => p.position === "DEF");
  const mids = startingXI.filter((p) => p.position === "MID");
  const fwds = startingXI.filter((p) => p.position === "FWD");
  const gkps = startingXI.filter((p) => p.position === "GKP");

  const templateScore = useMemo(() => {
    return calculateTemplateOverlap(startingXI);
  }, [startingXI]);

  // Reset function
  const handleReset = () => {
    setPlannedSquad(initialPlayers);
    setCaptainId(initialCaptainId || initialPlayers[0]?.id || "");
    setViceCaptainId(initialViceCaptainId || initialPlayers[1]?.id || "");
    setSwappingPlayerId(null);
    setActivePlayerSlot(null);
    setIsActionSheetOpen(false);
    setIsMarketOpen(false);
    setSwapError(null);
  };

  // Captaincy toggles
  const handleToggleCaptain = (playerId: string) => {
    if (captainId === playerId) {
      setCaptainId(viceCaptainId);
      setViceCaptainId(playerId);
    } else {
      setCaptainId(playerId);
      if (viceCaptainId === playerId) {
        const nextVice = startingXI.find((p) => p.id !== playerId)?.id || "";
        setViceCaptainId(nextVice);
      }
    }
  };

  // Click on Player Card opens Action Sheet
  const handlePlayerCardClick = (player: Player) => {
    if (swappingPlayerId) {
      handleCompleteSwap(player);
    } else {
      setActivePlayerSlot(player);
      setIsActionSheetOpen(true);
    }
  };

  // Swap mechanism
  const handleInitiateSwap = (player: Player) => {
    setSwapError(null);
    setSwappingPlayerId(player.id);
  };

  const handleCompleteSwap = (targetPlayer: Player) => {
    if (!swappingPlayerId) return;

    if (swappingPlayerId === targetPlayer.id) {
      setSwappingPlayerId(null);
      return;
    }

    const playerA = plannedSquad.find((p) => p.id === swappingPlayerId);
    const playerB = targetPlayer;

    if (!playerA) {
      setSwappingPlayerId(null);
      return;
    }

    const aIsBench = playerA.isBench;
    const bIsBench = playerB.isBench;

    if (playerA.position === "GKP" || playerB.position === "GKP") {
      if (playerA.position !== playerB.position) {
        setSwapError("Goalkeepers can only be swapped with Goalkeepers.");
        setTimeout(() => setSwapError(null), 3000);
        setSwappingPlayerId(null);
        return;
      }
    }

    if (aIsBench !== bIsBench) {
      const startingPosCounts = {
        DEF: defs.length,
        MID: mids.length,
        FWD: fwds.length,
      };

      const outPos = (aIsBench ? playerB : playerA).position as "DEF" | "MID" | "FWD";
      const inPos = (aIsBench ? playerA : playerB).position as "DEF" | "MID" | "FWD";

      if (outPos !== inPos && startingPosCounts[outPos] !== undefined && startingPosCounts[inPos] !== undefined) {
        const nextCountOut = startingPosCounts[outPos] - 1;
        const nextCountIn = startingPosCounts[inPos] + 1;

        if (outPos === "DEF" && nextCountOut < 3) {
          setSwapError("Invalid formation: Minimum 3 defenders required.");
          setTimeout(() => setSwapError(null), 3000);
          setSwappingPlayerId(null);
          return;
        }
        if (outPos === "FWD" && nextCountOut < 1) {
          setSwapError("Invalid formation: Minimum 1 forward required.");
          setTimeout(() => setSwapError(null), 3000);
          setSwappingPlayerId(null);
          return;
        }
        if (inPos === "DEF" && nextCountIn > 5) {
          setSwapError("Invalid formation: Maximum 5 defenders allowed.");
          setTimeout(() => setSwapError(null), 3000);
          setSwappingPlayerId(null);
          return;
        }
        if (inPos === "MID" && nextCountIn > 5) {
          setSwapError("Invalid formation: Maximum 5 midfielders allowed.");
          setTimeout(() => setSwapError(null), 3000);
          setSwappingPlayerId(null);
          return;
        }
        if (inPos === "FWD" && nextCountIn > 3) {
          setSwapError("Invalid formation: Maximum 3 forwards allowed.");
          setTimeout(() => setSwapError(null), 3000);
          setSwappingPlayerId(null);
          return;
        }
      }
    }

    setPlannedSquad((prev) =>
      prev.map((p) => {
        if (p.id === playerA.id) {
          return {
            ...p,
            isBench: bIsBench,
            benchOrder: bIsBench ? playerB.benchOrder : undefined,
          };
        }
        if (p.id === playerB.id) {
          return {
            ...p,
            isBench: aIsBench,
            benchOrder: aIsBench ? playerA.benchOrder : undefined,
          };
        }
        return p;
      })
    );

    setSwappingPlayerId(null);
  };

  // Replacement selection from market
  const handleSelectMarketPlayer = (inPlayer: Player) => {
    if (!activePlayerSlot) return;
    setSwapError(null);

    setPlannedSquad((prev) =>
      prev.map((p) => {
        if (p.id === activePlayerSlot.id) {
          return {
            ...inPlayer,
            isBench: activePlayerSlot.isBench,
            benchOrder: activePlayerSlot.benchOrder,
            isCaptain: captainId === activePlayerSlot.id,
            isViceCaptain: viceCaptainId === activePlayerSlot.id,
          };
        }
        return p;
      })
    );

    if (captainId === activePlayerSlot.id) {
      setCaptainId(inPlayer.id);
    }
    if (viceCaptainId === activePlayerSlot.id) {
      setViceCaptainId(inPlayer.id);
    }

    setIsMarketOpen(false);
    setActivePlayerSlot(null);
  };

  return (
    <div className="w-full space-y-4 pb-24 animate-fade-in select-none">
      {/* 1. Official FPL-Style Action Sheet */}
      <PlannerActionSheet
        player={activePlayerSlot}
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onReplace={(player) => {
          setActivePlayerSlot(player);
          setIsActionSheetOpen(false);
          setIsMarketOpen(true);
        }}
        onShowInfo={(player) => setDetailPlayer(player)}
      />

      {/* 2. Full-Screen Player Selection Market */}
      <PlayerSelectionMarket
        outPlayer={activePlayerSlot}
        currentBank={calculatedBank}
        freeTransfers={freeTransfers}
        currentSquad={plannedSquad}
        isOpen={isMarketOpen}
        onClose={() => {
          setIsMarketOpen(false);
          setActivePlayerSlot(null);
        }}
        onSelect={handleSelectMarketPlayer}
      />

      {/* 3. Detailed Stats Modal */}
      {detailPlayer && (
        <PlayerModal
          player={detailPlayer}
          isOpen={!!detailPlayer}
          onClose={() => setDetailPlayer(null)}
          onDiscuss={(player) => {
            setDetailPlayer(null);
            if (onOpenChatWithPrompt) {
              onOpenChatWithPrompt(
                `Tell me about ${player.webName || player.fullName} (${player.teamShort || player.team}). How do their underlying stats look?`
              );
            }
          }}
        />
      )}

      {/* EO Explanation Modal */}
      {showEOInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="bg-[#0D1110] border border-[#1E2421] w-full max-w-sm rounded-sm p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2421]">
              <span className="text-xs font-bold font-mono text-[#F1F3EF] uppercase tracking-wider">
                Effective Ownership (EO / xEO)
              </span>
              <button
                onClick={() => setShowEOInfoModal(false)}
                className="p-1 rounded-sm text-[#7F8983] hover:text-[#F1F3EF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-[#7F8983] space-y-2 leading-relaxed font-sans">
              <p>
                <strong className="text-[#F1F3EF]">Effective Ownership (EO)</strong> represents the total percentage of active teams gaining points from a player:
              </p>
              <div className="p-2 rounded-sm bg-[#111614] border border-[#1E2421] font-mono text-[11px] text-[#16C784]">
                EO = Start% + Captain% + (2 × TripleCap%)
              </div>
              <p>
                If a player has <span className="text-[#F1F3EF] font-mono">140% EO</span>, owning them without captaincy leaves you with negative rank delta when they score.
              </p>
            </div>
            <button
              onClick={() => setShowEOInfoModal(false)}
              className="w-full py-2 rounded-sm bg-[#16C784] text-[#070908] text-xs font-bold uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 4. Strong Information Hierarchy: Analytical Planner Workspace Header */}
      <div className="space-y-3 pb-3 border-b border-[#1E2421]">
        {/* Title & Gameweek Navigation */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-[#7F8983]">
              PLANNER
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#F1F3EF] tracking-tight">
                GW{plannedGW}
              </span>
              <span className="text-xs font-mono font-bold text-[#16C784] uppercase tracking-wider">
                {freeTransfers} FT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={plannedGW <= currentGW}
              onClick={() => setPlannedGW((prev) => Math.max(currentGW, prev - 1))}
              aria-label="Previous Gameweek"
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-sm bg-[#0D1110] border border-[#1E2421] text-[#7F8983] hover:text-[#F1F3EF] disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={plannedGW >= 38}
              onClick={() => setPlannedGW((prev) => Math.min(38, prev + 1))}
              aria-label="Next Gameweek"
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-sm bg-[#0D1110] border border-[#1E2421] text-[#7F8983] hover:text-[#F1F3EF] disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-[#0D1110] border border-[#1E2421] text-xs font-mono text-[#7F8983] hover:text-[#F1F3EF] transition ml-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Ledger Statistics Row: Flat, Stark, Tabular numbers directly on page */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#1E2421] text-xs font-mono">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#7F8983] block">TRANSFERS</span>
            <span className="text-sm sm:text-base font-bold text-[#F1F3EF] tabular-nums">
              {transfersMade} <span className="text-[10px] font-normal text-[#7F8983]">/ {freeTransfers} FT</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#7F8983] block">BANK</span>
            <span className={`text-sm sm:text-base font-bold tabular-nums ${calculatedBank < 0 ? "text-[#E05252]" : "text-[#16C784]"}`}>
              £{calculatedBank.toFixed(1)}m
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#7F8983] block">HITS</span>
            <span className={`text-sm sm:text-base font-bold tabular-nums ${hitCost > 0 ? "text-[#D6A83D]" : "text-[#F1F3EF]"}`}>
              {hitCost > 0 ? `-${hitCost}` : "0"}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#7F8983] block">TEMPLATE</span>
            <span className="text-sm sm:text-base font-bold text-[#F1F3EF] tabular-nums">
              {templateScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Sample Tier Selector & Action Controls */}
      <div className="flex items-center justify-between py-1 px-0.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#7F8983]">Sample:</span>
          <select
            value={sampleTier}
            onChange={(e) => setSampleTier(e.target.value as SampleTier)}
            className="bg-[#0D1110] border border-[#1E2421] text-xs font-mono text-[#F1F3EF] rounded-sm px-2 py-1 focus:outline-none focus:border-[#16C784]"
          >
            {SAMPLE_TIER_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowEOInfoModal(true)}
          className="p-1 text-[#7F8983] hover:text-[#F1F3EF] transition-colors"
          title="Explain EO / xEO"
          aria-label="Explain Effective Ownership"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Swap Notification / Error Banner */}
      {swappingPlayerId && (
        <div className="p-2 rounded-sm bg-[#111614] border border-[#16C784]/40 text-[#16C784] text-xs font-mono flex items-center justify-between animate-fade-in">
          <span>Tap another player to complete swap</span>
          <button
            onClick={() => setSwappingPlayerId(null)}
            className="text-[11px] underline text-[#16C784]"
          >
            Cancel
          </button>
        </div>
      )}

      {swapError && (
        <div className="p-2 rounded-sm bg-[#1A0E10] border border-[#E05252]/40 text-[#fca5a5] text-xs font-mono flex items-center justify-between animate-fade-in">
          <span>{swapError}</span>
          <button
            onClick={() => setSwapError(null)}
            className="text-[11px] underline text-[#E05252]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive Tactical Pitch */}
      <div className="relative w-full max-w-2xl mx-auto rounded-sm overflow-hidden border border-[#1E2421] bg-[#0A0E0C]">
        {/* Grid Background */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Vector Pitch Markings */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-15"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="12"
            y="12"
            width="calc(100% - 24px)"
            height="calc(100% - 24px)"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
          />
          <line
            x1="12"
            y1="50%"
            x2="calc(100% - 12px)"
            y2="50%"
            stroke="#ffffff"
            strokeWidth="1"
          />
          <circle
            cx="50%"
            cy="50%"
            r="44"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
          />
        </svg>

        {/* Starting Formation Rows */}
        <div className="relative z-10 w-full flex flex-col justify-between py-3 md:py-4 h-[520px] sm:h-[560px] md:h-[590px]">
          {/* Formation Label (Bottom Left) */}
          <div className="absolute bottom-2 left-3 z-20">
            <span className="text-[10px] md:text-xs font-mono text-[#7F8983] uppercase tracking-wider bg-[#070908] border border-[#1E2421] rounded-sm px-1.5 py-0.5">
              {defs.length}-{mids.length}-{fwds.length}
            </span>
          </div>

          {/* Goalkeepers Line */}
          <div className="flex justify-around items-center px-4 gap-2 md:gap-6">
            {gkps.map((p) => (
              <PlannerPlayerCard
                key={p.id}
                player={p}
                isCaptain={captainId === p.id}
                isViceCaptain={viceCaptainId === p.id}
                isSwapping={swappingPlayerId === p.id}
                sampleTier={sampleTier}
                userRank={stats?.overallRank}
                onCardClick={() => handlePlayerCardClick(p)}
                onToggleCaptain={() => handleToggleCaptain(p.id)}
                onSwap={() => handleInitiateSwap(p)}
                onReplace={() => {
                  setActivePlayerSlot(p);
                  setIsMarketOpen(true);
                }}
              />
            ))}
          </div>

          {/* Defenders Line */}
          <div className="flex justify-around items-center px-2 md:px-4 gap-1.5 sm:gap-3 md:gap-6">
            {defs.map((p) => (
              <PlannerPlayerCard
                key={p.id}
                player={p}
                isCaptain={captainId === p.id}
                isViceCaptain={viceCaptainId === p.id}
                isSwapping={swappingPlayerId === p.id}
                sampleTier={sampleTier}
                userRank={stats?.overallRank}
                onCardClick={() => handlePlayerCardClick(p)}
                onToggleCaptain={() => handleToggleCaptain(p.id)}
                onSwap={() => handleInitiateSwap(p)}
                onReplace={() => {
                  setActivePlayerSlot(p);
                  setIsMarketOpen(true);
                }}
              />
            ))}
          </div>

          {/* Midfielders Line */}
          <div className="flex justify-around items-center px-2 md:px-4 gap-1.5 sm:gap-3 md:gap-6">
            {mids.map((p) => (
              <PlannerPlayerCard
                key={p.id}
                player={p}
                isCaptain={captainId === p.id}
                isViceCaptain={viceCaptainId === p.id}
                isSwapping={swappingPlayerId === p.id}
                sampleTier={sampleTier}
                userRank={stats?.overallRank}
                onCardClick={() => handlePlayerCardClick(p)}
                onToggleCaptain={() => handleToggleCaptain(p.id)}
                onSwap={() => handleInitiateSwap(p)}
                onReplace={() => {
                  setActivePlayerSlot(p);
                  setIsMarketOpen(true);
                }}
              />
            ))}
          </div>

          {/* Forwards Line */}
          <div className="flex justify-around items-center px-4 md:px-6 gap-2 md:gap-6 pb-2">
            {fwds.map((p) => (
              <PlannerPlayerCard
                key={p.id}
                player={p}
                isCaptain={captainId === p.id}
                isViceCaptain={viceCaptainId === p.id}
                isSwapping={swappingPlayerId === p.id}
                sampleTier={sampleTier}
                userRank={stats?.overallRank}
                onCardClick={() => handlePlayerCardClick(p)}
                onToggleCaptain={() => handleToggleCaptain(p.id)}
                onSwap={() => handleInitiateSwap(p)}
                onReplace={() => {
                  setActivePlayerSlot(p);
                  setIsMarketOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Substitutes Bench Area */}
      <div className="w-full max-w-2xl mx-auto bg-[#0D1110] border border-[#1E2421] rounded-sm p-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#1E2421] mb-2 px-1 text-xs">
          <span className="text-[10px] md:text-xs uppercase tracking-wider font-semibold text-[#7F8983]">
            Planned Substitutes
          </span>
          <span className="text-[10px] md:text-xs text-[#7F8983] font-mono">
            Bench order
          </span>
        </div>

        <div className="flex items-center justify-around px-1 gap-2 md:gap-6">
          {benchPlayers.map((p, idx) => (
            <div key={p.id} className="flex flex-col items-center">
              <PlannerPlayerCard
                player={p}
                isBench
                benchLabel={idx === 0 ? "GKP" : `Sub ${idx}`}
                isCaptain={captainId === p.id}
                isViceCaptain={viceCaptainId === p.id}
                isSwapping={swappingPlayerId === p.id}
                sampleTier={sampleTier}
                userRank={stats?.overallRank}
                onCardClick={() => handlePlayerCardClick(p)}
                onToggleCaptain={() => handleToggleCaptain(p.id)}
                onSwap={() => handleInitiateSwap(p)}
                onReplace={() => {
                  setActivePlayerSlot(p);
                  setIsMarketOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Analyst Strategy Consultation Shortcut */}
      {onOpenChatWithPrompt && (
        <div className="p-3 rounded-sm bg-[#0D1110] border border-[#1E2421] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#F1F3EF] block">
              Evaluate Transfer Strategy
            </span>
            <p className="text-[11px] text-[#7F8983] font-mono">
              Validate planned squad for GW{plannedGW} with Touchline Analyst
            </p>
          </div>
          <button
            onClick={() => {
              const transferSummary = plannedSquad
                .filter((p) => !initialPlayerIds.has(p.id))
                .map((p) => p.webName)
                .join(", ");
              const prompt = transferSummary
                ? `I am planning ${transfersMade} transfer(s) for GW${plannedGW}: bringing in [${transferSummary}]. Remaining bank is £${calculatedBank.toFixed(1)}m. How does this transfer plan evaluate against expected points and effective ownership?`
                : `Evaluate my squad setup for GW${plannedGW}. Who are my best transfer targets with £${calculatedBank.toFixed(1)}m in the bank?`;
              onOpenChatWithPrompt(prompt);
            }}
            className="px-3.5 py-1.5 rounded-sm text-xs font-bold font-mono text-[#070908] bg-[#16C784] hover:bg-[#13ab71] transition whitespace-nowrap ml-2"
          >
            Ask Analyst →
          </button>
        </div>
      )}
    </div>
  );
};

interface PlannerPlayerCardProps {
  player: Player;
  isBench?: boolean;
  benchLabel?: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isSwapping?: boolean;
  sampleTier: SampleTier;
  userRank?: number;
  onCardClick: () => void;
  onToggleCaptain: () => void;
  onSwap: () => void;
  onReplace: () => void;
}

const PlannerPlayerCard: React.FC<PlannerPlayerCardProps> = ({
  player,
  isBench = false,
  benchLabel,
  isCaptain = false,
  isViceCaptain = false,
  isSwapping = false,
  sampleTier,
  userRank,
  onCardClick,
  onToggleCaptain,
  onSwap,
  onReplace,
}) => {
  const eoResult = calculateXEO(player, sampleTier, userRank);
  const fixtureText = `${player.currentFixture?.opponent || "PL"} (${player.currentFixture?.isHome ? "H" : "A"})`;

  return (
    <div
      onClick={onCardClick}
      className={`relative flex flex-col items-center justify-between select-none cursor-pointer transition-all duration-100 active:scale-95 ${
        isBench ? "w-[76px] sm:w-[84px] md:w-[90px]" : "w-[80px] sm:w-[88px] md:w-[96px]"
      } ${
        isSwapping ? "ring-2 ring-[#16C784] scale-105" : ""
      }`}
    >
      {/* Top Action Header: C/V toggle on left, Swap and Replace on right */}
      <div className="absolute -top-1.5 -left-1 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCaptain();
          }}
          title={isCaptain ? "Captain (2x)" : isViceCaptain ? "Vice Captain" : "Set Captain"}
          aria-label={isCaptain ? "Captain" : isViceCaptain ? "Vice Captain" : "Set Captain"}
          className={`flex items-center justify-center min-w-[20px] h-[20px] rounded-sm text-[9.5px] font-bold font-mono transition-transform active:scale-95 shadow-sm ${
            isCaptain
              ? "bg-[#16C784] text-[#070908] font-black"
              : isViceCaptain
              ? "bg-[#111614] text-[#F1F3EF] border border-[#1E2421]"
              : "bg-[#070908] text-[#7F8983] border border-[#1E2421] hover:text-[#F1F3EF]"
          }`}
        >
          {isCaptain ? "C" : isViceCaptain ? "V" : "c"}
        </button>
      </div>

      {/* Top Right Quick Actions */}
      <div className="absolute -top-1.5 -right-1 z-20 flex items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSwap();
          }}
          title="Swap player"
          aria-label="Swap player"
          className="min-w-[20px] h-[20px] flex items-center justify-center rounded-sm bg-[#0D1110] text-[#7F8983] hover:text-[#F1F3EF] border border-[#1E2421] transition-transform active:scale-95"
        >
          <ArrowLeftRight className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReplace();
          }}
          title="Replace Player"
          aria-label="Replace player"
          className="min-w-[20px] h-[20px] flex items-center justify-center rounded-sm bg-[#0D1110] text-[#E05252] hover:text-[#ff7878] border border-[#1E2421] transition-transform active:scale-95"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Bench Priority Tag */}
      {isBench && benchLabel && (
        <div className="absolute top-4 -right-1 z-20">
          <span className="px-1 py-0.2 text-[8.5px] font-mono font-medium rounded-sm bg-[#070908] text-[#7F8983] border border-[#1E2421]">
            {benchLabel}
          </span>
        </div>
      )}

      {/* Jersey Icon */}
      <div className="relative my-0.5 flex items-center justify-center mt-1">
        <JerseyIcon
          teamShort={player.teamShort}
          isGK={player.position === "GKP"}
          size={isBench ? 34 : 40}
          priority={!isBench}
        />
      </div>

      {/* Player Info Badge */}
      <div className="w-full flex flex-col items-center mt-0.5 bg-[#0D1110] border border-[#1E2421] rounded-sm px-1 py-0.5 text-center">
        {/* Web Name */}
        <p className="text-[11px] sm:text-[11.5px] font-semibold text-[#F1F3EF] truncate leading-tight w-full">
          {player.webName}
        </p>

        {/* Fixture & Price */}
        <div className="flex items-center justify-center gap-1 text-[9.5px] font-mono text-[#7F8983] mt-0.5 leading-none">
          <span>{fixtureText}</span>
          <span className="text-[#1E2421]">·</span>
          <span className="text-[#16C784] font-semibold tabular-nums">£{player.price.toFixed(1)}m</span>
        </div>

        {/* xEO Badge */}
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
