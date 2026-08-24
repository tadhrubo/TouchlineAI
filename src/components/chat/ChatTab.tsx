"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Player,
  TeamStats,
  InsightItem,
  ChatMessage,
} from "@/types/fpl";
import { PlayerComparisonCard } from "./PlayerComparisonCard";
import {
  Send,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
  Shield,
  ArrowRight,
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

const ACTION_PROMPTS = [
  {
    id: "p1",
    label: "Captaincy advice",
    prompt: "Who should I captain for Gameweek 2?",
  },
  {
    id: "p2",
    label: "Optimize starting XI",
    prompt: "Optimize my starting XI and bench priority order.",
  },
  {
    id: "p3",
    label: "Transfer targets",
    prompt: "What are the best transfer targets given my squad and budget?",
  },
  {
    id: "p4",
    label: "Squad fitness & flags",
    prompt: "Check any injury flags or rotation risks in my squad.",
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
          <strong key={idx} className="font-semibold text-neutral-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-2 text-xs sm:text-[13px] leading-relaxed text-neutral-300">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={i}
              className="text-sm font-bold text-neutral-100 tracking-tight pt-1.5"
            >
              {parseInline(trimmed.slice(4))}
            </h4>
          );
        }

        if (trimmed.startsWith("#### ")) {
          return (
            <h5
              key={i}
              className="text-xs font-semibold text-neutral-200 pt-1"
            >
              {parseInline(trimmed.slice(5))}
            </h5>
          );
        }

        if (trimmed.startsWith("---")) {
          return <hr key={i} className="border-white/[0.06] my-2" />;
        }

        if (
          trimmed.startsWith("* ") ||
          trimmed.startsWith("- ") ||
          trimmed.startsWith("• ")
        ) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-emerald-400 select-none leading-none mt-1">•</span>
              <span className="flex-1">{parseInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+\.)\s(.*)$/);
          if (match) {
            return (
              <div key={i} className="flex items-start gap-2 pl-1">
                <span className="text-neutral-500 font-mono text-[11px] select-none">
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
  const [liveInsights, setLiveInsights] = useState<InsightItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize clean welcome message when squad loads or changes
  useEffect(() => {
    if (entryId && stats && players.length > 0) {
      const firstName = stats.managerName.split(" ")[0];
      setMessages([
        {
          id: `welcome-${entryId}`,
          sender: "assistant",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          text: `Welcome back, **${firstName}**. I've loaded your squad data for **${stats.teamName}** (Gameweek ${stats.nextGameweek}).\n\nHow can I assist with your captaincy picks, starting XI, or transfer targets?`,
        },
      ]);
    } else {
      setMessages([]);
    }
  }, [entryId, stats?.teamName]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Handle external pending prompt from Home Tab
  useEffect(() => {
    if (pendingPrompt && entryId) {
      handleSendMessage(pendingPrompt);
      onClearPendingPrompt?.();
    }
  }, [pendingPrompt, entryId]);

  const toggleInsight = (id: string) => {
    setExpandedInsightId((prev) => (prev === id ? null : id));
  };

  // If no entryId or squad is loaded, prompt to connect squad
  if (!entryId || !stats || players.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
        <div className="p-3 rounded-xl bg-neutral-900 border border-white/[0.06] text-neutral-400">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-medium text-neutral-200">
          No FPL Squad Connected
        </h3>
        <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
          Please enter your FPL Entry ID on the Home tab to activate your personalized AI strategist.
        </p>
      </div>
    );
  }

  // Find active captain and vice-captain
  const captain =
    players.find((p) => p.id === captainId || p.isCaptain) || players[0] || null;
  const viceCaptain =
    players.find((p) => p.id === viceCaptainId || p.isViceCaptain) ||
    players[1] ||
    null;

  // Send message to /api/chat
  const handleSendMessage = async (textToSend?: string, actionType?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text && !actionType) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      text: text || actionType || "Analyze Squad",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsThinking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: entryId,
          message: text,
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
        text: `Sorry, I encountered an issue analyzing your squad for Team #${entryId}. Please try again.`,
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

  const firstName = stats.managerName.split(" ")[0];

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-black">
      {/* 1. Scrollable Message & Context Container (Takes all remaining height) */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3.5 space-y-3">
        {/* Context Summary Bar */}
        <div className="w-full py-2 border-b border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-200">
                {firstName} · {stats.teamName}
              </span>
              <span className="text-neutral-600">/</span>
              <span className="font-mono text-neutral-400">GW{stats.nextGameweek}</span>
            </div>

            <div className="font-mono text-xs text-neutral-300 font-medium">
              Rank #{stats.overallRank.toLocaleString()}
            </div>
          </div>

          {/* Telemetry Row */}
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-neutral-200 font-medium">{stats.formation}</span>
              <span className="text-neutral-600">·</span>
              <span className="text-emerald-400 font-medium">{stats.freeTransfers} FT</span>
              <span className="text-neutral-600">·</span>
              <span>£{stats.inTheBank.toFixed(1)}m ITB</span>
            </div>

            <div>
              <span className="text-neutral-300 font-medium">
                (C) {captain?.webName || "Captain"}
              </span>
              <span className="text-neutral-600 mx-1">/</span>
              <span className="text-neutral-400">
                (VC) {viceCaptain?.webName || "Vice"}
              </span>
            </div>
          </div>

          {/* Expandable Live Insights if generated */}
          {liveInsights.length > 0 && (
            <div className="space-y-1.5 pt-1.5">
              {liveInsights.map((item) => {
                const isExpanded = expandedInsightId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleInsight(item.id)}
                    className="p-2 rounded-lg bg-neutral-900/40 border border-white/[0.06] hover:border-white/[0.1] transition cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            item.severity === "danger"
                              ? "bg-rose-400"
                              : item.severity === "warning"
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          }`}
                        />
                        <span className="font-medium text-neutral-200 truncate">
                          {item.title}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-1.5 pt-1.5 border-t border-white/[0.04] text-neutral-400 text-[11px] leading-relaxed">
                        <p>{item.expandedDetail}</p>
                        {item.actionText && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.actionPayload?.startsWith("captain-")) {
                                const pId = item.actionPayload.replace(
                                  "captain-",
                                  ""
                                );
                                onSetCaptain(pId);
                              } else {
                                handleSendMessage(item.actionText);
                              }
                            }}
                            className="mt-1.5 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
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

        {/* Editorial Action Chips */}
        <div className="w-full overflow-x-auto no-scrollbar py-0.5 flex items-center gap-1.5">
          {ACTION_PROMPTS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSendMessage(p.prompt)}
              className="flex-shrink-0 text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800/80 rounded-full px-3.5 py-1.5 transition-colors whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Messages Stream */}
        <div className="space-y-4 pt-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start w-full"
              }`}
            >
              {/* Sender & Timestamp */}
              <div className="flex items-center gap-1.5 mb-1 px-0.5 text-[10px] font-mono text-neutral-500">
                {msg.sender === "assistant" ? (
                  <div className="flex items-center gap-1">
                    <img
                      src="/asset/image/tlai.png"
                      alt="Touchline AI"
                      className="w-3.5 h-3.5 object-contain"
                    />
                    <span className="font-medium text-neutral-300">Touchline AI</span>
                  </div>
                ) : (
                  <span className="font-medium text-neutral-400">You</span>
                )}
                <span>·</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Body */}
              {msg.sender === "user" ? (
                <div className="max-w-[85%] bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed">
                  <p>{msg.text}</p>
                </div>
              ) : (
                <div className="w-full space-y-3 py-1">
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

                  {/* Quick Action Chips */}
                  {msg.quickActions && msg.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.quickActions.map((qa, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(qa.label, qa.action)}
                          className="text-[11px] font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-full px-3 py-1 transition"
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

          {/* AI Typing / Thinking Indicator */}
          {isThinking && (
            <div className="flex items-center gap-2 py-2 text-neutral-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Evaluating squad telemetry...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 2. Anchored Bottom Input Container (Natural bottom flex child) */}
      <div className="flex-shrink-0 bg-black border-t border-white/[0.06] p-2.5">
        <div className="w-full flex items-center gap-1.5">
          {/* Voice Mic Button */}
          <button
            onClick={handleMicToggle}
            aria-label="Voice input"
            className={`p-2 rounded-lg border transition ${
              isRecordingVoice
                ? "bg-rose-500 text-white border-rose-400 animate-pulse"
                : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200"
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
            className="flex-1 flex items-center gap-1.5 bg-neutral-900/80 border border-neutral-800 focus-within:border-white/[0.15] rounded-xl px-3 py-1 transition"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Touchline AI (e.g. Captain, Transfer)..."
              className="w-full bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none py-1.5"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isThinking}
              aria-label="Send message"
              className={`p-1.5 rounded-lg transition ${
                inputValue.trim() && !isThinking
                  ? "text-neutral-100 hover:text-emerald-400"
                  : "text-neutral-600 cursor-not-allowed"
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
