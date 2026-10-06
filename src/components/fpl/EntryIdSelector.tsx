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
    <div className="w-full mb-1">
      {/* Understated inline header strip */}
      <div className="flex items-center justify-between py-1 px-0.5 text-xs">
        <div className="flex items-center gap-1.5 text-[#7F8983] font-mono text-[11px]">
          <span className="uppercase tracking-wider">Squad ID:</span>
          <span className="text-[#F1F3EF] font-semibold">#{currentEntryId}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-[11px] font-mono text-[#7F8983] hover:text-[#F1F3EF] bg-[#0D1110] hover:bg-[#111614] border border-[#1E2421] rounded-sm px-2 py-0.5 transition"
          >
            {isOpen ? "Cancel" : "Change ID"}
          </button>

          {onClearEntryId && (
            <button
              onClick={onClearEntryId}
              title="Disconnect"
              className="text-[#7F8983] hover:text-[#E05252] p-0.5 transition"
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
          className="mt-1.5 flex items-center gap-1.5 bg-[#0D1110] border border-[#1E2421] rounded-sm p-1.5 animate-fade-in"
        >
          <input
            type="number"
            autoFocus
            placeholder="Enter FPL Team ID"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="flex-1 bg-transparent px-2 py-1 text-xs font-mono text-[#F1F3EF] placeholder-[#7F8983] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            className="px-2.5 py-1 rounded-sm bg-[#F1F3EF] hover:bg-white text-[#070908] text-xs font-semibold disabled:opacity-40 transition flex items-center gap-1"
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
