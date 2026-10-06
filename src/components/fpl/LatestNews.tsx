"use client";

import React, { useState } from "react";
import { NewsItem } from "@/types/fpl";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface LatestNewsProps {
  news: NewsItem[];
}

export const LatestNews: React.FC<LatestNewsProps> = ({ news }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full bg-neutral-900/40 border border-white/10 rounded-xl p-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] mb-2 px-1 text-xs">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
          Squad Status & Flags
        </span>
        <span className="text-[10px] text-neutral-400 font-mono tabular-nums">
          {news.length} {news.length === 1 ? "alert" : "alerts"}
        </span>
      </div>

      {/* News Item List */}
      <div className="space-y-1.5">
        {news.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => toggleExpand(item.id)}
              className="w-full min-h-[44px] p-2.5 rounded-lg bg-neutral-950/60 border border-white/[0.04] hover:border-white/10 transition text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-neutral-200 truncate font-medium">
                    {item.headline}
                  </span>
                </div>
                {item.detail && (
                  <div className="text-neutral-400 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                )}
              </div>

              {isExpanded && item.detail && (
                <p className="mt-2 pt-2 border-t border-white/[0.06] text-[11px] text-neutral-300 leading-relaxed font-sans">
                  {item.detail}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
