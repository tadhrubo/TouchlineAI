"use client";

import React, { useState, useEffect } from "react";
import { ScheduleView } from "./ScheduleView";
import { FDRTickerView } from "./FDRTickerView";
import { MatchFixture, TeamFDRRow } from "@/app/api/fixtures/route";
import { RefreshCw, Calendar, Grid } from "lucide-react";

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
    <div className="w-full space-y-3 animate-fade-in select-none">
      {/* Segmented Sub-Tab Controller: [ Fixtures ] [ FDR ] */}
      <div className="flex items-center p-1 bg-neutral-900/80 border border-white/[0.08] rounded-xl shadow-sm">
        <button
          onClick={() => setActiveSubTab("schedule")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === "schedule"
              ? "bg-neutral-800 text-neutral-100 shadow-sm font-semibold"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Fixtures</span>
        </button>

        <button
          onClick={() => setActiveSubTab("fdr")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === "fdr"
              ? "bg-neutral-800 text-emerald-400 shadow-sm font-semibold"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>FDR Ticker</span>
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
