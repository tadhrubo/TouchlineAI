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
    <div className="w-full space-y-4 pb-20 animate-fade-in">
      {/* Player Stats & Breakdown Modal */}
      <PlayerModal
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        onDiscuss={handleDiscussPlayer}
      />

      {/* 0. Entry ID Selector & Live Polling Status */}
      <div className="space-y-1">
        <EntryIdSelector
          currentEntryId={currentEntryId}
          onSelectEntryId={onSelectEntryId}
          onClearEntryId={onClearEntryId}
          isLoading={isLoading}
        />
        
        {/* Sleek Terminal Status Indicator */}
        <div className="flex items-center justify-between px-0.5 text-xs font-mono">
          <span className="text-[#16C784] text-[11px] uppercase tracking-wider font-semibold">
            Live Matchday Polling (2m)
          </span>
          <span className="text-[#7F8983] text-[11px] tabular-nums">Updated: {lastLivePollTime}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full h-80 flex flex-col items-center justify-center p-8 rounded-sm bg-[#0D1110] border border-[#1E2421] space-y-2.5">
          <RefreshCw className="w-5 h-5 text-[#16C784] animate-spin" />
          <p className="text-xs font-mono text-[#7F8983]">
            Syncing live squad #{currentEntryId}...
          </p>
        </div>
      ) : (
        <>
          {/* 1. Stats Bar (Flat editorial statistics) */}
          <StatsCard stats={stats} />

          {/* 2. Editorial Plain Text Navigation Bar */}
          <nav className="flex items-center border-b border-[#1E2421] gap-6 px-0.5 overflow-x-auto no-scrollbar">
            {navItems.map((tab) => {
              const isActive = secondaryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSecondaryTab(tab.id)}
                  className={`relative pb-2.5 pt-1 text-xs uppercase tracking-wider font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-[#F1F3EF]"
                      : "text-[#7F8983] hover:text-[#F1F3EF]"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#16C784]" />
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
            <div className="space-y-4">
              {/* Sample Tier Selector & Tactical Tools */}
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

                <div className="flex items-center gap-2.5">
                  <BadgeLegend />
                  <button
                    onClick={() => setShowEOInfoModal(true)}
                    className="p-1 text-[#7F8983] hover:text-[#F1F3EF] transition-colors"
                    title="Explain EO / xEO"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Pitch Component: Tactical centerpiece */}
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

              {/* Tactical Shortcuts (Clean typographic analytical actions) */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#1E2421]">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7F8983]">
                    Tactical Shortcuts
                  </h3>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#7F8983]">
                    Touchline Analyst
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `Who should I captain for Gameweek ${stats.nextGameweek} in ${stats.teamName}?`
                      )
                    }
                    className="p-3 rounded-sm bg-[#0D1110] border border-[#1E2421] text-left hover:border-[#16C784]/40 hover:bg-[#111614] transition active:scale-[0.98] group"
                  >
                    <p className="text-xs font-semibold text-[#F1F3EF] group-hover:text-[#16C784] transition-colors">
                      Captaincy Advice
                    </p>
                    <p className="text-[10px] font-mono text-[#7F8983] mt-0.5">
                      Analyze xP & match-ups
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `Optimize my starting XI formation and bench order for Gameweek ${stats.nextGameweek}.`
                      )
                    }
                    className="p-3 rounded-sm bg-[#0D1110] border border-[#1E2421] text-left hover:border-[#16C784]/40 hover:bg-[#111614] transition active:scale-[0.98] group"
                  >
                    <p className="text-xs font-semibold text-[#F1F3EF] group-hover:text-[#16C784] transition-colors">
                      Optimize Starting XI
                    </p>
                    <p className="text-[10px] font-mono text-[#7F8983] mt-0.5">
                      ILP formation solver
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `What is my best transfer move for Gameweek ${stats.nextGameweek} with £${stats.inTheBank.toFixed(1)}m ITB?`
                      )
                    }
                    className="p-3 rounded-sm bg-[#0D1110] border border-[#1E2421] text-left hover:border-[#16C784]/40 hover:bg-[#111614] transition active:scale-[0.98] group"
                  >
                    <p className="text-xs font-semibold text-[#F1F3EF] group-hover:text-[#16C784] transition-colors">
                      Transfer Targets
                    </p>
                    <p className="text-[10px] font-mono text-[#7F8983] mt-0.5">
                      SHAP expected gain
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `Check injury flags, rotation risks, and press conference updates across my squad.`
                      )
                    }
                    className="p-3 rounded-sm bg-[#0D1110] border border-[#1E2421] text-left hover:border-[#16C784]/40 hover:bg-[#111614] transition active:scale-[0.98] group"
                  >
                    <p className="text-xs font-semibold text-[#F1F3EF] group-hover:text-[#16C784] transition-colors">
                      Fitness & Flags
                    </p>
                    <p className="text-[10px] font-mono text-[#7F8983] mt-0.5">
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

      {/* Explanation Modal for EO & xEO */}
      {showEOInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="w-full max-w-sm rounded-md bg-[#0D1110] border border-[#1E2421] p-4 space-y-3.5 shadow-xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#1E2421] pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F1F3EF]">
                Effective Ownership (EO)
              </h3>
              <button
                onClick={() => setShowEOInfoModal(false)}
                className="p-1 rounded-sm text-[#7F8983] hover:text-[#F1F3EF] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[#7F8983] leading-relaxed font-sans">
              <p>
                <strong className="text-[#F1F3EF]">Effective Ownership (EO)</strong> accounts for captaincy multipliers. If a player is started by 60% of managers and captained by 30%, their EO is <strong className="text-[#16C784]">90%</strong>.
              </p>
              <div className="p-2.5 rounded-sm bg-[#111614] border border-[#1E2421] space-y-1 font-mono text-[11px]">
                <div className="text-[#7F8983] uppercase tracking-wider">Sample Tiers:</div>
                <div className="text-[#F1F3EF]">• <span className="text-[#16C784] font-bold">Top 10k:</span> Elite competitive benchmark</div>
                <div className="text-[#F1F3EF]">• <span className="text-[#16C784] font-bold">Near U:</span> Managers within ±50k of your current rank</div>
                <div className="text-[#F1F3EF]">• <span className="text-[#16C784] font-bold">Elite:</span> Top 1k hall of fame managers</div>
              </div>
              <p className="text-[11px] text-[#7F8983]">
                In <strong className="text-[#F1F3EF]">My XI</strong>, track live EO threat levels so you know which players hurt or protect your rank when they score.
              </p>
            </div>

            <button
              onClick={() => setShowEOInfoModal(false)}
              className="w-full py-2 rounded-sm bg-[#16C784] text-[#070908] text-xs font-bold uppercase tracking-wider hover:bg-[#13ab71] transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
