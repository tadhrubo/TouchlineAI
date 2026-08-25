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
import { BadgeLegend } from "../fpl/BadgeLegend";
import { SampleTier, SAMPLE_TIER_OPTIONS } from "@/utils/eo";
import {
  ArrowRight,
  RefreshCw,
  HelpCircle,
  X,
  Radio,
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

  // Upcoming gameweek fixture schedule
  const upcomingGameweekFixtures = [
    { home: "Man City", away: "Wolves", time: "Sat 12:30", fdrHome: 2, fdrAway: 5 },
    { home: "Arsenal", away: "Chelsea", time: "Sat 15:00", fdrHome: 3, fdrAway: 4 },
    { home: "Brentford", away: "Bournemouth", time: "Sat 15:00", fdrHome: 2, fdrAway: 3 },
    { home: "Liverpool", away: "Aston Villa", time: "Sat 17:30", fdrHome: 4, fdrAway: 4 },
    { home: "Newcastle", away: "West Ham", time: "Sun 14:00", fdrHome: 2, fdrAway: 4 },
    { home: "Fulham", away: "Tottenham", time: "Sun 16:30", fdrHome: 3, fdrAway: 3 },
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

      {/* 0. Entry ID Selector & Live Polling Status */}
      <div className="space-y-1.5">
        <EntryIdSelector
          currentEntryId={currentEntryId}
          onSelectEntryId={onSelectEntryId}
          onClearEntryId={onClearEntryId}
          isLoading={isLoading}
        />
        
        {/* Subtle Live Sync Polling Indicator */}
        <div className="flex items-center justify-between px-2 text-[10px] font-mono text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-neutral-400">Live Matchday Polling (2m)</span>
          </div>
          <span className="text-neutral-500">Updated: {lastLivePollTime}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full h-80 flex flex-col items-center justify-center p-8 rounded-xl bg-neutral-900/30 border border-white/[0.04] space-y-2.5">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
          <p className="text-xs font-mono text-neutral-400">
            Syncing live squad #{currentEntryId}...
          </p>
        </div>
      ) : (
        <>
          {/* 1. Stats Bar */}
          <StatsCard stats={stats} />

          {/* 2. Secondary Navigation Bar */}
          <div className="flex items-center p-0.5 bg-neutral-900/60 rounded-lg border border-white/[0.06] overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSecondaryTab("team")}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                secondaryTab === "team"
                  ? "bg-neutral-800 text-neutral-100 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              My XI
            </button>
            <button
              onClick={() => setSecondaryTab("leagues")}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                secondaryTab === "leagues"
                  ? "bg-neutral-800 text-emerald-400 shadow-sm font-semibold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Leagues
            </button>
            <button
              onClick={() => setSecondaryTab("planner")}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                secondaryTab === "planner"
                  ? "bg-neutral-800 text-emerald-400 shadow-sm font-semibold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Planner
            </button>
            <button
              onClick={() => setSecondaryTab("strategy")}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                secondaryTab === "strategy"
                  ? "bg-neutral-800 text-emerald-400 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Strategy
            </button>
            <button
              onClick={() => setSecondaryTab("points")}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                secondaryTab === "points"
                  ? "bg-neutral-800 text-neutral-100 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Points (GW{stats.currentGameweek})
            </button>
            <button
              onClick={() => setSecondaryTab("fixtures")}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                secondaryTab === "fixtures"
                  ? "bg-neutral-800 text-neutral-100 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Fixtures
            </button>
          </div>

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
            <>
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

                <div className="flex items-center gap-2">
                  <BadgeLegend />
                  <button
                    onClick={() => setShowEOInfoModal(true)}
                    className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
                    title="Explain EO / xEO"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Pitch Component with Dynamic Formation & EO Support */}
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

              {/* Understated Prompt Shortcuts */}
              <div className="w-full bg-neutral-900/40 border border-white/[0.06] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                    Tactical Shortcuts
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-500">Touchline AI</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `Who should I captain for Gameweek ${stats.nextGameweek} in ${stats.teamName}?`
                      )
                    }
                    className="p-2.5 rounded-lg bg-neutral-900 border border-white/[0.04] text-left hover:border-neutral-700 transition active:scale-95 group"
                  >
                    <p className="text-xs font-medium text-neutral-200 group-hover:text-emerald-400 transition-colors">
                      Captaincy Advice
                    </p>
                    <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                      Analyze xP & match-ups
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `Optimize my starting XI formation and bench order for Gameweek ${stats.nextGameweek}.`
                      )
                    }
                    className="p-2.5 rounded-lg bg-neutral-900 border border-white/[0.04] text-left hover:border-neutral-700 transition active:scale-95 group"
                  >
                    <p className="text-xs font-medium text-neutral-200 group-hover:text-emerald-400 transition-colors">
                      Optimize Starting XI
                    </p>
                    <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                      ILP formation solver
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `What is my best transfer move for Gameweek ${stats.nextGameweek} with £${stats.inTheBank.toFixed(1)}m ITB?`
                      )
                    }
                    className="p-2.5 rounded-lg bg-neutral-900 border border-white/[0.04] text-left hover:border-neutral-700 transition active:scale-95 group"
                  >
                    <p className="text-xs font-medium text-neutral-200 group-hover:text-emerald-400 transition-colors">
                      Transfer Targets
                    </p>
                    <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                      SHAP expected gain
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `Check injury flags, rotation risks, and press conference updates across my squad.`
                      )
                    }
                    className="p-2.5 rounded-lg bg-neutral-900 border border-white/[0.04] text-left hover:border-neutral-700 transition active:scale-95 group"
                  >
                    <p className="text-xs font-medium text-neutral-200 group-hover:text-emerald-400 transition-colors">
                      Fitness & Flags
                    </p>
                    <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                      Press conference intel
                    </p>
                  </button>
                </div>
              </div>
            </>
          )}

          {secondaryTab === "fixtures" && (
            <FixturesTab currentGameweek={stats.nextGameweek || 1} />
          )}

          {secondaryTab === "points" && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/[0.06] text-center space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  Live Matchday Score
                </p>
                <div className="text-3xl font-bold font-mono text-emerald-400">
                  {stats.gameweekPoints} <span className="text-sm font-normal text-neutral-400">pts</span>
                </div>
                <p className="text-xs text-neutral-400">
                  Gameweek {stats.currentGameweek} Total Points
                </p>
              </div>

              {/* Pitch in Matchday Points Mode */}
              <Pitch
                players={players}
                onPlayerClick={handlePlayerSelect}
                captainId={captainId}
                viceCaptainId={viceCaptainId}
                formation={stats.formation}
                sampleTier={sampleTier}
                userRank={stats.overallRank}
              />

              <Bench
                benchPlayers={players.filter((p) => p.isBench)}
                onPlayerClick={handlePlayerSelect}
                sampleTier={sampleTier}
                userRank={stats.overallRank}
              />
            </div>
          )}
        </>
      )}

      {/* Explanation Modal for EO & xEO */}
      {showEOInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#0E121A] border border-white/[0.1] shadow-2xl p-4 space-y-3.5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-semibold text-neutral-100">
                  Effective Ownership (EO)
                </h3>
              </div>
              <button
                onClick={() => setShowEOInfoModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-300 leading-relaxed font-sans">
              <p>
                <strong className="text-neutral-100">Effective Ownership (EO)</strong> accounts for captaincy multipliers. If a player is started by 60% of managers and captained by 30%, their EO is <strong className="text-emerald-400">90%</strong>.
              </p>
              <div className="p-2 rounded-lg bg-neutral-900/80 border border-white/[0.04] space-y-1 font-mono text-[11px]">
                <div className="text-neutral-400">Sample Tiers:</div>
                <div className="text-neutral-300">• <span className="text-emerald-400 font-bold">Top 10k:</span> Elite competitive benchmark</div>
                <div className="text-neutral-300">• <span className="text-emerald-400 font-bold">Near U:</span> Managers within ±50k of your current rank</div>
                <div className="text-neutral-300">• <span className="text-emerald-400 font-bold">Elite:</span> Top 1k hall of fame managers</div>
              </div>
              <p className="text-[11px] text-neutral-400">
                In <strong className="text-neutral-200">My XI</strong>, you can track live EO threat levels so you know which players hurt or protect your rank when they score.
              </p>
            </div>

            <button
              onClick={() => setShowEOInfoModal(false)}
              className="w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
