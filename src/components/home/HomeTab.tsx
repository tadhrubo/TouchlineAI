"use client";

import React, { useState } from "react";
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
import { SampleTier, SAMPLE_TIER_OPTIONS } from "@/utils/eo";
import {
  ArrowRight,
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
  const [secondaryTab, setSecondaryTab] = useState<"team" | "planner" | "strategy" | "points" | "fixtures">("team");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sampleTier, setSampleTier] = useState<SampleTier>("TOP_10K_NEAR_U");
  const [showEOInfoModal, setShowEOInfoModal] = useState<boolean>(false);

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
        <EmptyState
          onLoadEntryId={onSelectEntryId}
          isLoading={isLoading}
        />
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

      {/* 0. Entry ID Selector */}
      <EntryIdSelector
        currentEntryId={currentEntryId}
        onSelectEntryId={onSelectEntryId}
        onClearEntryId={onClearEntryId}
        isLoading={isLoading}
      />

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

                <button
                  onClick={() => setShowEOInfoModal(true)}
                  className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
                  title="Explain EO / xEO"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
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

                <div className="space-y-1.5">
                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `Who should I captain for Gameweek ${stats.nextGameweek} in ${stats.teamName}?`
                      )
                    }
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-neutral-950/60 border border-white/[0.04] hover:border-white/[0.1] hover:bg-neutral-900 transition text-left group"
                  >
                    <span className="text-xs text-neutral-300 group-hover:text-neutral-100">
                      Captaincy evaluation for Gameweek {stats.nextGameweek}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 transition" />
                  </button>

                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `Optimize my starting XI and bench priority order for Gameweek ${stats.nextGameweek}.`
                      )
                    }
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-neutral-950/60 border border-white/[0.04] hover:border-white/[0.1] hover:bg-neutral-900 transition text-left group"
                  >
                    <span className="text-xs text-neutral-300 group-hover:text-neutral-100">
                      Optimize starting XI & auto-sub order
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 transition" />
                  </button>

                  <button
                    onClick={() =>
                      onOpenChatWithPrompt(
                        `What are the best transfer targets with £${stats.inTheBank.toFixed(1)}m in the bank and ${stats.freeTransfers} Free Transfer?`
                      )
                    }
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-neutral-950/60 border border-white/[0.04] hover:border-white/[0.1] hover:bg-neutral-900 transition text-left group"
                  >
                    <span className="text-xs text-neutral-300 group-hover:text-neutral-100 font-mono text-[11.5px]">
                      Transfer targets (£{stats.inTheBank.toFixed(1)}m ITB · {stats.freeTransfers} FT)
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 transition" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Points Tab View */}
          {secondaryTab === "points" && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/[0.06] text-center">
                <span className="text-[10px] uppercase tracking-wider font-medium text-neutral-500">
                  Gameweek {stats.currentGameweek} Score
                </span>
                <h2 className="text-3xl font-black text-neutral-100 font-mono mt-1">
                  {stats.gameweekPoints} <span className="text-sm font-medium text-neutral-400">pts</span>
                </h2>
                <p className="text-xs text-neutral-400 font-mono mt-1">
                  Total: {stats.overallPoints.toLocaleString()} pts · Rank: #{stats.overallRank.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-900/40 border border-white/[0.06]">
                <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">
                  Squad Output
                </h3>
                <div className="space-y-1">
                  {players
                    .slice()
                    .sort((a, b) => b.totalPoints - a.totalPoints)
                    .slice(0, 7)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-md bg-neutral-950/40 border border-white/[0.04]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-neutral-200">
                            {p.webName}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {p.teamShort} · {p.position}
                          </span>
                          {(captainId === p.id || p.isCaptain) && (
                            <span className="text-[9px] px-1 py-0.2 bg-neutral-100 text-neutral-950 font-bold rounded-sm">
                              C
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-medium text-emerald-400">
                          {p.totalPoints} pts
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Fixtures Tab View */}
          {secondaryTab === "fixtures" && (
            <FixturesTab currentGameweek={stats.currentGameweek || 1} />
          )}
        </>
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
                If a player has <span className="text-neutral-100 font-mono">140% EO</span>, owning them without captaincy leaves you with negative rank gain when they score.
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
    </div>
  );
};
