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
          "flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-900/90 border border-white/[0.08] text-[11px] font-mono text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition shadow-sm active:scale-95"
        }
        title="LiveFPL Performance Badges Legend"
      >
        <Info className="w-3.5 h-3.5 text-emerald-400" />
        <span>Legend</span>
      </button>

      {/* Legend Modal / Bottom Sheet */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="relative w-full max-w-sm bg-[#0E121A] border border-white/[0.12] rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold font-mono text-neutral-100">
                    LiveFPL Badge Legend
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Legend List */}
              <div className="space-y-2 text-xs font-mono">
                {BADGE_LEGEND_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-3 p-2 rounded-xl bg-neutral-900/60 border border-white/[0.04]"
                  >
                    <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/50 border border-white/[0.08] text-sm">
                      {item.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-neutral-200">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {item.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Close Footer Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/[0.08] text-xs font-mono font-medium text-neutral-200 transition"
              >
                Got it
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
