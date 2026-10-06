"use client";

import React, { useState, useEffect } from "react";
import { Player, TeamStats, NewsItem } from "@/types/fpl";
import { StatsCard } from "../fpl/StatsCard";
import { Pitch } from "../fpl/Pitch";
import { Bench } from "../fpl/Bench";
import { LatestNews } from "../fpl/LatestNews";
import { EntryIdSelector } from "../fpl/EntryIdSelector";
import { EmptyState } from "../fpl/EmptyState";
import { ChipTimeline } from "../chips/ChipTimeline";
import { PlayerModal } from "../fpl/PlayerModal";
import { PlannerTab } from "../planner/PlannerTab";
import { FixturesTab } from "../fixtures/FixturesTab";
import { LeagueTab } from "../leagues/LeagueTab";
import { PointsTab } from "../points/PointsTab";
import { BadgeLegend } from "../fpl/BadgeLegend";
import { SampleTier, SAMPLE_TIER_OPTIONS } from "@/utils/eo";
import {
  RefreshCw,
  HelpCircle,
  X,
} from "lucide-react";

interface HomeTabProps {
  stats: TeamStats | null;
  players: Player[];
  news: NewsItem[];
  captainId: string;
  viceCaptainId: string;
  currentEntryId: string;
  isLoading?: boolean;
  onSelectEntryId: (entryId: string) => void;
  onClearEntryId?: () => void;
  onPlayerClick?: (player: Player) => void;
  onOpenChatWithPrompt: (prompt: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  stats,
  players,
  news,
  captainId,
  viceCaptainId,
  currentEntryId,
  isLoading = false,
  onSelectEntryId,
  onClearEntryId,
  onPlayerClick,
  onOpenChatWithPrompt,
}) => {
  const [secondaryTab, setSecondaryTab] = useState<
    "team" | "planner" | "strategy" | "points" | "fixtures" | "leagues"
  >("team");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sampleTier, setSampleTier] = useState<SampleTier>("TOP_10K_NEAR_U");
  const [showEOInfoModal, setShowEOInfoModal] = useState<boolean>(false);
  const [lastLivePollTime, setLastLivePollTime] = useState<string>("Just now");

  // Real-time polling effect (every 120 seconds / 2 minutes)
  useEffect(() => {
    if (!currentEntryId) return;

    const intervalId = setInterval(() => {
      // Background silent refresh of squad telemetry
      onSelectEntryId(currentEntryId);
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastLivePollTime(timeString);
    }, 120000); // 2 minutes

    return () => clearInterval(intervalId);
  }, [currentEntryId, onSelectEntryId]);

  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player);
  };

  const handleDiscussPlayer = (player: Player) => {
    setSelectedPlayer(null);
    onOpenChatWithPrompt(
      `Tell me about ${player.webName || player.fullName} (${player.teamShort || player.team}). How do their underlying stats look?`
    );
  };

  // If no Entry ID is set or squad not loaded, show clean EmptyState
  if (!currentEntryId || !stats || players.length === 0) {
    return (
      <div className="w-full pb-20 pt-4 animate-fade-in flex flex-col justify-center items-center min-h-[70vh]">
        <EmptyState onLoadEntryId={onSelectEntryId} isLoading={isLoading} />
      </div>
    );
  }

  const navItems: Array<{
    id: "team" | "points" | "leagues" | "planner" | "strategy" | "fixtures";
    label: string;
  }> = [
    { id: "team", label: "My XI" },
    { id: "points", label: `Points (GW${stats.currentGameweek})` },
    { id: "leagues", label: "Leagues" },
    { id: "planner", label: "Planner" },
    { id: "strategy", label: "Strategy" },
    { id: "fixtures", label: "Fixtures" },
  ];

  return (
    <div className="w-full space-y-3 pb-20 animate-fade-in">
      {/* Player Stats & Breakdown Modal */}
      <PlayerModal
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        onDiscuss={handleDiscussPlayer}
      />

      {/* 0. Compressed Entry ID Strip & Live Polling Status */}
      <div className="space-y-0.5">
        <EntryIdSelector
          currentEntryId={currentEntryId}
          onSelectEntryId={onSelectEntryId}
          onClearEntryId={onClearEntryId}
          isLoading={isLoading}
        />
        
        {/* Sleek Terminal Status Indicator */}
        <div className="flex items-center justify-between px-0.5 text-xs font-mono leading-none">
          <span className="text-tl-accent text-[10px] uppercase tracking-wider font-semibold">
            Live Matchday Polling (2m)
          </span>
          <span className="text-tl-muted text-[10px] tabular-nums">Updated: {lastLivePollTime}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full h-80 flex flex-col items-center justify-center p-8 rounded-sm bg-tl-surface border border-tl-border space-y-2.5">
          <RefreshCw className="w-5 h-5 text-tl-accent animate-spin" />
          <p className="text-xs font-mono text-tl-muted">
            Syncing live squad #{currentEntryId}...
          </p>
        </div>
      ) : (
        <>
          {/* 1. Stats Bar (Flat editorial statistics with 3-tier hierarchy) */}
          <StatsCard stats={stats} />

          {/* 2. Editorial Plain Text Navigation Bar */}
          <nav className="flex items-center border-b border-tl-border gap-6 px-0.5 overflow-x-auto no-scrollbar">
            {navItems.map((tab) => {
              const isActive = secondaryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSecondaryTab(tab.id)}
                  className={`relative pb-2 pt-1 text-xs uppercase tracking-wider font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-tl-text"
                      : "text-tl-muted hover:text-tl-text"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-tl-accent" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* 3. Conditional Content based on Secondary Nav */}
          {secondaryTab === "leagues" && (
            <LeagueTab currentEntryId={currentEntryId} />
          )}

          {secondaryTab === "planner" && (
            <PlannerTab
              stats={stats}
              initialPlayers={players}
              captainId={captainId}
              viceCaptainId={viceCaptainId}
              sampleTier={sampleTier}
              onSampleTierChange={setSampleTier}
              onOpenChatWithPrompt={onOpenChatWithPrompt}
            />
          )}

          {secondaryTab === "strategy" && (
            <ChipTimeline
              entryId={currentEntryId}
              onOpenChatWithPrompt={onOpenChatWithPrompt}
            />
          )}

          {secondaryTab === "team" && (
            <div className="space-y-3.5">
              {/* Secondary Tier: Sample Tier Selector & Tactical Tools */}
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

                <div className="flex items-center gap-2">
                  <BadgeLegend />
                  <button
                    onClick={() => setShowEOInfoModal(true)}
                    className="p-1 text-tl-muted hover:text-tl-text transition-colors"
                    title="Explain EO / xEO"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Pitch Component: Primary Visual Centerpiece */}
              <Pitch
                players={players}
                onPlayerClick={handlePlayerSelect}
                captainId={captainId}
                viceCaptainId={viceCaptainId}
                formation={stats.formation}
                sampleTier={sampleTier}
                userRank={stats.overallRank}
              />

              {/* Substitutes Bench Area */}
              <Bench
                benchPlayers={players.filter((p) => p.isBench)}
                onPlayerClick={handlePlayerSelect}
                sampleTier={sampleTier}
                userRank={stats.overallRank}
              />

              {/* Latest News / Flags */}
              {news && news.length > 0 && <LatestNews news={news} />}

              {/* Tactical Shortcuts (Clean typographic analytical actions, removed unnecessary Touchline Analyst label per requirement 9) */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-tl-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-tl-muted">
                    Tactical Shortcuts
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `Who should I captain for Gameweek ${stats.nextGameweek} in ${stats.teamName}?`
                      )
                    }
                    className="p-3 rounded-sm bg-tl-surface border border-tl-border text-left hover:border-tl-accent/40 hover:bg-tl-surface2 transition active:scale-[0.98] group"
                  >
                    <p className="text-xs font-semibold text-tl-text group-hover:text-tl-accent transition-colors">
                      Captaincy Advice
                    </p>
                    <p className="text-[10px] font-mono text-tl-muted mt-0.5">
                      Analyze xP & match-ups
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `Optimize my starting XI formation and bench order for Gameweek ${stats.nextGameweek}.`
                      )
                    }
                    className="p-3 rounded-sm bg-tl-surface border border-tl-border text-left hover:border-tl-accent/40 hover:bg-tl-surface2 transition active:scale-[0.98] group"
                  >
                    <p className="text-xs font-semibold text-tl-text group-hover:text-tl-accent transition-colors">
                      Optimize Starting XI
                    </p>
                    <p className="text-[10px] font-mono text-tl-muted mt-0.5">
                      ILP formation solver
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `What is my best transfer move for Gameweek ${stats.nextGameweek} with £${stats.inTheBank.toFixed(1)}m ITB?`
                      )
                    }
                    className="p-3 rounded-sm bg-tl-surface border border-tl-border text-left hover:border-tl-accent/40 hover:bg-tl-surface2 transition active:scale-[0.98] group"
                  >
                    <p className="text-xs font-semibold text-tl-text group-hover:text-tl-accent transition-colors">
                      Transfer Targets
                    </p>
                    <p className="text-[10px] font-mono text-tl-muted mt-0.5">
                      SHAP expected gain
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `Check injury flags, rotation risks, and press conference updates across my squad.`
                      )
                    }
                    className="p-3 rounded-sm bg-tl-surface border border-tl-border text-left hover:border-tl-accent/40 hover:bg-tl-surface2 transition active:scale-[0.98] group"
                  >
                    <p className="text-xs font-semibold text-tl-text group-hover:text-tl-accent transition-colors">
                      Fitness & Flags
                    </p>
                    <p className="text-[10px] font-mono text-tl-muted mt-0.5">
                      Press conference intel
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {secondaryTab === "fixtures" && (
            <FixturesTab currentGameweek={stats.nextGameweek || 1} />
          )}

          {secondaryTab === "points" && (
            <PointsTab
              stats={stats}
              players={players}
              captainId={captainId}
              viceCaptainId={viceCaptainId}
              onPlayerClick={handlePlayerSelect}
            />
          )}
        </>
      )}

      {/* EO Explanation Modal with Strict Semantic Tokens */}
      {showEOInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in text-tl-text">
          <div className="bg-tl-surface border border-tl-border w-full max-w-sm rounded-sm p-4 space-y-3">
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
              className="w-full py-2 rounded-sm bg-tl-accent text-tl-accentContrast text-xs font-bold uppercase tracking-wider transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
