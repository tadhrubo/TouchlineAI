"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Player, TeamStats } from "@/types/fpl";
import { JerseyIcon } from "../fpl/JerseyIcon";
import { PlayerModal } from "../fpl/PlayerModal";
import { PlannerActionSheet } from "./PlannerActionSheet";
import { PlayerSelectionMarket } from "./PlayerSelectionMarket";
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
  Info,
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

  const freeTransfers = stats?.freeTransfers || 1;
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

  // Click on a Player Card
  const handlePlayerCardClick = (player: Player) => {
    if (swappingPlayerId) {
      handleInitiateSwap(player);
      return;
    }
    setActivePlayerSlot(player);
    setIsActionSheetOpen(true);
  };

  // Swap logic
  const handleInitiateSwap = (player: Player) => {
    setSwapError(null);
    if (!swappingPlayerId) {
      setSwappingPlayerId(player.id);
      return;
    }

    if (swappingPlayerId === player.id) {
      setSwappingPlayerId(null);
      return;
    }

    const playerA = plannedSquad.find((p) => p.id === swappingPlayerId);
    const playerB = player;

    if (!playerA || !playerB) {
      setSwappingPlayerId(null);
      return;
    }

    const aIsBench = !!playerA.isBench;
    const bIsBench = !!playerB.isBench;

    if (aIsBench !== bIsBench) {
      if (playerA.position === "GKP" && playerB.position !== "GKP") {
        setSwapError("Goalkeepers can only be swapped with a substitute Goalkeeper.");
        setSwappingPlayerId(null);
        return;
      }
      if (playerB.position === "GKP" && playerA.position !== "GKP") {
        setSwapError("Goalkeepers can only be swapped with a substitute Goalkeeper.");
        setSwappingPlayerId(null);
        return;
      }

      const simulatedStarters = startingXI.map((p) =>
        p.id === (aIsBench ? playerB.id : playerA.id) ? (aIsBench ? playerA : playerB) : p
      );

      const simGKP = simulatedStarters.filter((p) => p.position === "GKP").length;
      const simDEF = simulatedStarters.filter((p) => p.position === "DEF").length;
      const simMID = simulatedStarters.filter((p) => p.position === "MID").length;
      const simFWD = simulatedStarters.filter((p) => p.position === "FWD").length;

      if (simGKP !== 1 || simDEF < 3 || simMID < 2 || simFWD < 1) {
        setSwapError(`Illegal formation (${simDEF}-${simMID}-${simFWD}). Minimum 3 DEF, 2 MID, 1 FWD required.`);
        setSwappingPlayerId(null);
        return;
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

    const newBank = Number(
      (calculatedBank + activePlayerSlot.price - inPlayer.price).toFixed(1)
    );

    if (newBank < 0) {
      setSwapError(
        `Cannot afford ${inPlayer.webName}. Requires an additional £${Math.abs(newBank).toFixed(1)}m in the bank.`
      );
      return;
    }

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
    <div className="w-full space-y-3 pb-24 animate-fade-in select-none">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0B0E14] border border-white/[0.08] w-full max-w-sm rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-bold font-mono text-neutral-100 uppercase tracking-wider">
                Effective Ownership (EO / xEO)
              </span>
              <button
                onClick={() => setShowEOInfoModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-neutral-300 space-y-2 leading-relaxed font-sans">
              <p>
                <strong className="text-neutral-100">Effective Ownership (EO)</strong> represents the total percentage of active teams gaining points from a player:
              </p>
              <div className="p-2 rounded bg-neutral-900/80 border border-white/[0.06] font-mono text-[11px] text-emerald-400">
                EO = Start% + Captain% + (2 × TripleCap%)
              </div>
              <p>
                If a player has <span className="text-neutral-100 font-mono">140% EO</span>, owning them without captaincy leaves you with negative gain when they score.
              </p>
              <p>
                <strong className="text-neutral-100">xEO (Predicted EO)</strong> simulates expected captaincy concentration and template shifts for the upcoming Gameweek.
              </p>
            </div>
            <button
              onClick={() => setShowEOInfoModal(false)}
              className="w-full py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Gameweek Navigation & Controls Bar */}
      <div className="bg-neutral-900/60 border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            disabled={plannedGW <= currentGW}
            onClick={() => setPlannedGW((prev) => Math.max(currentGW, prev - 1))}
            className="p-1.5 rounded-md bg-neutral-900 border border-white/[0.06] text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[100px]">
            <span className="text-xs font-bold font-mono text-neutral-100 tracking-tight block">
              Gameweek {plannedGW}
            </span>
            <span className="text-[9.5px] font-mono text-neutral-500">
              {plannedGW === currentGW ? "Current GW" : `GW +${plannedGW - currentGW}`}
            </span>
          </div>
          <button
            disabled={plannedGW >= 38}
            onClick={() => setPlannedGW((prev) => Math.min(38, prev + 1))}
            className="p-1.5 rounded-md bg-neutral-900 border border-white/[0.06] text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900/90 border border-white/[0.06] text-xs font-mono text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Live Planning Metrics Summary Bar */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-neutral-900/40 border border-white/[0.06]">
          <span className="text-[9.5px] font-mono uppercase tracking-wider text-neutral-500 block">
            Transfers
          </span>
          <div className="text-sm font-bold font-mono text-neutral-100 mt-0.5">
            {transfersMade} <span className="text-neutral-500 font-normal">/ {freeTransfers} FT</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-neutral-900/40 border border-white/[0.06]">
          <span className="text-[9.5px] font-mono uppercase tracking-wider text-neutral-500 block">
            Bank
          </span>
          <div
            className={`text-sm font-bold font-mono mt-0.5 ${
              calculatedBank < 0 ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            £{calculatedBank.toFixed(1)}m
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-neutral-900/40 border border-white/[0.06]">
          <span className="text-[9.5px] font-mono uppercase tracking-wider text-neutral-500 block">
            Cost / Hits
          </span>
          <div
            className={`text-sm font-bold font-mono mt-0.5 ${
              hitCost > 0 ? "text-amber-400" : "text-neutral-300"
            }`}
          >
            {hitCost > 0 ? `-${hitCost} pts` : "0 pts"}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-neutral-900/40 border border-white/[0.06]">
          <span className="text-[9.5px] font-mono uppercase tracking-wider text-neutral-500 block">
            Template
          </span>
          <div className="text-sm font-bold font-mono text-neutral-100 mt-0.5">
            {templateScore}%
          </div>
        </div>
      </div>

      {/* Sample Tier Selector */}
      <div className="p-2.5 rounded-xl bg-neutral-900/50 border border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-neutral-400">Choose Sample:</span>
          <select
            value={sampleTier}
            onChange={(e) => setSampleTier(e.target.value as SampleTier)}
            className="bg-neutral-900 border border-white/[0.08] text-xs font-mono text-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-neutral-600"
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
          className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
          title="Explain EO / xEO"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Swap Notification / Error Banner */}
      {swappingPlayerId && (
        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between animate-fade-in">
          <span>Tap another player to complete swap</span>
          <button
            onClick={() => setSwappingPlayerId(null)}
            className="text-[11px] underline text-emerald-400"
          >
            Cancel
          </button>
        </div>
      )}

      {swapError && (
        <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs font-mono flex items-center justify-between animate-fade-in">
          <span>{swapError}</span>
          <button
            onClick={() => setSwapError(null)}
            className="text-[11px] underline text-rose-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive Tactical Pitch */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0d121c]">
        {/* Grid Background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Vector Pitch Markings */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
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
        <div className="relative z-10 w-full flex flex-col justify-between py-3 h-[520px] sm:h-[560px]">
          {/* Formation Label (Bottom Left) */}
          <div className="absolute bottom-2 left-3 z-20">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider bg-neutral-900/80 border border-white/[0.06] rounded px-1.5 py-0.5">
              {defs.length}-{mids.length}-{fwds.length}
            </span>
          </div>

          {/* Goalkeepers Line */}
          <div className="flex justify-around items-center px-4">
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
          <div className="flex justify-around items-center px-2">
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
          <div className="flex justify-around items-center px-2">
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
          <div className="flex justify-around items-center px-4">
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
      <div className="w-full bg-neutral-900/40 border border-white/[0.06] rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
            Substitutes Bench
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            Tap player for Action Sheet
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-1">
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

      {/* AI Strategy Consultation Shortcut */}
      {onOpenChatWithPrompt && (
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-white/[0.06] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-neutral-200 block">
              Evaluate Transfer Strategy
            </span>
            <p className="text-[11px] text-neutral-400 font-mono">
              Ask Touchline AI to validate your planned squad for GW{plannedGW}
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
            className="py-1.5 px-3 rounded-lg text-xs font-medium font-mono text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors whitespace-nowrap ml-2"
          >
            Ask AI
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
      className={`relative flex flex-col items-center justify-between select-none cursor-pointer transition-all duration-150 active:scale-95 ${
        isBench ? "w-[76px] sm:w-[84px]" : "w-[80px] sm:w-[88px]"
      } ${
        isSwapping ? "ring-2 ring-emerald-400 scale-105" : ""
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
          className={`flex items-center justify-center min-w-[18px] h-[18px] rounded-sm text-[9px] font-bold font-mono transition-transform active:scale-95 shadow-sm ${
            isCaptain
              ? "bg-neutral-100 text-neutral-950 font-black"
              : isViceCaptain
              ? "bg-neutral-800 text-neutral-300 border border-white/[0.15]"
              : "bg-neutral-950/80 text-neutral-500 border border-white/[0.08] hover:text-neutral-300"
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
          className="p-1 rounded-sm bg-neutral-900/90 text-neutral-400 hover:text-neutral-200 border border-white/[0.08] shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeftRight className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReplace();
          }}
          title="Replace Player (Market)"
          className="p-1 rounded-sm bg-neutral-900/90 text-rose-400 hover:text-rose-300 border border-white/[0.08] shadow-sm transition-transform active:scale-95"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </div>

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
      <div className="w-full flex flex-col items-center mt-0.5 bg-neutral-950/85 border border-white/[0.08] rounded-md px-1 py-0.5 text-center backdrop-blur-sm shadow-md">
        {/* Web Name */}
        <p className="text-[11px] font-medium text-neutral-200 truncate leading-tight w-full">
          {player.webName}
        </p>

        {/* Fixture & Price */}
        <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-neutral-400 mt-0.5 leading-none">
          <span>{fixtureText}</span>
          <span className="text-neutral-600">·</span>
          <span className="text-emerald-400 font-medium">£{player.price.toFixed(1)}m</span>
        </div>

        {/* xEO Badge */}
        {eoResult && (
          <div className="w-full mt-0.5 pt-0.5 border-t border-white/[0.04]">
            {sampleTier === "TOP_10K_NEAR_U" && eoResult.top10k != null && eoResult.nearU != null ? (
              <div className="flex w-full items-center justify-between px-0.5 text-[8.5px] sm:text-[9.5px] font-mono leading-none tracking-tight">
                <span className="text-neutral-200" title="Top 10k EO">
                  {eoResult.top10k}%
                </span>
                <span className="text-neutral-500" title="Near You EO">
                  {eoResult.nearU}%
                </span>
              </div>
            ) : (
              <div className="w-full text-center text-[8.5px] sm:text-[9.5px] font-mono text-neutral-400 leading-none">
                {eoResult.displayText}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
