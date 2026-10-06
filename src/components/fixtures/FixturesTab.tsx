"use client";

import React, { useState, useEffect } from "react";
import { ScheduleView } from "./ScheduleView";
import { FDRTickerView } from "./FDRTickerView";
import { MatchFixture, TeamFDRRow } from "@/app/api/fixtures/route";

interface FixturesTabProps {
  currentGameweek: number;
}

export const FixturesTab: React.FC<FixturesTabProps> = ({
  currentGameweek = 1,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"schedule" | "fdr">("schedule");
  const [selectedGameweek, setSelectedGameweek] = useState<number>(currentGameweek);
  const [fixtures, setFixtures] = useState<MatchFixture[]>([]);
  const [fdrMatrix, setFdrMatrix] = useState<TeamFDRRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch full fixtures data and FDR matrix
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/fixtures?event=${selectedGameweek}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.fixtures) {
            setFixtures(data.fixtures);
          }
          if (data.fdrMatrix) {
            setFdrMatrix(data.fdrMatrix);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load fixtures data:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGameweek]);

  return (
    <div className="w-full space-y-3 animate-fade-in select-none text-tl-text">
      {/* Editorial Sub-Navigation Strip */}
      <div className="flex items-center border-b border-tl-border gap-6 px-0.5">
        <button
          onClick={() => setActiveSubTab("schedule")}
          className={`relative pb-2 pt-1 text-xs uppercase tracking-wider font-semibold transition-colors ${
            activeSubTab === "schedule"
              ? "text-tl-text"
              : "text-tl-muted hover:text-tl-text"
          }`}
        >
          Match Schedule
          {activeSubTab === "schedule" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-tl-accent" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("fdr")}
          className={`relative pb-2 pt-1 text-xs uppercase tracking-wider font-semibold transition-colors ${
            activeSubTab === "fdr"
              ? "text-tl-text"
              : "text-tl-muted hover:text-tl-text"
          }`}
        >
          FDR Heatmap
          {activeSubTab === "fdr" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-tl-accent" />
          )}
        </button>
      </div>

      {/* Sub-Tab View Rendering */}
      {activeSubTab === "schedule" ? (
        <ScheduleView
          currentGameweek={currentGameweek}
          selectedGameweek={selectedGameweek}
          fixtures={fixtures}
          isLoading={isLoading}
          onSelectGameweek={setSelectedGameweek}
        />
      ) : (
        <FDRTickerView
          currentGameweek={currentGameweek}
          fdrMatrix={fdrMatrix}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};
