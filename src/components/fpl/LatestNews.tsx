"use client";

import React, { useState, useEffect } from "react";
import { NewsItem } from "@/types/fpl";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Radio,
  ShieldAlert,
  Zap,
} from "lucide-react";

interface WarRoomDigest {
  gameweek: number;
  executive_briefing: string;
  press_conference_radar: string[];
  creator_and_reddit_consensus: {
    top_buys: string[];
    top_sells: string[];
    captaincy_poll_leader: string;
  };
  community_traps_vs_sota_math: string[];
  shield_vs_sword_captaincy: {
    shield: string;
    sword: string;
  };
}

interface LatestNewsProps {
  news: NewsItem[];
  initialDigest?: WarRoomDigest | null;
}

export const LatestNews: React.FC<LatestNewsProps> = ({
  news,
  initialDigest,
}) => {
  const [digest, setDigest] = useState<WarRoomDigest | null>(
    initialDigest || null
  );
  const [activeSection, setActiveSection] = useState<
    "squad" | "radar" | "traps"
  >("squad");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialDigest) {
      let isMounted = true;
      fetch("/api/war-room")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data?.digest) {
            setDigest(data.digest);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch /api/war-room in LatestNews:", err);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [initialDigest]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const radarItems = digest?.press_conference_radar || [];
  const trapItems = digest?.community_traps_vs_sota_math || [];

  return (
    <div className="w-full bg-tl-surface border border-tl-border p-3 text-tl-text select-none">
      {/* Editorial Header Strip */}
      <div className="flex items-center justify-between pb-2 border-b border-tl-border mb-2.5 px-0.5 text-xs">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-tl-accent animate-pulse" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-tl-text font-mono">
            Gameweek Intelligence Feed
          </span>
          {digest?.gameweek && (
            <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-sm bg-tl-surface2 text-tl-muted border border-tl-border">
              GW{digest.gameweek}
            </span>
          )}
        </div>

        {/* Section Segmented Switches */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <button
            onClick={() => setActiveSection("squad")}
            className={`px-2 py-0.5 rounded-sm transition ${
              activeSection === "squad"
                ? "bg-tl-bg text-tl-accent font-bold border border-tl-accent/40"
                : "text-tl-muted hover:text-tl-text bg-tl-surface border border-transparent"
            }`}
          >
            Squad ({news.length})
          </button>
          <button
            onClick={() => setActiveSection("radar")}
            className={`px-2 py-0.5 rounded-sm transition ${
              activeSection === "radar"
                ? "bg-tl-bg text-tl-accent font-bold border border-tl-accent/40"
                : "text-tl-muted hover:text-tl-text bg-tl-surface border border-transparent"
            }`}
          >
            Pressers ({radarItems.length})
          </button>
          <button
            onClick={() => setActiveSection("traps")}
            className={`px-2 py-0.5 rounded-sm transition ${
              activeSection === "traps"
                ? "bg-tl-bg text-tl-accent font-bold border border-tl-accent/40"
                : "text-tl-muted hover:text-tl-text bg-tl-surface border border-transparent"
            }`}
          >
            Traps ({trapItems.length})
          </button>
        </div>
      </div>

      {/* 1. SECTION: SQUAD STATUS & FLAGS */}
      {activeSection === "squad" && (
        <div className="space-y-1">
          {news.length === 0 ? (
            <div className="py-4 text-center font-mono text-xs text-tl-muted">
              Zero active medical flags or rotation alerts in starting squad.
            </div>
          ) : (
            news.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => toggleExpand(item.id)}
                  className="w-full p-2.5 rounded-sm bg-tl-bg border border-tl-border hover:border-tl-muted transition text-left text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span className="text-tl-text truncate font-medium">
                        {item.headline}
                      </span>
                    </div>
                    {item.detail && (
                      <div className="text-tl-muted flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    )}
                  </div>

                  {isExpanded && item.detail && (
                    <p className="mt-2 pt-2 border-t border-tl-border text-[11px] text-tl-muted leading-relaxed font-sans">
                      {item.detail}
                    </p>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* 2. SECTION: PRESS CONFERENCE RADAR */}
      {activeSection === "radar" && (
        <div className="space-y-1">
          {radarItems.length === 0 ? (
            <div className="py-4 text-center font-mono text-xs text-tl-muted">
              No press conference flags ingested yet for this Gameweek.
            </div>
          ) : (
            radarItems.map((text, idx) => {
              const id = `radar-${idx}`;
              const isExpanded = expandedId === id;
              const hasDivider = text.includes(":");
              const titlePart = hasDivider ? text.split(":")[0] : text.slice(0, 45);
              const detailPart = hasDivider ? text.slice(text.indexOf(":") + 1).trim() : text;

              return (
                <div
                  key={id}
                  onClick={() => toggleExpand(id)}
                  className="w-full p-2.5 rounded-sm bg-tl-bg border border-tl-border hover:border-tl-muted transition text-left text-xs cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <ShieldAlert className="w-3.5 h-3.5 text-tl-accent flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-tl-text text-xs block">
                          {titlePart}
                        </span>
                        <p className={`text-[11px] text-tl-muted font-sans leading-relaxed mt-0.5 ${!isExpanded ? "line-clamp-1" : ""}`}>
                          {detailPart}
                        </p>
                      </div>
                    </div>
                    <div className="text-tl-muted flex-shrink-0 mt-0.5">
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 3. SECTION: COMMUNITY TRAPS VS SOTA MATH */}
      {activeSection === "traps" && (
        <div className="space-y-1.5">
          {trapItems.length === 0 ? (
            <div className="py-4 text-center font-mono text-xs text-tl-muted">
              No community traps detected for current Gameweek deadline.
            </div>
          ) : (
            trapItems.map((text, idx) => (
              <div
                key={`trap-${idx}`}
                className="p-2.5 rounded-sm bg-tl-bg border border-tl-border text-xs flex items-start gap-2.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-500">
                      Bandwagon Trap vs Math
                    </span>
                  </div>
                  <p className="text-[11px] text-tl-text leading-relaxed font-sans">
                    {text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
