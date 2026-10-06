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
    <div className="w-full bg-[#0D1110] border border-[#1E2421] p-3 text-[#F1F3EF]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1E2421] mb-2 px-1 text-xs">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[#7F8983] font-mono">
          SQUAD STATUS & INJURY FLAGS
        </span>
        <span className="text-[10px] text-[#7F8983] font-mono tabular-nums">
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
              className="w-full p-2.5 rounded-sm bg-[#070908] border border-[#1E2421] hover:border-neutral-600 transition text-left text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D6A83D] flex-shrink-0" />
                  <span className="text-[#F1F3EF] truncate font-medium">
                    {item.headline}
                  </span>
                </div>
                {item.detail && (
                  <div className="text-[#7F8983] flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                )}
              </div>

              {isExpanded && item.detail && (
                <p className="mt-2 pt-2 border-t border-[#1E2421] text-[11px] text-[#7F8983] leading-relaxed font-sans">
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
