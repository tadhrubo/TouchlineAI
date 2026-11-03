"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Player,
  TeamStats,
  InsightItem,
  ChatMessage,
  WarRoomDigest,
} from "@/types/fpl";
import { PlayerComparisonCard } from "./PlayerComparisonCard";
import {
  Send,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Radio,
  Shield,
  Swords,
} from "lucide-react";

interface ChatTabProps {
  entryId: string;
  stats: TeamStats | null;
  players: Player[];
  captainId: string;
  viceCaptainId: string;
  onSetCaptain: (playerId: string) => void;
  pendingPrompt?: string | null;
  onClearPendingPrompt?: () => void;
}

const WAR_ROOM_ACTIONS = [
  {
    id: "action-captaincy",
    label: "Shield vs. Sword Captaincy",
    getPrompt: (gw: number) =>
      `Break down the Shield vs. Sword captaincy options for Gameweek ${gw} with exact SOTA ceiling and haul probabilities.`,
  },
  {
    id: "action-consensus",
    label: "Creator Consensus vs. SOTA Math",
    getPrompt: (gw: number) =>
      `Compare top creator & community transfer bandwagons against our SOTA Poisson math for Gameweek ${gw}.`,
  },
  {
    id: "action-pressers",
    label: "My Squad Presser & Injury Check",
    getPrompt: (_gw: number) =>
      `Run a full press conference and injury flag check on my 15 squad players ahead of the deadline.`,
  },
  {
    id: "action-transfer",
    label: "Best 1-Transfer Optimal Move",
    getPrompt: (_gw: number) =>
      `What is the single best 1-transfer optimal move for my squad given my budget and SOTA xP projections?`,
  },
];

// Lightweight markdown renderer for AI responses
function FormattedMessage({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");

  const parseInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-tl-text">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed text-tl-text">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={i} className="h-0.5" />;
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={i}
              className="text-xs sm:text-sm font-bold uppercase tracking-wider text-tl-text pt-1"
            >
              {parseInline(trimmed.slice(4))}
            </h4>
          );
        }

        if (trimmed.startsWith("#### ")) {
          return (
            <h5
              key={i}
              className="text-xs font-semibold text-tl-muted uppercase tracking-wider pt-0.5"
            >
              {parseInline(trimmed.slice(5))}
            </h5>
          );
        }

        if (trimmed.startsWith("---")) {
          return <hr key={i} className="border-tl-border my-1.5" />;
        }

        if (
          trimmed.startsWith("* ") ||
          trimmed.startsWith("- ") ||
          trimmed.startsWith("• ")
        ) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-tl-accent select-none leading-none mt-1">•</span>
              <span className="flex-1">{parseInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+\.)\s(.*)$/);
          if (match) {
            return (
              <div key={i} className="flex items-start gap-2 pl-1">
                <span className="text-tl-muted font-mono text-[11px] select-none">
                  {match[1]}
                </span>
                <span className="flex-1">{parseInline(match[2])}</span>
              </div>
            );
          }
        }

        return <p key={i}>{parseInline(trimmed)}</p>;
      })}
    </div>
  );
}

export const ChatTab: React.FC<ChatTabProps> = ({
  entryId,
  stats,
  players,
  captainId,
  viceCaptainId,
  onSetCaptain,
  pendingPrompt,
  onClearPendingPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [liveInsights, setLiveInsights] = useState<InsightItem[]>([]);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [warRoomDigest, setWarRoomDigest] = useState<WarRoomDigest | null>(null);
  const [isWarRoomCollapsed, setIsWarRoomCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const captain = players.find((p) => p.id === captainId);
  const viceCaptain = players.find((p) => p.id === viceCaptainId);

  // Fetch War Room Live Digest
  useEffect(() => {
    let isMounted = true;
    fetch("/api/war-room")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.digest) {
          setWarRoomDigest(data.digest);
        }
      })
      .catch((err) => {
        console.warn("Failed fetching /api/war-room in ChatTab:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize with initial assistant briefing
  useEffect(() => {
    if (messages.length === 0 && stats) {
      setMessages([
        {
          id: "msg-init",
          sender: "assistant",
          timestamp: "Just now",
          text: `Matchday War Room active for **${stats.teamName}** (GW${stats.nextGameweek}). Poisson SOTA expected points, Monte Carlo simulations, and deadline intelligence are synced.`,
          quickActions: [
            { label: "Shield vs Sword", action: "captaincy" },
            { label: "Transfer Targets", action: "transfers" },
          ],
        },
      ]);
    }
  }, [stats, messages.length]);

  // Execute pending prompt from Home tab shortcuts
  useEffect(() => {
    if (pendingPrompt && pendingPrompt.trim()) {
      handleSendMessage(pendingPrompt);
      onClearPendingPrompt?.();
    }
  }, [pendingPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const toggleInsight = (id: string) => {
    setExpandedInsightId((prev) => (prev === id ? null : id));
  };

  const handleSendMessage = async (customText?: string, actionType?: string) => {
    const text = (customText || inputValue).trim();
    if (!text || isThinking) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      text,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!customText) setInputValue("");
    setIsThinking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: entryId,
          message: text,
          messages: updatedMessages.map((m) => ({
            role: m.sender === "assistant" ? "ai" : "user",
            content: m.text || "",
          })),
          actionType: actionType || "",
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat API error: ${res.status}`);
      }

      const data = await res.json();

      const aiReply: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: data.text,
        comparisonCard: data.comparisonCard || undefined,
        quickActions: data.quickActions || [],
      };

      if (data.insights && data.insights.length > 0) {
        setLiveInsights(data.insights);
      }

      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      console.error("Chat request failed:", err);
      const errorReply: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: `Error analyzing telemetry for Team #${entryId}. Please try again.`,
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleMicToggle = () => {
    if (!isRecordingVoice) {
      setIsRecordingVoice(true);
      setInputValue("Who should I captain for this gameweek?");
      setTimeout(() => {
        setIsRecordingVoice(false);
      }, 1800);
    } else {
      setIsRecordingVoice(false);
    }
  };

  if (!stats) return null;
  const firstName = stats.managerName.split(" ")[0];

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-tl-bg">
      {/* 1. Scrollable Message & Context Container */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3.5 space-y-3 max-w-2xl mx-auto w-full">
        {/* Context Summary Bar */}
        <div className="w-full py-1.5 border-b border-tl-border space-y-1.5">
          <div className="flex items-center justify-between text-xs text-tl-muted">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-tl-text">
                {firstName} · {stats.teamName}
              </span>
              <span className="text-tl-border">/</span>
              <span className="font-mono text-tl-muted">GW{stats.nextGameweek}</span>
            </div>

            <div className="font-mono text-xs text-tl-text font-semibold tabular-nums">
              Rank #{stats.overallRank.toLocaleString()}
            </div>
          </div>

          {/* Telemetry Row */}
          <div className="flex items-center justify-between text-[11px] text-tl-muted font-mono">
            <div className="flex items-center gap-2">
              <span className="text-tl-text font-semibold">{stats.formation}</span>
              <span className="text-tl-border">·</span>
              <span className="text-tl-accent font-semibold">{stats.freeTransfers} FT</span>
              <span className="text-tl-border">·</span>
              <span>£{stats.inTheBank.toFixed(1)}m ITB</span>
            </div>

            <div>
              <span className="text-tl-text font-semibold">
                (C) {captain?.webName || "Captain"}
              </span>
              <span className="text-tl-border mx-1">/</span>
              <span className="text-tl-muted">
                (VC) {viceCaptain?.webName || "Vice"}
              </span>
            </div>
          </div>

          {/* Expandable Live Insights if generated */}
          {liveInsights.length > 0 && (
            <div className="space-y-1 pt-1">
              {liveInsights.map((item) => {
                const isExpanded = expandedInsightId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleInsight(item.id)}
                    className="p-2 rounded-sm bg-tl-surface border border-tl-border hover:border-tl-accent/30 transition cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-none flex-shrink-0 ${
                            item.severity === "danger"
                              ? "bg-rose-500"
                              : item.severity === "warning"
                              ? "bg-amber-500"
                              : "bg-tl-accent"
                          }`}
                        />
                        <span className="font-medium text-tl-text truncate">
                          {item.title}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-tl-muted" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-tl-muted" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-1.5 pt-1.5 border-t border-tl-border text-tl-muted text-[11px] leading-relaxed">
                        <p>{item.expandedDetail}</p>
                        {item.actionText && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.actionPayload?.startsWith("captain-")) {
                                const pId = item.actionPayload.replace("captain-", "");
                                onSetCaptain(pId);
                              } else {
                                handleSendMessage(item.actionText);
                              }
                            }}
                            className="mt-1.5 text-[11px] font-semibold text-tl-accent hover:underline flex items-center gap-1 font-mono"
                          >
                            <span>{item.actionText}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* GW Deadline War Room Briefing Header / Card */}
        <div className="w-full bg-tl-surface border border-tl-border rounded-sm p-3 space-y-2.5 select-none">
          <div className="flex items-center justify-between pb-1.5 border-b border-tl-border text-xs">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-tl-accent animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-tl-text">
                GW{stats.nextGameweek} Deadline War Room Briefing
              </span>
            </div>
            <button
              onClick={() => setIsWarRoomCollapsed(!isWarRoomCollapsed)}
              className="text-[10px] font-mono text-tl-muted hover:text-tl-text flex items-center gap-1 transition"
            >
              <span>{isWarRoomCollapsed ? "Expand" : "Collapse"}</span>
              {isWarRoomCollapsed ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </button>
          </div>

          {!isWarRoomCollapsed && (
            <>
              {/* Executive Briefing Text */}
              <p className="text-xs text-tl-text leading-relaxed font-sans">
                {warRoomDigest?.executive_briefing ||
                  `Gameweek ${stats.nextGameweek} deadline desk active. Poisson SOTA engine and Monte Carlo simulations loaded.`}
              </p>

              {/* Shield vs. Sword Captaincy Split */}
              {warRoomDigest?.shield_vs_sword_captaincy && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <div className="p-2.5 rounded-sm bg-tl-bg border border-tl-border">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Shield className="w-3 h-3 text-tl-muted" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-tl-muted">
                        Shield Captain (Template)
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-tl-text font-semibold leading-tight">
                      {warRoomDigest.shield_vs_sword_captaincy.shield}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-sm bg-tl-bg border border-tl-accent/40">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Swords className="w-3 h-3 text-tl-accent" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-tl-accent">
                        Sword Captain (Differential)
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-tl-text font-semibold leading-tight">
                      {warRoomDigest.shield_vs_sword_captaincy.sword}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 4 One-Click Tactical Quick-Action Buttons */}
          <div className="pt-0.5">
            <div className="grid grid-cols-2 gap-1.5">
              {WAR_ROOM_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() =>
                    handleSendMessage(action.getPrompt(stats.nextGameweek))
                  }
                  className="p-2 rounded-sm bg-tl-bg border border-tl-border hover:border-tl-accent/60 hover:bg-tl-surface2 transition text-left text-xs font-mono group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-tl-text text-[11px] font-semibold group-hover:text-tl-accent transition-colors truncate">
                      {action.label}
                    </span>
                    <ArrowRight className="w-3 h-3 text-tl-muted group-hover:text-tl-accent transition-colors flex-shrink-0 ml-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="space-y-3.5 pt-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start w-full"
              }`}
            >
              {/* Sender & Timestamp */}
              <div className="flex items-center gap-1.5 mb-1 px-0.5 text-[10px] font-mono text-tl-muted">
                {msg.sender === "assistant" ? (
                  <span className="font-bold uppercase tracking-wider text-tl-text">Touchline Analyst</span>
                ) : (
                  <span className="font-medium text-tl-muted">You</span>
                )}
                <span>·</span>
                <span className="tabular-nums">{msg.timestamp}</span>
              </div>

              {/* Message Body */}
              {msg.sender === "user" ? (
                <div className="max-w-[85%] bg-tl-surface2 border border-tl-border text-tl-text rounded-sm px-3 py-2 text-xs sm:text-[13px] leading-relaxed">
                  <p>{msg.text}</p>
                </div>
              ) : (
                <div className="w-full space-y-2 py-0.5">
                  {/* Clean Editorial Markdown Text */}
                  {msg.text && <FormattedMessage content={msg.text} />}

                  {/* Player Comparison Card Component */}
                  {msg.comparisonCard && (
                    <PlayerComparisonCard
                      data={msg.comparisonCard}
                      onSetCaptain={onSetCaptain}
                      onFollowUpQuestion={(q) => handleSendMessage(q)}
                    />
                  )}

                  {/* Quick Action Buttons */}
                  {msg.quickActions && msg.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.quickActions.map((qa, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(qa.label, qa.action)}
                          className="text-[11px] font-mono text-tl-muted hover:text-tl-text bg-tl-surface border border-tl-border rounded-sm px-2.5 py-1 transition"
                        >
                          {qa.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* AI Typographic Thinking Indicator */}
          {isThinking && (
            <div className="flex items-center gap-2 py-2 text-xs font-mono text-tl-muted">
              <span className="text-tl-accent">■</span>
              <span>Running model analysis...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 2. Anchored Bottom Input Container */}
      <div className="flex-shrink-0 bg-tl-bg border-t border-tl-border p-2.5">
        <div className="w-full max-w-2xl mx-auto flex items-center gap-1.5">
          {/* Voice Mic Button */}
          <button
            onClick={handleMicToggle}
            aria-label="Voice input"
            className={`p-2 rounded-sm border transition ${
              isRecordingVoice
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-tl-surface border border-tl-border text-tl-muted hover:text-tl-text"
            }`}
          >
            {isRecordingVoice ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Text Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex-1 flex items-center gap-1.5 bg-tl-surface border border-tl-border focus-within:border-tl-accent rounded-sm px-3 py-0.5 transition"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask tactical question..."
              className="w-full bg-transparent text-xs text-tl-text placeholder:text-tl-muted focus:outline-none py-1.5 font-sans"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isThinking}
              aria-label="Send message"
              className={`p-1.5 rounded-sm transition ${
                inputValue.trim() && !isThinking
                  ? "text-tl-accent hover:opacity-80"
                  : "text-tl-muted/40 cursor-not-allowed"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
