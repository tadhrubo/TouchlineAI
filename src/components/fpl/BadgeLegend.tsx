"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { BADGE_LEGEND_ITEMS } from "@/utils/fplBadges";

interface BadgeLegendProps {
  buttonClassName?: string;
}

export const BadgeLegend: React.FC<BadgeLegendProps> = ({ buttonClassName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getToneClass = (tone: string) => {
    switch (tone) {
      case "accent":
        return "bg-tl-accent/15 text-tl-accent border-tl-accent/30";
      case "negative":
        return "bg-tl-negative/15 text-tl-negative border-tl-negative/30";
      case "warning":
        return "bg-tl-warning/15 text-tl-warning border-tl-warning/30";
      default:
        return "bg-tl-surface2 text-tl-muted border-tl-border";
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={
          buttonClassName ||
          "flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-tl-surface border border-tl-border text-[10px] font-mono text-tl-muted hover:text-tl-text hover:border-tl-muted transition"
        }
        title="Tactical Performance Badges Legend"
      >
        <Info className="w-3 h-3 text-tl-accent" />
        <span className="uppercase tracking-wider font-semibold">Legend</span>
      </button>

      {/* Legend Modal */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 animate-fade-in text-tl-text"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="relative w-full max-w-sm bg-tl-surface border border-tl-border rounded-md p-4 space-y-3.5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-tl-border">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-tl-text">
                  Tactical Badge Legend
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close legend"
                  className="w-7 h-7 flex items-center justify-center rounded-sm text-tl-muted hover:text-tl-text bg-tl-bg border border-tl-border transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 text-xs font-mono">
                {BADGE_LEGEND_ITEMS.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-sm bg-tl-bg border border-tl-border"
                  >
                    <span
                      className={`min-w-[42px] h-6 flex items-center justify-center rounded-sm border text-[10px] font-bold font-mono tracking-tight px-1.5 ${getToneClass(
                        item.tone
                      )}`}
                    >
                      {item.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-tl-text leading-tight">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-tl-muted leading-tight mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Close Footer Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 rounded-sm bg-tl-bg hover:bg-tl-surface2 border border-tl-border text-xs font-mono font-medium text-tl-text transition"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
