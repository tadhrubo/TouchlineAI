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
    label: "Captaincy Advice",
    prompt: "Who should I captain for Gameweek 2?",
  },
  {
    id: "p2",
    label: "Optimize XI",
    prompt: "Optimize my starting XI and bench priority order.",
  },
  {
    id: "p3",
    label: "Transfer Targets",
    prompt: "What are the best transfer targets given my squad and budget?",
  },
  {
    id: "p4",
    label: "Fitness & Flags",
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
          <strong key={idx} className="font-semibold text-[#F1F3EF]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed text-[#F1F3EF]">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={i} className="h-0.5" />;
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={i}
              className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#F1F3EF] pt-1"
            >
              {parseInline(trimmed.slice(4))}
            </h4>
          );
        }

        if (trimmed.startsWith("#### ")) {
          return (
            <h5
              key={i}
              className="text-xs font-semibold text-[#7F8983] uppercase tracking-wider pt-0.5"
            >
              {parseInline(trimmed.slice(5))}
            </h5>
          );
        }

        if (trimmed.startsWith("---")) {
          return <hr key={i} className="border-[#1E2421] my-1.5" />;
        }

        if (
          trimmed.startsWith("* ") ||
          trimmed.startsWith("- ") ||
          trimmed.startsWith("• ")
        ) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-[#16C784] select-none leading-none mt-1">•</span>
              <span className="flex-1">{parseInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+\.)\s(.*)$/);
          if (match) {
            return (
              <div key={i} className="flex items-start gap-2 pl-1">
                <span className="text-[#7F8983] font-mono text-[11px] select-none">
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const captain = players.find((p) => p.id === captainId);
  const viceCaptain = players.find((p) => p.id === viceCaptainId);

  // Initialize with initial assistant briefing
  useEffect(() => {
    if (messages.length === 0 && stats) {
      setMessages([
        {
          id: "msg-init",
          sender: "assistant",
          timestamp: "Just now",
          text: `Matchday desk loaded for **${stats.teamName}** (GW${stats.nextGameweek}). Ask for captaincy analysis, tactical XI optimization, or transfer models.`,
          quickActions: [
            { label: "Captaincy Brief", action: "captaincy" },
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
    <div className="w-full h-full flex flex-col min-h-0 bg-[#070908]">
      {/* 1. Scrollable Message & Context Container */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3.5 space-y-3 max-w-2xl mx-auto w-full">
        {/* Context Summary Bar */}
        <div className="w-full py-1.5 border-b border-[#1E2421] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#7F8983]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#F1F3EF]">
                {firstName} · {stats.teamName}
              </span>
              <span className="text-[#1E2421]">/</span>
              <span className="font-mono text-[#7F8983]">GW{stats.nextGameweek}</span>
            </div>

            <div className="font-mono text-xs text-[#F1F3EF] font-semibold tabular-nums">
              Rank #{stats.overallRank.toLocaleString()}
            </div>
          </div>

          {/* Telemetry Row */}
          <div className="flex items-center justify-between text-[11px] text-[#7F8983] font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[#F1F3EF] font-semibold">{stats.formation}</span>
              <span className="text-[#1E2421]">·</span>
              <span className="text-[#16C784] font-semibold">{stats.freeTransfers} FT</span>
              <span className="text-[#1E2421]">·</span>
              <span>£{stats.inTheBank.toFixed(1)}m ITB</span>
            </div>

            <div>
              <span className="text-[#F1F3EF] font-semibold">
                (C) {captain?.webName || "Captain"}
              </span>
              <span className="text-[#1E2421] mx-1">/</span>
              <span className="text-[#7F8983]">
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
                    className="p-2 rounded-sm bg-[#0D1110] border border-[#1E2421] hover:border-[#16C784]/30 transition cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-none flex-shrink-0 ${
                            item.severity === "danger"
                              ? "bg-[#E05252]"
                              : item.severity === "warning"
                              ? "bg-[#D6A83D]"
                              : "bg-[#16C784]"
                          }`}
                        />
                        <span className="font-medium text-[#F1F3EF] truncate">
                          {item.title}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#7F8983]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#7F8983]" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-1.5 pt-1.5 border-t border-[#1E2421] text-[#7F8983] text-[11px] leading-relaxed">
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
                            className="mt-1.5 text-[11px] font-semibold text-[#16C784] hover:underline flex items-center gap-1 font-mono"
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

        {/* Editorial Action Prompts */}
        <div className="w-full overflow-x-auto no-scrollbar py-0.5 flex items-center gap-1.5">
          {ACTION_PROMPTS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSendMessage(p.prompt)}
              className="flex-shrink-0 text-xs font-mono font-medium text-[#7F8983] bg-[#0D1110] hover:text-[#F1F3EF] hover:bg-[#111614] border border-[#1E2421] rounded-sm px-2.5 py-1 transition-colors whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
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
              <div className="flex items-center gap-1.5 mb-1 px-0.5 text-[10px] font-mono text-[#7F8983]">
                {msg.sender === "assistant" ? (
                  <span className="font-bold uppercase tracking-wider text-[#F1F3EF]">Touchline Analyst</span>
                ) : (
                  <span className="font-medium text-[#7F8983]">You</span>
                )}
                <span>·</span>
                <span className="tabular-nums">{msg.timestamp}</span>
              </div>

              {/* Message Body */}
              {msg.sender === "user" ? (
                <div className="max-w-[85%] bg-[#111614] border border-[#1E2421] text-[#F1F3EF] rounded-sm px-3 py-2 text-xs sm:text-[13px] leading-relaxed">
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
                          className="text-[11px] font-mono text-[#7F8983] hover:text-[#F1F3EF] bg-[#0D1110] border border-[#1E2421] rounded-sm px-2.5 py-1 transition"
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
            <div className="flex items-center gap-2 py-2 text-xs font-mono uppercase tracking-wider text-[#7F8983]">
              <span className="text-[#16C784]">■</span>
              <span>Running model analysis...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 2. Anchored Bottom Input Container */}
      <div className="flex-shrink-0 bg-[#070908] border-t border-[#1E2421] p-2.5">
        <div className="w-full max-w-2xl mx-auto flex items-center gap-1.5">
          {/* Voice Mic Button */}
          <button
            onClick={handleMicToggle}
            aria-label="Voice input"
            className={`p-2 rounded-sm border transition ${
              isRecordingVoice
                ? "bg-[#E05252] text-white border-[#E05252]"
                : "bg-[#0D1110] border-[#1E2421] text-[#7F8983] hover:text-[#F1F3EF]"
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
            className="flex-1 flex items-center gap-1.5 bg-[#0D1110] border border-[#1E2421] focus-within:border-[#16C784] rounded-sm px-3 py-0.5 transition"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Touchline Analyst (e.g. Captain, Transfer)..."
              className="w-full bg-transparent text-xs text-[#F1F3EF] placeholder-[#7F8983] focus:outline-none py-1.5 font-sans"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isThinking}
              aria-label="Send message"
              className={`p-1.5 rounded-sm transition ${
                inputValue.trim() && !isThinking
                  ? "text-[#16C784] hover:text-[#13ab71]"
                  : "text-[#7F8983]/40 cursor-not-allowed"
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
