"use client";

import React, { useState } from "react";
import { RefreshCw, X, ArrowRight } from "lucide-react";

interface EntryIdSelectorProps {
  currentEntryId: string;
  onSelectEntryId: (entryId: string) => void;
  onClearEntryId?: () => void;
  isLoading?: boolean;
}

export const EntryIdSelector: React.FC<EntryIdSelectorProps> = ({
  currentEntryId,
  onSelectEntryId,
  onClearEntryId,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(currentEntryId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (clean && !isNaN(Number(clean))) {
      onSelectEntryId(clean);
      setIsOpen(false);
    }
  };

  if (!currentEntryId) return null;

  return (
    <div className="w-full mb-2">
      {/* Understated inline header strip */}
      <div className="flex items-center justify-between py-1 px-1 text-xs">
        <div className="flex items-center gap-1.5 text-neutral-400 font-mono text-[11px]">
          <span>Squad ID:</span>
          <span className="text-neutral-200 font-medium">#{currentEntryId}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-[11px] text-neutral-400 hover:text-neutral-200 bg-neutral-900/80 hover:bg-neutral-800 border border-white/[0.06] rounded-md px-2 py-0.5 transition"
          >
            {isOpen ? "Cancel" : "Change ID"}
          </button>

          {onClearEntryId && (
            <button
              onClick={onClearEntryId}
              title="Disconnect"
              className="text-neutral-500 hover:text-rose-400 p-0.5 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable minimal input field */}
      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-1.5 flex items-center gap-1.5 bg-neutral-900/90 border border-white/[0.08] rounded-lg p-1.5 animate-fade-in"
        >
          <input
            type="number"
            autoFocus
            placeholder="Enter FPL Team ID"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="flex-1 bg-transparent px-2 py-1 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            className="px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-medium disabled:opacity-40 transition flex items-center gap-1"
          >
            {isLoading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <span>Load</span>
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
