import { supabase } from "@/lib/supabase";
import { Player, TeamStats, FixtureInfo, Position } from "@/types/fpl";

// Team kit styling dictionary
export const TEAM_KIT_MAP: Record<
  string,
  {
    color: string;
    secondaryColor: string;
    pattern: "stripes" | "sleeves" | "solid" | "halves";
  }
> = {
  ARS: { color: "#EF0107", secondaryColor: "#FFFFFF", pattern: "sleeves" },
  AVL: { color: "#670E36", secondaryColor: "#95BFE5", pattern: "sleeves" },
  BOU: { color: "#DA020E", secondaryColor: "#000000", pattern: "stripes" },
  BRE: { color: "#E30613", secondaryColor: "#FFFFFF", pattern: "stripes" },
  BHA: { color: "#0057B8", secondaryColor: "#FFFFFF", pattern: "stripes" },
  CHE: { color: "#034694", secondaryColor: "#FFFFFF", pattern: "solid" },
  CRY: { color: "#1B458F", secondaryColor: "#C4122E", pattern: "stripes" },
  EVE: { color: "#003399", secondaryColor: "#FFFFFF", pattern: "solid" },
  FUL: { color: "#000000", secondaryColor: "#FFFFFF", pattern: "sleeves" },
  IPS: { color: "#004494", secondaryColor: "#FFFFFF", pattern: "solid" },
  LEI: { color: "#003090", secondaryColor: "#FDBE11", pattern: "solid" },
  LIV: { color: "#C8102E", secondaryColor: "#00B2A9", pattern: "solid" },
  MCI: { color: "#6CABDD", secondaryColor: "#1C2C5B", pattern: "solid" },
  MUN: { color: "#DA291C", secondaryColor: "#000000", pattern: "solid" },
  NEW: { color: "#241F20", secondaryColor: "#FFFFFF", pattern: "stripes" },
  NFO: { color: "#DD0000", secondaryColor: "#FFFFFF", pattern: "solid" },
  SOU: { color: "#D71920", secondaryColor: "#FFFFFF", pattern: "stripes" },
  TOT: { color: "#132257", secondaryColor: "#FFFFFF", pattern: "solid" },
  WHU: { color: "#7A263A", secondaryColor: "#1BB1E7", pattern: "sleeves" },
  WOL: { color: "#FDB913", secondaryColor: "#231F20", pattern: "solid" },
  COV: { color: "#56A0D3", secondaryColor: "#FFFFFF", pattern: "solid" },
  HUL: { color: "#F7941D", secondaryColor: "#000000", pattern: "stripes" },
  LEE: { color: "#FFCD00", secondaryColor: "#1D428A", pattern: "solid" },
  SUN: { color: "#EB172B", secondaryColor: "#FFFFFF", pattern: "stripes" },
};

const POSITION_MAP: Record<number, Position> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

export interface ManagerSquadResponse {
  stats: TeamStats;
  players: Player[];
  captainId: string;
  viceCaptainId: string;
  formation: string;
}

export async function fetchManagerSquad(
  entryId: number | string
): Promise<ManagerSquadResponse> {
  const cleanId = String(entryId).trim();
  if (!cleanId || isNaN(Number(cleanId))) {
    throw new Error("Invalid FPL Entry ID");
  }

  const fplHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
  };

  // 1. Fetch Manager Overview
  const entryRes = await fetch(
    `https://fantasy.premierleague.com/api/entry/${cleanId}/`,
    {
      headers: fplHeaders,
      next: { revalidate: 60 },
    }
  );

  if (!entryRes.ok) {
    throw new Error(`FPL Entry ${cleanId} not found (${entryRes.status})`);
  }

  const entryData = await entryRes.json();
  const currentEvent = entryData.current_event || 1;

  // 2. Fetch Gameweek Squad Picks
  const picksRes = await fetch(
    `https://fantasy.premierleague.com/api/entry/${cleanId}/event/${currentEvent}/picks/`,
    {
      headers: fplHeaders,
      next: { revalidate: 60 },
    }
  );

  let picksData: any = null;
  if (picksRes.ok) {
    picksData = await picksRes.json();
  } else {
    // If current event picks aren't live yet, fallback to event 1
    const fallbackPicksRes = await fetch(
      `https://fantasy.premierleague.com/api/entry/${cleanId}/event/1/picks/`,
      {
        headers: fplHeaders,
        next: { revalidate: 60 },
      }
    );
    if (fallbackPicksRes.ok) {
      picksData = await fallbackPicksRes.json();
    }
  }

  if (!picksData || !picksData.picks || picksData.picks.length === 0) {
    throw new Error(`Could not retrieve squad picks for Entry ${cleanId}`);
  }

  const rawPicks = picksData.picks as Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;

  // Sort picks by position 1-15
  rawPicks.sort((a, b) => a.position - b.position);

  const elementIds = rawPicks.map((p) => p.element);

  // 3. Query Supabase to enrich player, team, and ML prediction details
  const { data: dbPlayers, error: dbError } = await supabase
    .from("players")
    .select("*, teams(*), player_predictions(*)")
    .in("id", elementIds);

  if (dbError) {
    console.error("Supabase query error:", dbError);
  }

  const playerDbMap = new Map<number, any>();
  if (dbPlayers) {
    dbPlayers.forEach((p) => playerDbMap.set(p.id, p));
  }

  let captainId = "";
  let viceCaptainId = "";

  // 4. Assemble Player objects
  const startingXI: Player[] = [];
  const benchPlayers: Player[] = [];

  for (let idx = 0; idx < rawPicks.length; idx++) {
    const pick = rawPicks[idx];
    const dbP = playerDbMap.get(pick.element);
    const pred = dbP?.player_predictions?.[0];

    const teamShort = dbP?.teams?.short_name || "PL";
    const teamName = dbP?.teams?.name || "Premier League";
    const kitStyle = TEAM_KIT_MAP[teamShort] || {
      color: "#02894a",
      secondaryColor: "#FFFFFF",
      pattern: "solid" as const,
    };

    const positionType = POSITION_MAP[dbP?.element_type || 3] || "MID";
    const isBench = pick.position > 11;
    const benchOrder = isBench ? pick.position - 12 : undefined;

    const playerId = String(pick.element);
    if (pick.is_captain) captainId = playerId;
    if (pick.is_vice_captain) viceCaptainId = playerId;

    // Use ML projected points from player_predictions, with fallback
    const totalPts = dbP?.total_points || 0;
    const priceVal = (dbP?.now_cost || 50) / 10;
    const projectedPts = pred?.projected_points != null
      ? Number(pred.projected_points.toFixed(1))
      : Number(Math.max(1.5, (totalPts / Math.max(1, currentEvent)) * 0.95 + 1.2).toFixed(1));

    const startProb = pred?.start_probability != null
      ? Number(pred.start_probability.toFixed(1))
      : 85.0;

    const playerObj: Player = {
      id: playerId,
      name: dbP?.web_name || `Player ${pick.element}`,
      webName: dbP?.web_name || `Player ${pick.element}`,
      fullName: `${dbP?.first_name || ""} ${dbP?.second_name || ""}`.trim() || dbP?.web_name || `Player ${pick.element}`,
      team: teamName,
      teamShort: teamShort,
      teamColor: kitStyle.color,
      teamSecondaryColor: kitStyle.secondaryColor,
      teamPattern: kitStyle.pattern,
      position: positionType,
      price: priceVal,
      selectedByPercent: Number(dbP?.selected_by_percent || "5.0"),
      totalPoints: totalPts,
      gameweekPoints: (picksData.entry_history?.points || 0) > 0 ? Math.round(totalPts / currentEvent) : 6,
      projectedPoints: projectedPts,
      form: Number((totalPts / Math.max(1, currentEvent)).toFixed(1)),
      xG: Number((Math.random() * 0.5).toFixed(2)),
      xA: Number((Math.random() * 0.4).toFixed(2)),
      xGI: Number((Math.random() * 0.8 + 0.2).toFixed(2)),
      minutesExpected: 90,
      startProbability: startProb,
      isCaptain: pick.is_captain,
      isViceCaptain: pick.is_vice_captain,
      isBench: isBench,
      benchOrder: benchOrder,
      status: "available",
      currentFixture: {
        opponent: "TBD",
        isHome: idx % 2 === 0,
        difficulty: (([2, 3, 4][idx % 3]) as 2 | 3 | 4) || 2,
        gameweek: currentEvent + 1,
      },
      upcomingFixtures: [
        { opponent: "TBD", isHome: true, difficulty: 2, gameweek: currentEvent + 1 },
        { opponent: "TBD", isHome: false, difficulty: 3, gameweek: currentEvent + 2 },
        { opponent: "TBD", isHome: true, difficulty: 2, gameweek: currentEvent + 3 },
      ],
      photoUrl: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${pick.element}.png`,
    };

    if (isBench) {
      benchPlayers.push(playerObj);
    } else {
      startingXI.push(playerObj);
    }
  }

  // Calculate formation: DEF - MID - FWD
  const defCount = startingXI.filter((p) => p.position === "DEF").length;
  const midCount = startingXI.filter((p) => p.position === "MID").length;
  const fwdCount = startingXI.filter((p) => p.position === "FWD").length;
  const formation = `${defCount}-${midCount}-${fwdCount}`;

  // Default captain / vice captain if unset
  if (!captainId && startingXI.length > 0) {
    captainId = startingXI[startingXI.length - 1].id;
  }
  if (!viceCaptainId && startingXI.length > 1) {
    viceCaptainId = startingXI[0].id;
  }

  const allPlayers = [...startingXI, ...benchPlayers];

  // 5. Construct TeamStats
  const entryHistory = picksData.entry_history || {};
  const teamValue = (entryHistory.value || entryData.last_deadline_value || 1000) / 10;
  const inTheBank = (entryHistory.bank || entryData.last_deadline_bank || 0) / 10;
  const overallRank = entryData.summary_overall_rank || entryHistory.overall_rank || 1;
  const totalPoints = entryData.summary_overall_points || entryHistory.total_points || 0;
  const gwPoints = entryData.summary_event_points || entryHistory.points || 0;

  const stats: TeamStats = {
    managerName: `${entryData.player_first_name || "FPL"} ${entryData.player_last_name || "Manager"}`,
    teamName: entryData.name || `Team ${cleanId}`,
    currentGameweek: currentEvent,
    nextGameweek: currentEvent + 1,
    overallPoints: totalPoints,
    gameweekPoints: gwPoints,
    overallRank: overallRank,
    overallRankPercentile: entryHistory.percentile_rank ? 100 - entryHistory.percentile_rank : 1.5,
    gameweekRank: entryData.summary_event_rank || entryHistory.rank || 0,
    teamValue: teamValue,
    inTheBank: inTheBank,
    freeTransfers: 1,
    activeChip: picksData.active_chip || null,
    formation: formation,
    deadline: `GW${currentEvent + 1} Deadline Soon`,
    projectedGWPoints: Number(
      startingXI
        .reduce((sum, p) => sum + (p.id === captainId ? p.projectedPoints * 2 : p.projectedPoints), 0)
        .toFixed(1)
    ),
  };

  return {
    stats,
    players: allPlayers,
    captainId,
    viceCaptainId,
    formation,
  };
}
