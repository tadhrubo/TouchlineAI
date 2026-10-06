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
    <div className="w-full min-h-[420px] flex flex-col items-center justify-center p-6 text-center space-y-4 rounded-sm bg-tl-surface border border-tl-border my-auto animate-fade-in text-tl-text">
      {/* Brand Logo */}
      <div className="flex items-center justify-center">
        <Image
          src="/asset/image/tlai.png"
          alt="Touchline AI"
          width={48}
          height={48}
          className="w-12 h-12 object-contain"
          priority
        />
      </div>

      {/* Title & Description */}
      <div className="space-y-1.5 max-w-xs">
        <h2 className="text-base font-bold text-tl-text tracking-tight">
          CONNECT FPL SQUAD
        </h2>
        <p className="text-xs text-tl-muted leading-relaxed">
          Enter your Fantasy Premier League Entry ID to load live squad data and tactical models.
        </p>
      </div>

      {/* Entry ID Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-2">
        <input
          type="number"
          autoFocus
          placeholder="ENTER FPL ENTRY ID"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          className="w-full bg-tl-bg border border-tl-border focus:border-tl-accent rounded-sm px-4 py-2.5 text-xs font-mono font-medium text-tl-text placeholder:text-tl-muted focus:outline-none transition text-center tracking-wider"
        />

        <button
          type="submit"
          disabled={isLoading || !inputVal.trim()}
          className="w-full py-2.5 px-4 rounded-sm bg-tl-accent hover:opacity-90 disabled:opacity-40 text-tl-accentContrast font-bold text-xs transition flex items-center justify-center gap-1.5 font-mono"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>FETCHING SQUAD...</span>
            </>
          ) : (
            <>
              <span>LOAD SQUAD</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Where to find ID Guide */}
      <div className="w-full max-w-xs pt-2 border-t border-tl-border text-left">
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1 text-[11px] text-tl-muted hover:text-tl-text transition mx-auto font-mono"
        >
          <HelpCircle className="w-3 h-3 text-tl-muted" />
          <span>How to find your Entry ID</span>
        </button>

        {showHelp && (
          <div className="mt-2 p-2.5 rounded-sm bg-tl-bg border border-tl-border text-[11px] text-tl-muted leading-relaxed space-y-1">
            <p className="font-medium text-tl-text">1. Log in to fantasy.premierleague.com</p>
            <p>2. Go to the <span className="text-tl-text">Points</span> tab.</p>
            <p>
              3. Check the URL:
              <br />
              <code className="text-[10px] text-tl-accent font-mono">
                .../entry/<b>[YOUR_ID]</b>/event/...
              </code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
