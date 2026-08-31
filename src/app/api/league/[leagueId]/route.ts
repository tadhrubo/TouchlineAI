export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const fplHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json",
};

const POSITION_MAP: Record<number, string> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

function getFplKitUrl(teamCode: number | undefined, isGoalkeeper: boolean = false): string {
  if (!teamCode) {
    return isGoalkeeper
      ? "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0_1-66.webp"
      : "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0-66.webp";
  }
  const shirtCode = isGoalkeeper ? `${teamCode}_1` : `${teamCode}`;
  return `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${shirtCode}-66.webp`;
}

// Helper to chunk array
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await params;
    if (!leagueId) {
      return NextResponse.json({ error: "Missing leagueId" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const requestedEvent = searchParams.get("event");

    // 1. Fetch League Standings
    const standingsRes = await fetch(
      `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/`,
      {
        headers: fplHeaders,
        next: { revalidate: 60 },
      }
    );

    if (!standingsRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch league standings (Status ${standingsRes.status})` },
        { status: standingsRes.status }
      );
    }

    const standingsData = await standingsRes.json();
    const rawResults = standingsData.standings?.results || [];
    const topManagers = rawResults.slice(0, 50);

    // 2. Fetch Bootstrap Static data for players & teams
    const bootstrapRes = await fetch(
      "https://fantasy.premierleague.com/api/bootstrap-static/",
      {
        headers: fplHeaders,
        next: { revalidate: 300 },
      }
    );

    if (!bootstrapRes.ok) {
      throw new Error(`Failed to fetch bootstrap data (Status ${bootstrapRes.status})`);
    }

    const bootstrapData = await bootstrapRes.json();
    const currentEvent =
      requestedEvent && !isNaN(Number(requestedEvent))
        ? Number(requestedEvent)
        : bootstrapData.events.find((e: any) => e.is_current)?.id ||
          bootstrapData.events.find((e: any) => e.is_next)?.id ||
          1;

    // Build Maps
    const teamsMap = new Map<number, any>();
    for (const t of bootstrapData.teams || []) {
      teamsMap.set(t.id, t);
    }

    const elementsMap = new Map<number, any>();
    for (const el of bootstrapData.elements || []) {
      elementsMap.set(el.id, el);
    }

    // 3. Fetch Live Gameweek Match Telemetry & Supabase Top 10k EO
    const dbEoMap = new Map<number, number>();
    try {
      const { data: dbPlayers } = await supabase.from("players").select("id, top_10k_eo");
      if (dbPlayers) {
        for (const p of dbPlayers) {
          if (p.top_10k_eo != null) {
            dbEoMap.set(Number(p.id), Number(p.top_10k_eo));
          }
        }
      }
    } catch (e) {
      console.warn("Could not load top_10k_eo from database:", e);
    }

    let liveElementsMap = new Map<number, any>();
    try {
      const liveRes = await fetch(
        `https://fantasy.premierleague.com/api/event/${currentEvent}/live/`,
        {
          headers: fplHeaders,
          next: { revalidate: 60 },
        }
      );
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        for (const el of liveData.elements || []) {
          liveElementsMap.set(el.id, el.stats);
        }
      }
    } catch (err) {
      console.warn("Could not fetch live matchday data:", err);
    }

    // 4. Fetch Gameweek Fixtures to track match started / finished statuses
    const teamFixtureMap = new Map<number, { started: boolean; finished: boolean; minutes: number }>();
    try {
      const fixturesRes = await fetch(
        `https://fantasy.premierleague.com/api/fixtures/?event=${currentEvent}`,
        {
          headers: fplHeaders,
          next: { revalidate: 60 },
        }
      );
      if (fixturesRes.ok) {
        const fixturesData = await fixturesRes.json();
        for (const fix of fixturesData || []) {
          const isFinished = Boolean(fix.finished || fix.finished_provisional);
          const isStarted = Boolean(fix.started || (fix.minutes && fix.minutes > 0) || isFinished);
          const fixInfo = { started: isStarted, finished: isFinished, minutes: fix.minutes || 0 };
          teamFixtureMap.set(fix.team_h, fixInfo);
          teamFixtureMap.set(fix.team_a, fixInfo);
        }
      }
    } catch (err) {
      console.warn("Could not fetch fixtures for gameweek:", err);
    }

    // 5. Rate-Limit Safe Batched Fetch of Manager Picks
    const managerChunks = chunkArray(topManagers, 10);
    const allChunkResults: Array<{ mgr: any; picksData: any }> = [];

    for (const chunk of managerChunks) {
      const picksPromises = chunk.map(async (mgr: any) => {
        try {
          const picksRes = await fetch(
            `https://fantasy.premierleague.com/api/entry/${mgr.entry}/event/${currentEvent}/picks/`,
            {
              headers: fplHeaders,
              next: { revalidate: 60 },
            }
          );

          if (!picksRes.ok) {
            return {
              mgr,
              picksData: null,
            };
          }

          const picksData = await picksRes.json();
          return {
            mgr,
            picksData,
          };
        } catch {
          return {
            mgr,
            picksData: null,
          };
        }
      });

      const chunkResults = await Promise.all(picksPromises);
      allChunkResults.push(...chunkResults);
    }

    // 6. Calculate local mini-league ownership frequency across all managers with valid picks
    const validManagerPicks = allChunkResults.filter((r) => r.picksData && Array.isArray(r.picksData.picks));
    const totalSampleManagers = validManagerPicks.length;
    const playerPickCountMap = new Map<number, number>();

    for (const { picksData } of validManagerPicks) {
      for (const pick of picksData.picks) {
        playerPickCountMap.set(
          pick.element,
          (playerPickCountMap.get(pick.element) || 0) + 1
        );
      }
    }

    // 7. Enrich managers with squad picks and contextual metrics
    const enrichedManagers: any[] = [];

    for (const { mgr, picksData } of allChunkResults) {
      if (!picksData || !picksData.picks) {
        enrichedManagers.push({
          id: mgr.entry,
          entry: mgr.entry,
          name: mgr.player_name,
          teamName: mgr.entry_name,
          rank: mgr.rank,
          lastRank: mgr.last_rank,
          rankChange: mgr.last_rank ? mgr.last_rank - mgr.rank : 0,
          liveGwPoints: mgr.event_total || 0,
          totalPoints: mgr.total || 0,
          captainName: "Unknown",
          viceCaptainName: "Unknown",
          activeChip: null,
          transfers: 0,
          transfersCost: 0,
          eventTransfersCost: 0,
          teamValue: 100,
          bank: 0,
          playedCount: 0,
          yetCount: 0,
          maxPlayedCount: 11,
          starters: [],
          bench: [],
        });
        continue;
      }

      const rawChip = picksData.active_chip;
      let activeChipFormatted: string | null = null;
      if (rawChip === "bboost") activeChipFormatted = "BB";
      else if (rawChip === "3xc") activeChipFormatted = "TC";
      else if (rawChip === "freehit") activeChipFormatted = "FH";
      else if (rawChip === "wildcard") activeChipFormatted = "WC";

      const isBenchBoost = activeChipFormatted === "BB";

      let captainName = "Unknown";
      let viceCaptainName = "Unknown";
      let liveGwPoints = 0;
      let playedStarters = 0;
      let yetStarters = 0;
      const totalStartersCount = isBenchBoost ? 15 : 11;

      const starters: any[] = [];
      const bench: any[] = [];

      for (const pick of picksData.picks) {
        const el = elementsMap.get(pick.element);
        const team = el ? teamsMap.get(el.team) : null;
        const liveStat = liveElementsMap.get(pick.element) || {};

        const teamFixture = el ? teamFixtureMap.get(el.team) : undefined;
        const mins = liveStat.minutes ?? 0;
        const basePts = liveStat.total_points ?? 0;
        const mult = pick.multiplier ?? 1;
        const pickPts = basePts * mult;

        const isFinished = teamFixture ? teamFixture.finished : mins > 0;
        const isStarted = teamFixture ? teamFixture.started : mins > 0;
        const hasPlayed = mins > 0 || (isStarted && isFinished);
        const isYetToPlay = !isStarted && mins === 0;

        const isGk = el ? el.element_type === 1 : false;
        const pos = el ? POSITION_MAP[el.element_type] || "MID" : "MID";
        const kitUrl = getFplKitUrl(team?.code, isGk);

        if (pick.is_captain) {
          captainName = el ? el.web_name : "Captain";
        }
        if (pick.is_vice_captain) {
          viceCaptainName = el ? el.web_name : "Vice-Captain";
        }

        const selectedByPercent = el ? Number(el.selected_by_percent || "0") : 0;
        const top10kEo = dbEoMap.get(pick.element) ?? (selectedByPercent > 0 ? selectedByPercent * 1.5 : undefined);
        const pickCount = playerPickCountMap.get(pick.element) || 0;
        const localLeagueOwnershipPercent = totalSampleManagers > 0
          ? Number(((pickCount / totalSampleManagers) * 100).toFixed(1))
          : 0;

        const playerCard = {
          id: pick.element,
          pickPosition: pick.position,
          webName: el ? el.web_name : `Player ${pick.element}`,
          fullName: el ? `${el.first_name} ${el.second_name}` : `Player ${pick.element}`,
          team: team ? team.name : "Team",
          teamShort: team ? team.short_name : "PL",
          position: pos,
          elementType: el ? el.element_type : 3,
          nowCost: el ? el.now_cost / 10 : 5.0,
          selectedByPercent,
          top10kEo,
          top_10k_eo: top10kEo,
          leagueOwnershipPercent: localLeagueOwnershipPercent,
          league_ownership_percent: localLeagueOwnershipPercent,
          matchFinished: isFinished,
          matchStarted: isStarted,
          yetToPlay: isYetToPlay,
          multiplier: mult,
          isCaptain: pick.is_captain,
          isViceCaptain: pick.is_vice_captain,
          isBench: pick.position > 11,
          benchOrder: pick.position > 11 ? pick.position - 11 : null,
          livePoints: pickPts,
          rawPoints: basePts,
          minutes: mins,
          goals: liveStat.goals_scored ?? 0,
          assists: liveStat.assists ?? 0,
          bonus: liveStat.bonus ?? 0,
          cleanSheet: liveStat.clean_sheets ?? 0,
          kitUrl,
          played: hasPlayed,
        };

        if (pick.position <= 11) {
          starters.push(playerCard);
          liveGwPoints += pickPts;
          if (hasPlayed) playedStarters++;
          if (isYetToPlay) yetStarters++;
        } else {
          bench.push(playerCard);
          if (isBenchBoost) {
            liveGwPoints += pickPts;
            if (hasPlayed) playedStarters++;
            if (isYetToPlay) yetStarters++;
          }
        }
      }

      const entryHist = picksData.entry_history || {};
      const teamVal = entryHist.value ? entryHist.value / 10 : 100;
      const bankVal = entryHist.bank ? entryHist.bank / 10 : 0;
      const transfers = entryHist.event_transfers ?? 0;
      const transfersCost = entryHist.event_transfers_cost ?? 0;
      const totalOverallPts = mgr.total ?? 0;

      enrichedManagers.push({
        id: mgr.entry,
        entry: mgr.entry,
        name: mgr.player_name,
        teamName: mgr.entry_name,
        rank: mgr.rank,
        lastRank: mgr.last_rank,
        rankChange: mgr.last_rank ? mgr.last_rank - mgr.rank : 0,
        liveGwPoints: liveGwPoints || (mgr.event_total ?? 0),
        totalPoints: totalOverallPts,
        captainName,
        viceCaptainName,
        activeChip: activeChipFormatted,
        transfers,
        transfersCost,
        eventTransfersCost: transfersCost,
        teamValue: teamVal,
        bank: bankVal,
        playedCount: playedStarters,
        yetCount: yetStarters,
        maxPlayedCount: totalStartersCount,
        starters,
        bench,
      });
    }

    return NextResponse.json({
      league: {
        id: standingsData.league?.id || Number(leagueId),
        name: standingsData.league?.name || "Mini-League",
        created: standingsData.league?.created,
        rankCount: standingsData.league?.rank_count || enrichedManagers.length,
        adminEntry: standingsData.league?.admin_entry,
      },
      gameweek: currentEvent,
      totalCount: enrichedManagers.length,
      managers: enrichedManagers,
    });
  } catch (error: any) {
    console.error("Error in /api/league/[leagueId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch league standings" },
      { status: 500 }
    );
  }
}
