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
import {
  ArrowRight,
  RefreshCw,
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
  onPlayerClick: (player: Player) => void;
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
  const [secondaryTab, setSecondaryTab] = useState<"team" | "strategy" | "points" | "fixtures">("team");

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
          <div className="flex items-center p-0.5 bg-neutral-900/60 rounded-lg border border-white/[0.06]">
            <button
              onClick={() => setSecondaryTab("team")}
              className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors ${
                secondaryTab === "team"
                  ? "bg-neutral-800 text-neutral-100 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              My XI
            </button>
            <button
              onClick={() => setSecondaryTab("strategy")}
              className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors ${
                secondaryTab === "strategy"
                  ? "bg-neutral-800 text-emerald-400 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Strategy
            </button>
            <button
              onClick={() => setSecondaryTab("points")}
              className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors ${
                secondaryTab === "points"
                  ? "bg-neutral-800 text-neutral-100 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Points (GW{stats.currentGameweek})
            </button>
            <button
              onClick={() => setSecondaryTab("fixtures")}
              className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors ${
                secondaryTab === "fixtures"
                  ? "bg-neutral-800 text-neutral-100 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Fixtures
            </button>
          </div>

          {/* 3. Conditional Content based on Secondary Nav */}
          {secondaryTab === "strategy" && (
            <ChipTimeline
              entryId={currentEntryId}
              onOpenChatWithPrompt={onOpenChatWithPrompt}
            />
          )}

          {secondaryTab === "team" && (
            <>
              {/* Pitch Component with Dynamic Formation */}
              <Pitch
                players={players}
                onPlayerClick={onPlayerClick}
                captainId={captainId}
                viceCaptainId={viceCaptainId}
                formation={stats.formation}
              />

              {/* Substitutes Bench Area */}
              <Bench
                benchPlayers={players.filter((p) => p.isBench)}
                onPlayerClick={onPlayerClick}
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
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-neutral-900/40 border border-white/[0.06]">
                <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">
                  Gameweek {stats.nextGameweek} Schedule
                </h3>
                <div className="space-y-1.5">
                  {upcomingGameweekFixtures.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-md bg-neutral-950/40 border border-white/[0.04]"
                    >
                      <div className="flex-1 flex items-center justify-end gap-1.5 text-right">
                        <span className="text-xs font-medium text-neutral-200">
                          {f.home}
                        </span>
                        <span className="text-[9.5px] font-mono px-1 rounded bg-neutral-900 text-neutral-400 border border-white/[0.06]">
                          FDR {f.fdrHome}
                        </span>
                      </div>
                      <div className="px-3 text-[10px] font-mono text-neutral-600">
                        vs
                      </div>
                      <div className="flex-1 flex items-center justify-start gap-1.5 text-left">
                        <span className="text-[9.5px] font-mono px-1 rounded bg-neutral-900 text-neutral-400 border border-white/[0.06]">
                          FDR {f.fdrAway}
                        </span>
                        <span className="text-xs font-medium text-neutral-200">
                          {f.away}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
