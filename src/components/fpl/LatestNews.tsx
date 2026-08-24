"use client";

import React, { useState } from "react";
import { NewsItem } from "@/types/fpl";
import { ChevronDown, ChevronUp } from "lucide-react";

interface LatestNewsProps {
  news: NewsItem[];
}

export const LatestNews: React.FC<LatestNewsProps> = ({ news }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full bg-neutral-900/40 border border-white/[0.06] rounded-xl p-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] mb-2 px-1 text-xs">
        <span className="text-[10px] uppercase tracking-wider font-medium text-neutral-400">
          Squad Status & Flags
        </span>
        <span className="text-[10px] text-neutral-500 font-mono">
          {news.length} {news.length === 1 ? "alert" : "alerts"}
        </span>
      </div>

      {/* News Item List */}
      <div className="space-y-1.5">
        {news.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => toggleExpand(item.id)}
              className="p-2 rounded-lg bg-neutral-950/60 border border-white/[0.04] hover:border-white/[0.08] transition cursor-pointer text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-neutral-200 truncate font-medium">
                    {item.headline}
                  </span>
                </div>
                {item.detail && (
                  <div className="text-neutral-500 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                )}
              </div>

              {isExpanded && item.detail && (
                <p className="mt-1.5 pt-1.5 border-t border-white/[0.04] text-[11px] text-neutral-400 leading-relaxed">
                  {item.detail}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
