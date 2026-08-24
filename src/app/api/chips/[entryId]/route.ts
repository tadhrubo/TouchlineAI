export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ChipStrategyResponse, GameweekStrategy, ChipStatus } from "@/types/fpl";

const FPL_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

// Strategic blueprint definition for all 38 Gameweeks
const STRATEGY_BLUEPRINT: Record<
  number,
  {
    chip: "WC1" | "WC2" | "FH" | "BB" | "TC";
    chipName: string;
    chipBadge: string;
    evDelta: string;
    isDGW: boolean;
    isBGW: boolean;
    dgwTeams?: string[];
    bgwTeams?: string[];
    rationale: string;
    keyMatchups: string[];
  }
> = {
  12: {
    chip: "WC1",
    chipName: "Wildcard 1",
    chipBadge: "WC 1",
    evDelta: "+14.5 pts",
    isDGW: false,
    isBGW: false,
    rationale:
      "Target post-international break window. Ideal pivot to reallocate budget, capitalize on winter fixture swings, and eliminate deadwood before festive congestion.",
    keyMatchups: ["Arsenal vs Forest (H)", "Man City vs Spurs (H)", "Liverpool vs Southampton (A)"],
  },
  25: {
    chip: "TC",
    chipName: "Triple Captain",
    chipBadge: "TC",
    evDelta: "+15.8 pts",
    isDGW: true,
    isBGW: false,
    dgwTeams: ["MCI", "BRE", "LIV", "LUT"],
    rationale:
      "High-ceiling Double Gameweek. Deploy armband multiplier on prime captain asset (Haaland/Salah) with two high-volume attacking fixtures.",
    keyMatchups: ["Man City vs Chelsea (H) & Brentford (H)", "Liverpool vs Luton (H) & Brentford (A)"],
  },
  29: {
    chip: "FH",
    chipName: "Free Hit",
    chipBadge: "FH",
    evDelta: "+19.4 pts",
    isDGW: false,
    isBGW: true,
    bgwTeams: ["ARS", "CHE", "LIV", "MCI", "MUN", "NEW", "TOT"],
    rationale:
      "Major Blank Gameweek clash with FA Cup Quarter-Finals. Free Hit fields a full 11-man squad without burning point hits or damaging long-term squad structure.",
    keyMatchups: ["Spurs vs Fulham (A)", "Aston Villa vs West Ham (A)", "Burnley vs Brentford (H)"],
  },
  35: {
    chip: "WC2",
    chipName: "Wildcard 2",
    chipBadge: "WC 2",
    evDelta: "+12.6 pts",
    isDGW: false,
    isBGW: false,
    rationale:
      "Late-season squad restructuring. Load up on 15 starting assets playing in Double Gameweeks 36 & 37 in direct preparation for the Bench Boost.",
    keyMatchups: ["Chelsea vs Spurs (H)", "Newcastle vs Burnley (A)", "Arsenal vs Bournemouth (H)"],
  },
  37: {
    chip: "BB",
    chipName: "Bench Boost",
    chipBadge: "BB",
    evDelta: "+22.4 pts",
    isDGW: true,
    isBGW: false,
    dgwTeams: ["ARS", "BHA", "CHE", "MCI", "MUN", "NEW", "TOT"],
    rationale:
      "The marquee Double Gameweek of the season. 15 active starters playing twice generates 30 total player appearances for maximum expected points return.",
    keyMatchups: ["Man City vs Fulham (A) & Spurs (A)", "Chelsea vs Forest (A) & Brighton (A)", "Newcastle vs Brighton (H) & Man Utd (A)"],
  },
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await context.params;
    const cleanId = String(entryId).trim();

    if (!cleanId || isNaN(Number(cleanId))) {
      return NextResponse.json(
        { error: "Invalid FPL Entry ID" },
        { status: 400 }
      );
    }

    // 1. Fetch Manager Overview
    const entryRes = await fetch(
      `https://fantasy.premierleague.com/api/entry/${cleanId}/`,
      { headers: FPL_HEADERS, next: { revalidate: 120 } }
    );

    if (!entryRes.ok) {
      return NextResponse.json(
        { error: `FPL Manager #${cleanId} not found` },
        { status: entryRes.status }
      );
    }
    const entryData = await entryRes.json();
    const managerName = `${entryData.player_first_name || ""} ${entryData.player_last_name || ""}`.trim() || "FPL Manager";
    const teamName = entryData.name || "My Team";
    const currentGW = entryData.current_event || 1;

    // 2. Fetch Entry History & Used Chips
    const historyRes = await fetch(
      `https://fantasy.premierleague.com/api/entry/${cleanId}/history/`,
      { headers: FPL_HEADERS, next: { revalidate: 120 } }
    );
    const historyData = historyRes.ok ? await historyRes.json() : { chips: [] };
    const usedChipsList: Array<{ name: string; time: string; event: number }> =
      historyData.chips || [];

    // Track chips status
    const chipsStatus: Record<string, ChipStatus> = {
      wildcard1: { available: true },
      wildcard2: { available: true },
      freehit: { available: true },
      benchBoost: { available: true },
      tripleCaptain: { available: true },
    };

    const usedChipMap = new Map<number, string>();

    for (const c of usedChipsList) {
      const chipKey = c.name.toLowerCase();
      const eventNum = c.event;

      if (chipKey === "wildcard") {
        if (eventNum <= 19) {
          chipsStatus.wildcard1 = { available: false, usedEvent: eventNum };
          usedChipMap.set(eventNum, "Wildcard 1");
        } else {
          chipsStatus.wildcard2 = { available: false, usedEvent: eventNum };
          usedChipMap.set(eventNum, "Wildcard 2");
        }
      } else if (chipKey === "freehit") {
        chipsStatus.freehit = { available: false, usedEvent: eventNum };
        usedChipMap.set(eventNum, "Free Hit");
      } else if (chipKey === "bboost") {
        chipsStatus.benchBoost = { available: false, usedEvent: eventNum };
        usedChipMap.set(eventNum, "Bench Boost");
      } else if (chipKey === "3xc") {
        chipsStatus.tripleCaptain = { available: false, usedEvent: eventNum };
        usedChipMap.set(eventNum, "Triple Captain");
      }
    }

    // 3. Fetch Bootstrap Static for Gameweek Deadlines
    const bsRes = await fetch(
      "https://fantasy.premierleague.com/api/bootstrap-static/",
      { headers: FPL_HEADERS, next: { revalidate: 300 } }
    );
    const bsData = bsRes.ok ? await bsRes.json() : { events: [] };
    const events: any[] = bsData.events || [];

    // 4. Construct 38-Gameweek Strategy Timeline
    const timeline: GameweekStrategy[] = [];
    let totalProjectedGainSum = 0;
    let recommendedCount = 0;

    for (let gw = 1; gw <= 38; gw++) {
      const evObj = events.find((e) => e.id === gw);
      const isPast = gw < currentGW;
      const isCurrent = gw === currentGW;
      const status: "completed" | "active" | "upcoming" = isPast
        ? "completed"
        : isCurrent
        ? "active"
        : "upcoming";

      const deadline = evObj?.deadline_time
        ? new Date(evObj.deadline_time).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : `GW${gw} TBD`;

      const blueprint = STRATEGY_BLUEPRINT[gw];
      const usedChipThisGW = usedChipMap.get(gw) || null;

      let recChip: "WC1" | "WC2" | "FH" | "BB" | "TC" | null = null;
      let chipName: string | null = null;
      let chipBadge: string | null = null;
      let evDelta: string | null = null;
      let rationale = `Standard single Gameweek ${gw}. Focus on free transfer momentum and starting XI optimization.`;
      let isDGW = blueprint?.isDGW || false;
      let isBGW = blueprint?.isBGW || false;
      let keyMatchups: string[] = blueprint?.keyMatchups || [];

      // Check if recommended chip is still available to the manager
      if (blueprint) {
        const chipType = blueprint.chip;
        let isChipAvailable = false;

        if (chipType === "WC1" && chipsStatus.wildcard1.available && gw <= 19) isChipAvailable = true;
        else if (chipType === "WC2" && chipsStatus.wildcard2.available && gw >= 20) isChipAvailable = true;
        else if (chipType === "FH" && chipsStatus.freehit.available) isChipAvailable = true;
        else if (chipType === "BB" && chipsStatus.benchBoost.available) isChipAvailable = true;
        else if (chipType === "TC" && chipsStatus.tripleCaptain.available) isChipAvailable = true;

        if (isChipAvailable && !isPast) {
          recChip = chipType;
          chipName = blueprint.chipName;
          chipBadge = blueprint.chipBadge;
          evDelta = blueprint.evDelta;
          rationale = blueprint.rationale;
          recommendedCount++;

          const numericVal = parseFloat(blueprint.evDelta.replace(/[^0-9.]/g, "")) || 0;
          totalProjectedGainSum += numericVal;
        } else if (usedChipThisGW) {
          chipName = usedChipThisGW;
          chipBadge = usedChipThisGW;
          rationale = `Chip deployed in GW${gw}: ${usedChipThisGW}.`;
        } else if (blueprint.isDGW || blueprint.isBGW) {
          rationale = blueprint.rationale;
        }
      }

      timeline.push({
        gameweek: gw,
        status,
        deadline,
        isDGW,
        isBGW,
        dgwTeams: blueprint?.dgwTeams,
        bgwTeams: blueprint?.bgwTeams,
        recommendedChip: recChip,
        chipName: recChip ? chipName : usedChipThisGW,
        chipBadge: recChip ? chipBadge : usedChipThisGW,
        usedChip: usedChipThisGW,
        expectedValueDelta: evDelta,
        expectedNetXP: Number((52 + (evDelta ? parseFloat(evDelta.replace(/[^0-9.]/g, "")) : 0)).toFixed(1)),
        rationale,
        keyMatchups,
      });
    }

    const responsePayload: ChipStrategyResponse = {
      entryId: cleanId,
      managerName,
      teamName,
      currentGameweek: currentGW,
      chipsStatus: {
        wildcard1: chipsStatus.wildcard1,
        wildcard2: chipsStatus.wildcard2,
        freehit: chipsStatus.freehit,
        benchBoost: chipsStatus.benchBoost,
        tripleCaptain: chipsStatus.tripleCaptain,
      },
      totalProjectedStrategyGain: `+${totalProjectedGainSum.toFixed(1)} pts`,
      recommendedCount,
      timeline,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Error in /api/chips:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate chip strategy" },
      { status: 500 }
    );
  }
}
