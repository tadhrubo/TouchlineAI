import { supabase } from "@/lib/supabase";
import { Player } from "@/types/fpl";

export interface OptimizedXIResult {
  formation: string;
  starters: Player[];
  bench: Player[];
  captain: Player;
  viceCaptain: Player;
  totalStartingXP: number;
  rawXIXP: number;
  captainBonus: number;
  benchXP: number;
}

export interface TransferRecommendation {
  transfersCount: number;
  transfersOut: Player[];
  transfersIn: {
    player: Player;
    shapDrivers?: Array<{ feature: string; impact: string }>;
  }[];
  penaltyPoints: number;
  costDelta: number;
  remainingBank: number;
  baselineXP: number;
  newGrossXP: number;
  newNetXP: number;
  netGain: number;
  optimizedXI: OptimizedXIResult;
}

const VALID_FORMATIONS = [
  [3, 5, 2],
  [3, 4, 3],
  [4, 4, 2],
  [4, 5, 1],
  [4, 3, 3],
  [5, 3, 2],
  [5, 4, 1],
  [5, 2, 3],
];

/**
 * Solve optimal starting XI, captain, vice-captain, and auto-sub bench order
 * given 15 squad players using fast discrete combinatorial optimization.
 */
export function solveOptimalStartingXI(squad: Player[]): OptimizedXIResult {
  const gks: Player[] = [];
  const defs: Player[] = [];
  const mids: Player[] = [];
  const fwds: Player[] = [];

  for (let i = 0; i < squad.length; i++) {
    const p = squad[i];
    if (p.position === "GKP") gks.push(p);
    else if (p.position === "DEF") defs.push(p);
    else if (p.position === "MID") mids.push(p);
    else if (p.position === "FWD") fwds.push(p);
  }

  // Pre-sort by projected points descending
  gks.sort((a, b) => b.projectedPoints - a.projectedPoints);
  defs.sort((a, b) => b.projectedPoints - a.projectedPoints);
  mids.sort((a, b) => b.projectedPoints - a.projectedPoints);
  fwds.sort((a, b) => b.projectedPoints - a.projectedPoints);

  let bestScore = -Infinity;
  let bestFormation = "3-4-3";
  let bestDefCount = 3;
  let bestMidCount = 4;
  let bestFwdCount = 3;

  for (let f = 0; f < VALID_FORMATIONS.length; f++) {
    const [numDef, numMid, numFwd] = VALID_FORMATIONS[f];
    if (defs.length < numDef || mids.length < numMid || fwds.length < numFwd || gks.length < 1) {
      continue;
    }

    let rawScore = gks[0].projectedPoints;
    for (let i = 0; i < numDef; i++) rawScore += defs[i].projectedPoints;
    for (let i = 0; i < numMid; i++) rawScore += mids[i].projectedPoints;
    for (let i = 0; i < numFwd; i++) rawScore += fwds[i].projectedPoints;

    // Highest among selected starters gets captain bonus
    let maxCap = gks[0].projectedPoints;
    for (let i = 0; i < numDef; i++) if (defs[i].projectedPoints > maxCap) maxCap = defs[i].projectedPoints;
    for (let i = 0; i < numMid; i++) if (mids[i].projectedPoints > maxCap) maxCap = mids[i].projectedPoints;
    for (let i = 0; i < numFwd; i++) if (fwds[i].projectedPoints > maxCap) maxCap = fwds[i].projectedPoints;

    const totalScore = rawScore + maxCap;
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestFormation = `${numDef}-${numMid}-${numFwd}`;
      bestDefCount = numDef;
      bestMidCount = numMid;
      bestFwdCount = numFwd;
    }
  }

  const startingGK = gks.slice(0, 1);
  const startingDEF = defs.slice(0, bestDefCount);
  const startingMID = mids.slice(0, bestMidCount);
  const startingFWD = fwds.slice(0, bestFwdCount);

  const starters = [...startingGK, ...startingDEF, ...startingMID, ...startingFWD];
  const benchGK = gks.slice(1);
  const benchDEF = defs.slice(bestDefCount);
  const benchMID = mids.slice(bestMidCount);
  const benchFWD = fwds.slice(bestFwdCount);

  const outfieldBench = [...benchDEF, ...benchMID, ...benchFWD].sort(
    (a, b) => b.projectedPoints - a.projectedPoints
  );

  const orderedBench = [...benchGK, ...outfieldBench];

  // Identify captain and vice-captain
  const sortedStarters = [...starters].sort(
    (a, b) => b.projectedPoints - a.projectedPoints
  );
  const captain = sortedStarters[0] || squad[0];
  const viceCaptain = sortedStarters[1] || sortedStarters[0] || squad[1];

  const markedStarters = starters.map((p) => ({
    ...p,
    isCaptain: p.id === captain.id,
    isViceCaptain: p.id === viceCaptain.id,
    isBench: false,
    multiplier: p.id === captain.id ? 2 : 1,
  }));

  const markedBench = orderedBench.map((p, idx) => ({
    ...p,
    isCaptain: false,
    isViceCaptain: false,
    isBench: true,
    benchOrder: idx,
    multiplier: 0,
  }));

  const rawXIXP = markedStarters.reduce((sum, p) => sum + p.projectedPoints, 0);
  const captainBonus = captain.projectedPoints;
  const totalStartingXP = rawXIXP + captainBonus;
  const benchXP = markedBench.reduce((sum, p) => sum + p.projectedPoints, 0);

  return {
    formation: bestFormation,
    starters: markedStarters,
    bench: markedBench,
    captain,
    viceCaptain,
    totalStartingXP: Number(totalStartingXP.toFixed(2)),
    rawXIXP: Number(rawXIXP.toFixed(2)),
    captainBonus: Number(captainBonus.toFixed(2)),
    benchXP: Number(benchXP.toFixed(2)),
  };
}

/**
 * Solve best 1-transfer move from player pool to maximize net starting points.
 */
export async function solveBest1Transfer(
  squad: Player[],
  inTheBank: number,
  freeTransfers: number = 1
): Promise<TransferRecommendation | null> {
  const baselineXI = solveOptimalStartingXI(squad);
  const baselineXP = baselineXI.totalStartingXP;
  const currentSquadIds = new Set(squad.map((p) => Number(p.id)));

  // Team counts
  const teamCounts = new Map<string, number>();
  squad.forEach((p) => {
    teamCounts.set(p.teamShort, (teamCounts.get(p.teamShort) || 0) + 1);
  });

  // Query top predictions pool from Supabase
  const { data: poolData, error } = await supabase
    .from("players")
    .select("*, teams(*), player_predictions(*)")
    .order("total_points", { ascending: false })
    .limit(80);

  if (error || !poolData) {
    return null;
  }

  // Convert and bucket candidate pool by position
  const poolByPos: Record<
    string,
    Array<{
      player: Player;
      shapDrivers?: Array<{ feature: string; impact: string }>;
    }>
  > = {
    GKP: [],
    DEF: [],
    MID: [],
    FWD: [],
  };

  for (let i = 0; i < poolData.length; i++) {
    const raw = poolData[i];
    if (currentSquadIds.has(raw.id)) continue;

    const pred = raw.player_predictions?.[0];
    const teamShort = raw.teams?.short_name || "PL";
    const pos = (
      raw.element_type === 1
        ? "GKP"
        : raw.element_type === 2
        ? "DEF"
        : raw.element_type === 3
        ? "MID"
        : "FWD"
    ) as "GKP" | "DEF" | "MID" | "FWD";

    const price = (raw.now_cost || 50) / 10;
    const projectedPts = Number(
      (pred?.projected_points || (raw.total_points / 2) * 0.9 + 1.2).toFixed(2)
    );

    const candPlayer: Player = {
      id: String(raw.id),
      name: raw.web_name,
      webName: raw.web_name,
      fullName: `${raw.first_name || ""} ${raw.second_name || ""}`.trim(),
      team: raw.teams?.name || "Premier League",
      teamShort: teamShort,
      teamColor: "#02894a",
      teamSecondaryColor: "#ffffff",
      position: pos,
      price: price,
      selectedByPercent: Number(raw.selected_by_percent || 5),
      totalPoints: raw.total_points || 0,
      gameweekPoints: 0,
      projectedPoints: projectedPts,
      form: Number((raw.total_points / 2).toFixed(1)),
      xG: 0.2,
      xA: 0.1,
      xGI: 0.3,
      minutesExpected: 90,
      startProbability: Number((pred?.start_probability || 85).toFixed(1)),
      status: "available",
      currentFixture: {
        opponent: "TBD",
        isHome: true,
        difficulty: 2,
        gameweek: 2,
      },
      upcomingFixtures: [],
      photoUrl: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${raw.id}.png`,
    };

    poolByPos[pos].push({
      player: candPlayer,
      shapDrivers: pred?.shap_explanation?.drivers || [
        { feature: "Recent Minutes Played", impact: "+1.20 pts" },
        { feature: "Squad Valuation", impact: "+0.85 pts" },
      ],
    });
  }

  let bestMove: TransferRecommendation | null = null;
  let bestNetGain = 0.0;

  // Test single swap for each player in squad against same-position candidates
  for (let s = 0; s < squad.length; s++) {
    const playerOut = squad[s];
    const samePosCandidates = poolByPos[playerOut.position] || [];

    for (let c = 0; c < samePosCandidates.length; c++) {
      const cand = samePosCandidates[c];
      const playerIn = cand.player;

      // Budget check
      const costDelta = playerIn.price - playerOut.price;
      if (costDelta > inTheBank) continue;

      // Team limit check (max 3 per team)
      if (
        playerIn.teamShort !== playerOut.teamShort &&
        (teamCounts.get(playerIn.teamShort) || 0) >= 3
      ) {
        continue;
      }

      // Simulate new squad
      const newSquad = squad
        .filter((p) => p.id !== playerOut.id)
        .concat([playerIn]);
      const newXI = solveOptimalStartingXI(newSquad);
      const newGrossXP = newXI.totalStartingXP;
      const penalty = 0; // 1 free transfer
      const newNetXP = newGrossXP - penalty;
      const netGain = Number((newNetXP - baselineXP).toFixed(2));

      if (netGain > bestNetGain) {
        bestNetGain = netGain;
        bestMove = {
          transfersCount: 1,
          transfersOut: [playerOut],
          transfersIn: [cand],
          penaltyPoints: penalty,
          costDelta: Number(costDelta.toFixed(2)),
          remainingBank: Number((inTheBank - costDelta).toFixed(2)),
          baselineXP,
          newGrossXP,
          newNetXP,
          netGain,
          optimizedXI: newXI,
        };
      }
    }
  }

  return bestMove;
}
