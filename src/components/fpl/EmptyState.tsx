"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ArrowRight, HelpCircle, RefreshCw } from "lucide-react";

interface EmptyStateProps {
  onLoadEntryId: (id: string) => void;
  isLoading?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onLoadEntryId,
  isLoading = false,
}) => {
  const [inputVal, setInputVal] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (clean && !isNaN(Number(clean))) {
      onLoadEntryId(clean);
    }
  };

  return (
    <div className="w-full min-h-[420px] flex flex-col items-center justify-center p-6 text-center space-y-4 rounded-2xl bg-neutral-900/30 border border-white/[0.06] my-auto animate-fade-in">
      {/* Brand Logo */}
      <div className="flex items-center justify-center">
        <Image
          src="/asset/image/tlai.png"
          alt="Touchline AI"
          width={54}
          height={54}
          className="w-14 h-14 object-contain drop-shadow-md"
          priority
        />
      </div>

      {/* Title & Description */}
      <div className="space-y-1.5 max-w-xs">
        <h2 className="text-lg font-bold text-neutral-100 tracking-tight">
          Connect Your FPL Squad
        </h2>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Enter your Fantasy Premier League Entry ID to load live squad data and AI tactical decisions.
        </p>
      </div>

      {/* Entry ID Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-2.5">
        <input
          type="number"
          autoFocus
          placeholder="Enter FPL Entry ID"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          className="w-full bg-neutral-950 border border-white/[0.08] focus:border-emerald-500/60 rounded-xl px-4 py-2.5 text-xs font-mono font-medium text-neutral-100 placeholder-neutral-600 focus:outline-none transition text-center tracking-wider"
        />

        <button
          type="submit"
          disabled={isLoading || !inputVal.trim()}
          className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-white disabled:opacity-40 text-neutral-950 font-medium text-xs transition active:scale-95 flex items-center justify-center gap-1.5"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Fetching Squad...</span>
            </>
          ) : (
            <>
              <span>Load Squad</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Where to find ID Guide */}
      <div className="w-full max-w-xs pt-2 border-t border-white/[0.04] text-left">
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-300 transition mx-auto"
        >
          <HelpCircle className="w-3 h-3 text-neutral-500" />
          <span>How to find your Entry ID</span>
        </button>

        {showHelp && (
          <div className="mt-2 p-2.5 rounded-lg bg-neutral-950 border border-white/[0.06] text-[11px] text-neutral-400 leading-relaxed space-y-1 animate-fade-in">
            <p className="font-medium text-neutral-200">1. Log in to fantasy.premierleague.com</p>
            <p>2. Go to the <span className="text-neutral-200">Points</span> tab.</p>
            <p>
              3. Check the URL:
              <br />
              <code className="text-[10px] text-neutral-300 font-mono">
                .../entry/<b>[YOUR_ID]</b>/event/...
              </code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
