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

  const initialPlayerIds = useMemo(() => {
    return new Set(initialPlayers.map((p) => p.id));
  }, [initialPlayers]);

  const transfersMade = useMemo(() => {
    return plannedSquad.filter((p) => !initialPlayerIds.has(p.id)).length;
  }, [plannedSquad, initialPlayerIds]);

  const freeTransfers =
    stats?.ft_available ?? stats?.ftAvailable ?? stats?.freeTransfers ?? 1;

  const extraTransfers = Math.max(0, transfersMade - freeTransfers);
  const hitCost = extraTransfers * 4;

  const templateScore = useMemo(() => {
    return calculateTemplateOverlap(plannedSquad);
  }, [plannedSquad]);

  // Position partitions
  const gkps = plannedSquad.filter((p) => p.position === "GKP" && !p.isBench);
  const defs = plannedSquad.filter((p) => p.position === "DEF" && !p.isBench);
  const mids = plannedSquad.filter((p) => p.position === "MID" && !p.isBench);
  const fwds = plannedSquad.filter((p) => p.position === "FWD" && !p.isBench);
  const benchPlayers = plannedSquad.filter((p) => p.isBench);

  // Handlers
  const handleReset = () => {
    setPlannedSquad(initialPlayers);
    setCaptainId(initialCaptainId || initialPlayers[0]?.id || "");
    setViceCaptainId(initialViceCaptainId || initialPlayers[1]?.id || "");
    setSwappingPlayerId(null);
    setSwapError(null);
  };

  const handleToggleCaptain = (playerId: string) => {
    if (captainId === playerId) {
      setCaptainId(viceCaptainId);
      setViceCaptainId("");
    } else if (viceCaptainId === playerId) {
      setViceCaptainId("");
    } else {
      setViceCaptainId(captainId);
      setCaptainId(playerId);
    }
  };

  const handlePlayerCardClick = (player: Player) => {
    if (swappingPlayerId) {
      handleCompleteSwap(player);
    } else {
      setActivePlayerSlot(player);
      setIsActionSheetOpen(true);
    }
  };

  const handleInitiateSwap = (player: Player) => {
    setSwappingPlayerId(player.id);
    setSwapError(null);
  };

  const handleCompleteSwap = (targetPlayer: Player) => {
    if (!swappingPlayerId || swappingPlayerId === targetPlayer.id) {
      setSwappingPlayerId(null);
      return;
    }

    const sourcePlayer = plannedSquad.find((p) => p.id === swappingPlayerId);
    if (!sourcePlayer) {
      setSwappingPlayerId(null);
      return;
    }

    // Goalkeeper swap validity check
    if (sourcePlayer.position === "GKP" && targetPlayer.position !== "GKP") {
      setSwapError("Goalkeepers can only be swapped with Goalkeepers.");
      setTimeout(() => setSwapError(null), 3000);
      setSwappingPlayerId(null);
      return;
    }
    if (targetPlayer.position === "GKP" && sourcePlayer.position !== "GKP") {
      setSwapError("Outfield players cannot be swapped into the GK position.");
      setTimeout(() => setSwapError(null), 3000);
      setSwappingPlayerId(null);
      return;
    }

    // Formation verification if crossing starter/bench boundary
    if (sourcePlayer.isBench !== targetPlayer.isBench) {
      const prospectiveStarters = plannedSquad
        .filter((p) => !p.isBench)
        .map((p) => (p.id === sourcePlayer.id ? targetPlayer : p));

      if (sourcePlayer.isBench) {
        const idx = prospectiveStarters.findIndex((p) => p.id === targetPlayer.id);
        if (idx !== -1) prospectiveStarters[idx] = sourcePlayer;
      }

      const dCount = prospectiveStarters.filter((p) => p.position === "DEF").length;
      const mCount = prospectiveStarters.filter((p) => p.position === "MID").length;
      const fCount = prospectiveStarters.filter((p) => p.position === "FWD").length;

      if (dCount < 3 || mCount < 2 || fCount < 1) {
        setSwapError("Invalid formation: Must have at least 3 DEFs, 2 MIDs, and 1 FWD.");
        setTimeout(() => setSwapError(null), 3000);
        setSwappingPlayerId(null);
        return;
      }
    }

    // Execute swap
    setPlannedSquad((prev) =>
      prev.map((p) => {
        if (p.id === sourcePlayer.id) {
          return {
            ...p,
            isBench: targetPlayer.isBench,
            benchOrder: targetPlayer.benchOrder,
          };
        }
        if (p.id === targetPlayer.id) {
          return {
            ...p,
            isBench: sourcePlayer.isBench,
            benchOrder: sourcePlayer.benchOrder,
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
    <div className="w-full space-y-3.5 pb-24 animate-fade-in select-none text-tl-text">
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
          <div className="bg-tl-surface border border-tl-border w-full max-w-sm rounded-sm p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-tl-border">
              <span className="text-xs font-bold font-mono text-tl-text uppercase tracking-wider">
                Effective Ownership (EO / xEO)
              </span>
              <button
                onClick={() => setShowEOInfoModal(false)}
                className="p-1 rounded-sm text-tl-muted hover:text-tl-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-tl-muted space-y-2 leading-relaxed font-sans">
              <p>
                <strong className="text-tl-text">Effective Ownership (EO)</strong> represents the total percentage of active teams gaining points from a player:
              </p>
              <div className="p-2 rounded-sm bg-tl-surface2 border border-tl-border font-mono text-[11px] text-tl-accent">
                EO = Start% + Captain% + (2 × TripleCap%)
              </div>
              <p>
                If a player has <span className="text-tl-text font-mono">140% EO</span>, owning them without captaincy leaves you with negative rank delta when they score.
              </p>
            </div>
            <button
              onClick={() => setShowEOInfoModal(false)}
              className="w-full py-2 rounded-sm bg-tl-accent text-tl-accentContrast text-xs font-bold uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 4. Strong Information Hierarchy: Analytical Planner Workspace Header */}
      <div className="space-y-2.5 pb-2 border-b border-tl-border">
        {/* Title & Gameweek Navigation */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[11px] font-bold font-mono uppercase tracking-widest text-tl-muted">
              PLANNER
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-tl-text tracking-tight">
                GW{plannedGW}
              </span>
              <span className="text-xs font-mono font-bold text-tl-accent uppercase tracking-wider">
                {freeTransfers} FT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={plannedGW <= currentGW}
              onClick={() => setPlannedGW((prev) => Math.max(currentGW, prev - 1))}
              aria-label="Previous Gameweek"
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-sm bg-tl-surface border border-tl-border text-tl-muted hover:text-tl-text disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={plannedGW >= 38}
              onClick={() => setPlannedGW((prev) => Math.min(38, prev + 1))}
              aria-label="Next Gameweek"
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-sm bg-tl-surface border border-tl-border text-tl-muted hover:text-tl-text disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-tl-surface border border-tl-border text-xs font-mono text-tl-muted hover:text-tl-text transition ml-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Ledger Statistics Row: Flat, Stark, Tabular numbers directly on page */}
        <div className="grid grid-cols-4 gap-2 pt-1.5 border-t border-tl-border text-xs font-mono">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-tl-muted opacity-80 block">TRANSFERS</span>
            <span className="text-sm sm:text-base font-bold text-tl-text tabular-nums">
              {transfersMade} <span className="text-[10px] font-normal text-tl-muted">/ {freeTransfers} FT</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-tl-muted opacity-80 block">BANK</span>
            <span className={`text-sm sm:text-base font-bold tabular-nums ${calculatedBank < 0 ? "text-tl-negative" : "text-tl-accent"}`}>
              £{calculatedBank.toFixed(1)}m
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-tl-muted opacity-80 block">HITS</span>
            <span className={`text-sm sm:text-base font-bold tabular-nums ${hitCost > 0 ? "text-tl-warning" : "text-tl-text"}`}>
              {hitCost > 0 ? `-${hitCost}` : "0"}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-tl-muted opacity-80 block">TEMPLATE</span>
            <span className="text-sm sm:text-base font-bold text-tl-text tabular-nums">
              {templateScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Sample Tier Selector & Action Controls */}
      <div className="flex items-center justify-between py-0.5 px-0.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-tl-muted">SAMPLE:</span>
          <select
            value={sampleTier}
            onChange={(e) => setSampleTier(e.target.value as SampleTier)}
            className="bg-tl-surface border border-tl-border text-xs font-mono text-tl-text rounded-sm px-2 py-0.5 focus:outline-none focus:border-tl-accent"
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
          className="p-1 text-tl-muted hover:text-tl-text transition-colors"
          title="Explain EO / xEO"
          aria-label="Explain Effective Ownership"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Swap Notification / Error Banner */}
      {swappingPlayerId && (
        <div className="p-2 rounded-sm bg-tl-surface2 border border-tl-accent/40 text-tl-accent text-xs font-mono flex items-center justify-between animate-fade-in">
          <span>Tap another player to complete swap</span>
          <button
            onClick={() => setSwappingPlayerId(null)}
            className="text-[11px] underline text-tl-accent"
          >
            Cancel
          </button>
        </div>
      )}

      {swapError && (
        <div className="p-2 rounded-sm bg-tl-surface border border-tl-negative text-tl-negative text-xs font-mono animate-fade-in">
          {swapError}
        </div>
      )}

      {/* Main Pitch View */}
      <div className="relative w-full max-w-2xl mx-auto rounded-sm overflow-hidden border border-tl-border bg-[var(--pitch-bg)] select-none transition-colors">
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
          <rect
            x="12"
            y="12"
            width="calc(100% - 24px)"
            height="calc(100% - 24px)"
            fill="none"
            stroke="var(--pitch-line)"
            strokeWidth="1"
          />
          <line
            x1="12"
            y1="50%"
            x2="calc(100% - 12px)"
            y2="50%"
            stroke="var(--pitch-line)"
            strokeWidth="1"
          />
          <circle
            cx="50%"
            cy="50%"
            r="44"
            fill="none"
            stroke="var(--pitch-line)"
            strokeWidth="1"
          />
        </svg>

        {/* Starting Formation Rows */}
        <div className="relative z-10 w-full flex flex-col justify-between py-3 md:py-4 h-[520px] sm:h-[560px] md:h-[590px]">
          {/* Formation Label (Bottom Left) */}
          <div className="absolute bottom-2 left-3 z-20">
            <span className="text-[10px] md:text-xs font-mono text-tl-muted uppercase tracking-wider bg-tl-surface border border-tl-border rounded-sm px-1.5 py-0.5">
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
      <div className="w-full max-w-2xl mx-auto bg-tl-surface border border-tl-border rounded-sm p-3">
        <div className="flex items-center justify-between pb-1.5 border-b border-tl-border mb-2 px-1 text-xs">
          <span className="text-[10px] md:text-xs uppercase tracking-wider font-semibold text-tl-muted">
            Planned Substitutes
          </span>
          <span className="text-[10px] md:text-xs text-tl-muted font-mono">
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

      {/* 5. Analytical Transfer Plan Result Panel (Restructured per Task 5) */}
      <div className="p-3.5 rounded-sm bg-tl-surface border border-tl-border space-y-2">
        <div className="flex items-baseline justify-between border-b border-tl-border pb-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-tl-muted font-semibold block">
              TRANSFER PLAN
            </span>
            <div className="text-sm font-mono font-bold text-tl-text mt-0.5">
              {transfersMade} {transfersMade === 1 ? "move" : "moves"} · £{calculatedBank.toFixed(1)}m bank · {templateScore}% template
            </div>
          </div>
          {onOpenChatWithPrompt && (
            <button
              onClick={() => {
                const transferSummary = plannedSquad
                  .filter((p) => !initialPlayerIds.has(p.id))
                  .map((p) => p.webName)
                  .join(", ");
                const prompt = transferSummary
                  ? `Evaluate my planned transfer strategy for GW${plannedGW}: bringing in [${transferSummary}]. Remaining bank is £${calculatedBank.toFixed(1)}m with ${templateScore}% template overlap. Detail the tactical upside and downside risk.`
                  : `Evaluate my current squad setup for GW${plannedGW}. Who are the highest upside transfer targets with £${calculatedBank.toFixed(1)}m in the bank?`;
                onOpenChatWithPrompt(prompt);
              }}
              className="text-xs font-mono font-semibold text-tl-accent hover:underline flex items-center gap-1"
            >
              Examine model breakdown →
            </button>
          )}
        </div>

        <div className="pt-0.5">
          <span className="text-[11px] font-mono uppercase text-tl-muted tracking-wider block font-semibold">
            Touchline assessment
          </span>
          <p className="text-xs text-tl-text/90 leading-relaxed font-sans mt-1">
            {transfersMade > 0
              ? `Your planned XI improves projected output while adjusting squad balance for GW${plannedGW}. Bank balance of £${calculatedBank.toFixed(1)}m preserves tactical flexibility across upcoming matchdays.`
              : `Your current starting XI aligns with baseline projected output. Evaluate target fixtures to capitalize on upcoming fixture difficulty swings.`}
          </p>
        </div>
      </div>
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
      className={`relative flex flex-col items-center justify-start select-none cursor-pointer transition-all duration-100 active:scale-95 ${
        isBench ? "w-[76px] sm:w-[84px] md:w-[90px]" : "w-[80px] sm:w-[88px] md:w-[96px]"
      } ${
        isSwapping ? "ring-2 ring-tl-accent scale-105" : ""
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
              ? "bg-tl-accent text-tl-accentContrast font-black"
              : isViceCaptain
              ? "bg-tl-surface2 text-tl-text border border-tl-border"
              : "bg-tl-surface text-tl-muted border border-tl-border hover:text-tl-text"
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
          className="min-w-[20px] h-[20px] flex items-center justify-center rounded-sm bg-tl-surface text-tl-muted hover:text-tl-text border border-tl-border transition-transform active:scale-95"
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
          className="min-w-[20px] h-[20px] flex items-center justify-center rounded-sm bg-tl-surface text-tl-negative hover:opacity-80 border border-tl-border transition-transform active:scale-95"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Bench Priority Tag */}
      {isBench && benchLabel && (
        <div className="absolute top-4 -right-1 z-20">
          <span className="px-1 py-0.2 text-[8.5px] font-mono font-medium rounded-sm bg-tl-surface text-tl-muted border border-tl-border">
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

      {/* Looser Editorial Player Stack (No bordered box) */}
      <div className="w-full flex flex-col items-center text-center mt-1">
        {/* Web Name */}
        <p className="text-[11px] sm:text-[12px] font-bold text-tl-text truncate leading-tight w-full tracking-tight">
          {player.webName}
        </p>

        {/* £6.2m · Fixture */}
        <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-tl-muted leading-tight tabular-nums mt-0.5">
          <span>{fixtureText}</span>
          <span className="opacity-40">·</span>
          <span className="text-tl-accent font-semibold">£{player.price.toFixed(1)}m</span>
        </div>

        {/* xEO Badge */}
        {eoResult && (
          <div className="text-[8.5px] font-mono text-tl-muted opacity-80 leading-none tabular-nums mt-0.5">
            {sampleTier === "TOP_10K_NEAR_U" && eoResult.top10k != null && eoResult.nearU != null ? (
              <span>{eoResult.top10k}% · {eoResult.nearU}%</span>
            ) : (
              <span>{eoResult.displayText}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
