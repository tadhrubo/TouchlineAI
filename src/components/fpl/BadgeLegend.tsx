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

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={
          buttonClassName ||
          "flex items-center gap-1.5 px-2 py-1 rounded-sm bg-tl-bg border border-tl-border text-[11px] font-mono text-tl-muted hover:text-tl-text hover:border-tl-muted transition"
        }
        title="LiveFPL Performance Badges Legend"
      >
        <Info className="w-3.5 h-3.5 text-tl-accent" />
        <span>LEGEND</span>
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
              className="relative w-full max-w-sm bg-tl-surface border border-tl-border rounded-md p-4 space-y-3.5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-tl-border">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-tl-text">
                  BADGE METRIC LEGEND
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-sm text-tl-muted hover:text-tl-text bg-tl-bg border border-tl-border transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 text-xs font-mono">
                {BADGE_LEGEND_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-3 p-2 rounded-sm bg-tl-bg border border-tl-border"
                  >
                    <span className="w-6 h-6 flex items-center justify-center rounded-sm bg-tl-surface2 border border-tl-border text-xs">
                      {item.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-tl-text">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-tl-muted">
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
                CLOSE
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
