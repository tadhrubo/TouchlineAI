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
    <div className="w-full">
      {/* Compressed inline header strip */}
      <div className="flex items-center justify-between py-0.5 px-0.5 text-xs">
        <div className="flex items-center gap-1.5 text-tl-muted font-mono text-[11px]">
          <span className="uppercase tracking-wider">Squad ID:</span>
          <span className="text-tl-text font-semibold">#{currentEntryId}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-[10px] font-mono text-tl-muted hover:text-tl-text bg-tl-surface hover:bg-tl-surface2 border border-tl-border rounded-sm px-1.5 py-0.5 transition"
          >
            {isOpen ? "Cancel" : "Change ID"}
          </button>

          {onClearEntryId && (
            <button
              onClick={onClearEntryId}
              title="Disconnect"
              className="text-tl-muted hover:text-tl-negative p-0.5 transition"
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
          className="mt-1 flex items-center gap-1.5 bg-tl-surface border border-tl-border rounded-sm p-1.5 animate-fade-in"
        >
          <input
            type="number"
            autoFocus
            placeholder="Enter FPL Team ID"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="flex-1 bg-transparent px-2 py-0.5 text-xs font-mono text-tl-text placeholder-tl-muted focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            className="px-2.5 py-0.5 rounded-sm bg-tl-text hover:opacity-90 text-tl-bg text-xs font-semibold disabled:opacity-40 transition flex items-center gap-1"
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
