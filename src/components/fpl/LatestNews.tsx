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
    <div className="w-full bg-tl-surface border border-tl-border p-3 text-tl-text">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-tl-border mb-2 px-1 text-xs">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-tl-muted font-mono">
          SQUAD STATUS & INJURY FLAGS
        </span>
        <span className="text-[10px] text-tl-muted font-mono tabular-nums">
          {news.length} {news.length === 1 ? "ALERT" : "ALERTS"}
        </span>
      </div>

      {/* News Item List */}
      <div className="space-y-1">
        {news.map((item) => {
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
        })}
      </div>
    </div>
  );
};
