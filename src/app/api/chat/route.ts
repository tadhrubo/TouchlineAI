export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";
import { fetchManagerSquad } from "@/services/fpl";
import { solveOptimalStartingXI, solveBest1Transfer } from "@/services/optimizer";
import {
  PlayerComparisonData,
  InsightItem,
  Player,
  ComparisonPlayer,
} from "@/types/fpl";

const PREMIER_LEAGUE_TEAMS: Array<{ id: number; name: string; shortName: string; aliases: string[] }> = [
  { id: 1, name: "Arsenal", shortName: "ARS", aliases: ["arsenal", "gunners"] },
  { id: 2, name: "Aston Villa", shortName: "AVL", aliases: ["aston villa", "villa"] },
  { id: 3, name: "Bournemouth", shortName: "BOU", aliases: ["bournemouth", "cherries"] },
  { id: 4, name: "Brentford", shortName: "BRE", aliases: ["brentford", "bees"] },
  { id: 5, name: "Brighton", shortName: "BHA", aliases: ["brighton", "seagulls"] },
  { id: 6, name: "Chelsea", shortName: "CHE", aliases: ["chelsea", "blues"] },
  { id: 7, name: "Crystal Palace", shortName: "CRY", aliases: ["crystal palace", "palace", "eagles"] },
  { id: 8, name: "Everton", shortName: "EVE", aliases: ["everton", "toffees"] },
  { id: 9, name: "Fulham", shortName: "FUL", aliases: ["fulham", "cottagers"] },
  { id: 10, name: "Ipswich", shortName: "IPS", aliases: ["ipswich", "tractor boys"] },
  { id: 11, name: "Leicester", shortName: "LEI", aliases: ["leicester", "foxes"] },
  { id: 12, name: "Liverpool", shortName: "LIV", aliases: ["liverpool", "reds"] },
  { id: 13, name: "Man City", shortName: "MCI", aliases: ["man city", "manchester city", "city", "citizens"] },
  { id: 14, name: "Man Utd", shortName: "MUN", aliases: ["man utd", "man united", "manchester united", "united", "red devils"] },
  { id: 15, name: "Newcastle", shortName: "NEW", aliases: ["newcastle", "magpies", "toon"] },
  { id: 16, name: "Nott'm Forest", shortName: "NFO", aliases: ["nottingham forest", "forest", "trees"] },
  { id: 17, name: "Southampton", shortName: "SOU", aliases: ["southampton", "saints"] },
  { id: 18, name: "Spurs", shortName: "TOT", aliases: ["tottenham", "spurs"] },
  { id: 19, name: "West Ham", shortName: "WHU", aliases: ["west ham", "hammers", "irons"] },
  { id: 20, name: "Wolves", shortName: "WOL", aliases: ["wolves", "wolverhampton"] },
];

interface ExtractedIntent {
  isFactQuery: boolean;
  isNewsQuery: boolean;
  mentionedPlayerIds: number[];
  mentionedTeamIds: number[];
}

async function extractEntitiesAndIntent(
  query: string,
  squadPlayers: Player[]
): Promise<ExtractedIntent> {
  const isFactQuery = Boolean(
    query.match(
      /\b(score|scores|scored|scoring|goals?|assists?|clean\s*sheets?|points?|did\s+he\s+play|result|results|started|minutes|stats|bonus|bps|yellow\s*cards?|red\s*cards?|saves?|how\s+many|bench\s*points)\b/i
    )
  );

  const isNewsQuery = Boolean(
    query.match(
      /\b(press\s*conference|rumou?rs?|news|quotes?|injury\s*update|injur(ed|y)|fitness|fit|training|doubtful|suspension|ruled\s*out|presser)\b/i
    )
  );

  const lower = query.toLowerCase();
  const matchedTeamIds = new Set<number>();
  for (const t of PREMIER_LEAGUE_TEAMS) {
    if (
      lower.includes(t.name.toLowerCase()) ||
      lower.includes(t.shortName.toLowerCase()) ||
      t.aliases.some((a) => lower.includes(a))
    ) {
      matchedTeamIds.add(t.id);
    }
  }

  const matchedPlayerIds = new Set<number>();

  // 1. Check user's squad players
  for (const p of squadPlayers) {
    const wName = p.webName.toLowerCase();
    const fName = p.fullName.toLowerCase();
    if (
      (wName.length >= 3 && lower.includes(wName)) ||
      (fName.length >= 4 && lower.includes(fName))
    ) {
      matchedPlayerIds.add(Number(p.id));
    }
  }

  // 2. Extract potential player keywords (words with length >= 4) and query Supabase
  const stopWords = new Set([
    "what", "think", "about", "should", "could", "would", "score", "goals",
    "assists", "clean", "sheet", "points", "gameweek", "transfer", "captain",
    "player", "start", "bench", "versus", "against", "premier", "league", "have",
    "this", "that", "with", "from", "when", "where", "which", "will", "does"
  ]);

  const words = query
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w.toLowerCase()));

  if (words.length > 0) {
    try {
      const orFilter = words
        .slice(0, 4)
        .map((w) => `web_name.ilike.%${w}%,second_name.ilike.%${w}%`)
        .join(",");
      const { data: dbPlayers } = await supabase
        .from("players")
        .select("id, web_name, second_name")
        .or(orFilter)
        .limit(6);

      if (dbPlayers) {
        for (const dp of dbPlayers) {
          matchedPlayerIds.add(dp.id);
        }
      }
    } catch (err) {
      console.warn("Supabase player entity lookup warning:", err);
    }
  }

  return {
    isFactQuery,
    isNewsQuery,
    mentionedPlayerIds: Array.from(matchedPlayerIds),
    mentionedTeamIds: Array.from(matchedTeamIds),
  };
}

async function fetchVerifiedGameweekLedger(
  playerIds: number[],
  teamIds: number[],
  gw: number = 1
): Promise<string> {
  if (playerIds.length === 0 && teamIds.length === 0) return "";

  try {
    const ledgerLines: string[] = [];

    // Query live gameweek stats for player IDs
    if (playerIds.length > 0) {
      const { data: playerStats } = await supabase
        .from("live_gameweek_stats")
        .select(`
          *,
          players (
            id,
            web_name,
            first_name,
            second_name,
            teams (
              id,
              name,
              short_name
            )
          )
        `)
        .in("player_id", playerIds.slice(0, 4))
        .order("gw", { ascending: false });

      if (playerStats && playerStats.length > 0) {
        for (const s of playerStats) {
          const p = s.players;
          const teamShort = p?.teams?.short_name || "PL";
          const fullName = `${p?.first_name || ""} ${p?.web_name || ""}`.trim();
          ledgerLines.push(
            `Player Telemetry: ${fullName} (${teamShort}) | Minutes: ${s.minutes}' | Goals: ${s.goals_scored} | Assists: ${s.assists} | Clean Sheet: ${s.clean_sheets} | Bonus: ${s.bonus} | Total Pts: ${s.live_points}`
          );
        }
      }
    }

    // Query match fixtures to get verified scorelines
    if (teamIds.length > 0 || playerIds.length > 0) {
      try {
        const fplRes = await fetch(
          `https://fantasy.premierleague.com/api/fixtures/?event=${gw}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              Accept: "application/json",
            },
            next: { revalidate: 60 },
          }
        );

        if (fplRes.ok) {
          const fixtures = await fplRes.json();
          const targetTeamIds = new Set(teamIds);

          const matchedFixtures = fixtures.filter(
            (f: any) => targetTeamIds.has(f.team_h) || targetTeamIds.has(f.team_a)
          );

          for (const f of matchedFixtures.slice(0, 2)) {
            const hTeam = PREMIER_LEAGUE_TEAMS.find((t) => t.id === f.team_h)?.shortName || `Team ${f.team_h}`;
            const aTeam = PREMIER_LEAGUE_TEAMS.find((t) => t.id === f.team_a)?.shortName || `Team ${f.team_a}`;
            const statusStr = f.finished ? "Finished" : f.started ? "In Progress" : "Upcoming";
            const scoreStr = f.started || f.finished ? `${f.team_h_score ?? 0} - ${f.team_a_score ?? 0}` : "vs";
            ledgerLines.unshift(
              `Fixture: [GW${f.event || gw}] ${hTeam} ${scoreStr} ${aTeam} (${statusStr})`
            );
          }
        }
      } catch (err) {
        console.warn("FPL fixtures lookup warning:", err);
      }
    }

    if (ledgerLines.length === 0) return "";

    return [
      "--- VERIFIED GAMEWEEK MATCH LEDGER (GROUND TRUTH) ---",
      ...ledgerLines,
      "-----------------------------------------------------",
    ].join("\n");
  } catch (err: any) {
    console.warn("fetchVerifiedGameweekLedger error:", err);
    return "";
  }
}

async function fetchRelevantNews(
  query: string,
  genAI: GoogleGenerativeAI | null
): Promise<Array<{ news_text: string; source: string; similarity: number }>> {
  if (!genAI || !query) return [];
  try {
    const candidateModels = ["gemini-embedding-001", "text-embedding-004"];
    for (const modelName of candidateModels) {
      try {
        const embModel = genAI.getGenerativeModel({ model: modelName });
        const embRes = await embModel.embedContent({
          content: { role: "user", parts: [{ text: query }] },
          outputDimensionality: 768,
        } as any);
        const embedding = embRes.embedding?.values;
        if (embedding && embedding.length === 768) {
          const { data, error } = await supabase.rpc("match_news", {
            query_embedding: embedding,
            match_threshold: 0.35,
            match_count: 3,
          });
          if (!error && data && data.length > 0) {
            return data;
          }
        }
      } catch {
        continue;
      }
    }
    return [];
  } catch (err: any) {
    console.warn("fetchRelevantNews error:", err.message || err);
    return [];
  }
}

function generateComparisonCard(
  playerA: Player,
  playerB: Player,
  gw: number
): PlayerComparisonData {
  const isPlayerABetter = playerA.projectedPoints >= playerB.projectedPoints;
  const recommended = isPlayerABetter ? playerA : playerB;
  const opponent = isPlayerABetter ? playerB : playerA;

  const xpDiff = Math.abs(playerA.projectedPoints - playerB.projectedPoints).toFixed(1);

  const compA: ComparisonPlayer = {
    id: playerA.id,
    name: playerA.fullName || playerA.webName,
    team: playerA.team,
    price: `£${playerA.price.toFixed(1)}m`,
    photoUrl: playerA.photoUrl,
    projectedPoints: playerA.projectedPoints,
    startProbability: playerA.startProbability,
    xGI: playerA.xGI,
    form: playerA.form,
    fixture: `${playerA.currentFixture.opponent} (${playerA.currentFixture.isHome ? "H" : "A"})`,
    fdr: playerA.currentFixture.difficulty,
    selectedBy: `${playerA.selectedByPercent}%`,
    advantages: [
      `FDR ${playerA.currentFixture.difficulty} matchup with high projected volume`,
      `${playerA.totalPoints} pts scored this season (${playerA.form} form)`,
      `${playerA.startProbability}% expected start probability`,
    ],
  };

  const compB: ComparisonPlayer = {
    id: playerB.id,
    name: playerB.fullName || playerB.webName,
    team: playerB.team,
    price: `£${playerB.price.toFixed(1)}m`,
    photoUrl: playerB.photoUrl,
    projectedPoints: playerB.projectedPoints,
    startProbability: playerB.startProbability,
    xGI: playerB.xGI,
    form: playerB.form,
    fixture: `${playerB.currentFixture.opponent} (${playerB.currentFixture.isHome ? "H" : "A"})`,
    fdr: playerB.currentFixture.difficulty,
    selectedBy: `${playerB.selectedByPercent}%`,
    advantages: [
      `Key focal point for ${playerB.team}`,
      `${playerB.selectedByPercent}% overall ownership in FPL`,
      `${playerB.projectedPoints} projected points baseline`,
    ],
  };

  return {
    playerA: compA,
    playerB: compB,
    verdict: {
      recommendedPlayerId: recommended.id,
      headline: `Touchline AI Recommends: Armband on ${recommended.webName} ⚡`,
      summary: `${recommended.webName} holds a +${xpDiff} xP advantage over ${opponent.webName} for GW${gw}. LightGBM model rates ${recommended.team} with higher expected returns and probability of starting.`,
      reasons: [
        `${recommended.webName} leads in model projected points (${recommended.projectedPoints} pts)`,
        `${recommended.startProbability}% start probability rating`,
        `Effective captaincy ceiling against ${recommended.currentFixture.opponent}`,
      ],
      confidence: 86,
    },
  };
}

function generateDynamicInsights(
  players: Player[],
  captain: Player,
  gw: number,
  bestTransferMove?: any,
  newsItems?: any[]
): InsightItem[] {
  const starters = players.filter((p) => !p.isBench);
  const bench = players.filter((p) => p.isBench);

  // 1. Captaincy Insight (Success)
  const captaincyInsight: InsightItem = {
    id: `ins-cap-${Date.now()}`,
    type: "captaincy",
    severity: "success",
    badge: "Armband Recommendation",
    title: `${captain.webName} vs ${captain.currentFixture.opponent} (${captain.currentFixture.isHome ? "H" : "A"})`,
    summary: `Top projected points earner (${captain.projectedPoints} pts) in your squad for GW${gw}.`,
    expandedDetail: `Our LightGBM model projects ${captain.webName} as your highest expected return asset (${captain.projectedPoints} xP, ${captain.startProbability}% start probability).`,
    actionText: `Confirm ${captain.webName} (C)`,
    actionPayload: `captain-${captain.id}`,
  };

  // 2. Transfer Insight if available
  let secondInsight: InsightItem;
  if (bestTransferMove && bestTransferMove.transfersIn?.[0]) {
    const pIn = bestTransferMove.transfersIn[0].player;
    const pOut = bestTransferMove.transfersOut[0];
    const netGain = bestTransferMove.netGain;
    secondInsight = {
      id: `ins-transfer-${Date.now()}`,
      type: "transfer",
      severity: "success",
      badge: "ILP Transfer Target",
      title: `Transfer Move: +${netGain} Net xP`,
      summary: `Sell ${pOut.webName} (£${pOut.price}m) -> Buy ${pIn.webName} (£${pIn.price}m).`,
      expandedDetail: `ILP solver indicates replacing ${pOut.webName} (${pOut.projectedPoints} xP) with ${pIn.webName} (${pIn.projectedPoints} xP) maximizes your starting XI projection with £${bestTransferMove.remainingBank}m in the bank.`,
      actionText: `View Transfer: ${pIn.webName}`,
      actionPayload: `transfer-${pIn.id}`,
    };
  } else if (newsItems && newsItems.length > 0) {
    const n = newsItems[0];
    secondInsight = {
      id: `ins-news-${Date.now()}`,
      type: "rotation",
      severity: "warning",
      badge: "Press Conference News",
      title: `${n.source}`,
      summary: n.news_text.slice(0, 100) + "...",
      expandedDetail: n.news_text,
      actionText: "Review Health Status",
      actionPayload: "check-injuries",
    };
  } else {
    const candidateWarning =
      starters.find((p) => p.currentFixture.difficulty >= 4) || starters[1] || starters[0];
    secondInsight = {
      id: `ins-warn-${Date.now()}`,
      type: "rotation",
      severity: "warning",
      badge: "Tough Fixture",
      title: `${candidateWarning.webName} facing FDR ${candidateWarning.currentFixture.difficulty}`,
      summary: `${candidateWarning.team} faces difficult defensive resistance against ${candidateWarning.currentFixture.opponent}.`,
      expandedDetail: `${candidateWarning.webName} has a projected score of ${candidateWarning.projectedPoints} pts. Monitor press conferences for rotation signals.`,
      actionText: "Analyze Alternatives",
      actionPayload: "analyze-alt",
    };
  }

  // 3. Bench Priority Insight
  const firstSub = bench[1] || bench[0] || starters[0];
  const benchInsight: InsightItem = {
    id: `ins-bench-${Date.now()}`,
    type: "rotation",
    severity: "warning",
    badge: "Auto-Sub Priority",
    title: `First Sub Priority: ${firstSub.webName}`,
    summary: `${firstSub.webName} (${firstSub.teamShort}) is slotted in 1st auto-sub position (${firstSub.projectedPoints} xP).`,
    expandedDetail: `If any starting outfield player does not feature, ${firstSub.webName} will be the first player subbed on.`,
    actionText: "Optimize Bench",
    actionPayload: "optimize-bench",
  };

  return [captaincyInsight, secondInsight, benchInsight];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entryId = "1", message = "", messages = [], actionType = "" } = body;

    const apiKey = process.env.GEMINI_API_KEY || "";
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

    const squadData = await fetchManagerSquad(entryId);
    const { stats, players } = squadData;

    // Run ILP Optimization Engine
    const optimalXI = solveOptimalStartingXI(players);
    const bestTransferMove = await solveBest1Transfer(
      players,
      stats.inTheBank,
      stats.freeTransfers
    );

    // Differentiate custom free-text query from rigid actionType
    const isFreeTextQuery = typeof message === "string" && message.trim().length > 0;
    const cleanMessage = isFreeTextQuery ? message.trim() : "";

    let userPromptText = "";
    if (isFreeTextQuery) {
      userPromptText = cleanMessage;
    } else if (actionType === "CAPTAINCY_CHECK") {
      userPromptText = `Who should I captain for Gameweek ${stats.nextGameweek} in ${stats.teamName}, and what is the tactical justification?`;
    } else if (actionType === "OPTIMIZE_XI") {
      userPromptText = `Optimize my starting XI formation and bench order for maximum expected points in Gameweek ${stats.nextGameweek}.`;
    } else if (actionType === "TRANSFER_TARGETS") {
      userPromptText = `What is my best transfer move for Gameweek ${stats.nextGameweek} given my £${stats.inTheBank.toFixed(1)}m in the bank and ${stats.freeTransfers} Free Transfer(s)?`;
    } else if (actionType === "CHECK_INJURIES") {
      userPromptText = `Check injury flags, rotation risks, and press conference updates across my squad for Gameweek ${stats.nextGameweek}.`;
    } else {
      userPromptText = `Analyze my current squad for Gameweek ${stats.nextGameweek} and highlight key tactical priorities.`;
    }

    // Map full conversation history into Gemini Content format
    let contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(messages) && messages.length > 0) {
      for (const msg of messages) {
        if (!msg) continue;
        const textContent = (msg.content || msg.text || "").trim();
        if (!textContent) continue;
        const role =
          msg.role === "ai" || msg.role === "assistant" || msg.sender === "assistant"
            ? ("model" as const)
            : ("user" as const);

        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += "\n\n" + textContent;
        } else {
          contents.push({ role, parts: [{ text: textContent }] });
        }
      }
    }

    if (contents.length === 0) {
      contents = [{ role: "user", parts: [{ text: userPromptText }] }];
    } else {
      // Ensure first turn is from user
      if (contents[0].role !== "user") {
        contents.shift();
      }
      // Ensure the last message in contents is a user message
      if (contents.length === 0 || contents[contents.length - 1].role !== "user") {
        contents.push({ role: "user", parts: [{ text: userPromptText }] });
      }
    }

    // Extract recent user messages (last 2 turns) for scoped entity & intent detection
    const recentUserMessages = (messages || [])
      .filter((m: any) => m && (m.role === "user" || m.sender === "user") && (m.content || m.text))
      .slice(-2)
      .map((m: any) => (m.content || m.text || "").trim());

    const combinedQuery = [
      ...recentUserMessages,
      cleanMessage || userPromptText,
    ].join(" ");

    const entityExtraction = await extractEntitiesAndIntent(combinedQuery, players);
    const targetGW = stats.currentGameweek || 1;
    const miniLedgerText = await fetchVerifiedGameweekLedger(
      entityExtraction.mentionedPlayerIds,
      entityExtraction.mentionedTeamIds,
      targetGW
    );

    const hasVerifiedLedger = Boolean(miniLedgerText && miniLedgerText.trim().length > 0);

    // Programmatic Tool Gating:
    // If IS_FACT_QUERY is true and we have verified data in the mini-ledger, set tools = [] to eliminate hallucinations
    // If IS_NEWS_QUERY is true or no local match is found, pass tools = [{ googleSearch: {} }]
    let toolsConfig: any[] = [];
    if (entityExtraction.isFactQuery && hasVerifiedLedger) {
      toolsConfig = [];
    } else if (entityExtraction.isNewsQuery || !hasVerifiedLedger) {
      toolsConfig = [{ googleSearch: {} }];
    }

    // Vector Similarity Search for Press Conference & Injury News
    const newsQuery =
      actionType === "CHECK_INJURIES"
        ? "Premier League injury fitness update rotation team news press conference"
        : userPromptText;
    const relevantNews = await fetchRelevantNews(newsQuery, genAI);

    // Outfield starters sorted by projected points
    const starters = players.filter((p) => !p.isBench);
    const outfieldStarters = starters
      .filter((p) => p.position !== "GKP")
      .sort((a, b) => b.projectedPoints - a.projectedPoints);

    const topPlayerA = optimalXI.captain || outfieldStarters[0] || starters[0];
    const topPlayerB = optimalXI.viceCaptain || outfieldStarters[1] || starters[1] || topPlayerA;

    const captainPlayer =
      players.find((p) => p.id === squadData.captainId || p.isCaptain) ||
      optimalXI.captain;

    const lowerQuery = userPromptText.toLowerCase();

    // Determine whether to include captaincy comparison card
    const isCaptaincyExplicitQuery =
      actionType === "CAPTAINCY_CHECK" ||
      lowerQuery.includes("who should i captain") ||
      lowerQuery.includes("armband") ||
      (lowerQuery.includes("captain") && (lowerQuery.includes(" or ") || lowerQuery.includes(" vs "))) ||
      lowerQuery.includes("compare");

    const comparisonCard = isCaptaincyExplicitQuery
      ? generateComparisonCard(topPlayerA, topPlayerB, stats.nextGameweek)
      : null;

    const dynamicInsights = generateDynamicInsights(
      players,
      captainPlayer,
      stats.nextGameweek,
      bestTransferMove,
      relevantNews
    );

    const quickActions = [
      { label: "Captaincy Advice", action: "CAPTAINCY_CHECK" },
      { label: "Optimize Starting XI", action: "OPTIMIZE_XI" },
      { label: "Transfer Targets", action: "TRANSFER_TARGETS" },
      { label: "Squad Fitness & Flags", action: "CHECK_INJURIES" },
    ];

    // Format ILP Transfer Suggestion string for LLM Context
    let transferContextText = "No transfer recommended (current squad is mathematically optimal for 1-FT).";
    if (bestTransferMove && bestTransferMove.transfersIn.length > 0) {
      const pIn = bestTransferMove.transfersIn[0].player;
      const pOut = bestTransferMove.transfersOut[0];
      const drivers = bestTransferMove.transfersIn[0].shapDrivers
        ? bestTransferMove.transfersIn[0].shapDrivers
            .map((d) => `${d.feature} (${d.impact})`)
            .join(", ")
        : "Form & Minutes consistency";
      transferContextText = `Transfer Out: ${pOut.webName} (${pOut.teamShort}, £${pOut.price}m, ${pOut.projectedPoints} xP)\nTransfer In: ${pIn.webName} (${pIn.teamShort}, £${pIn.price}m, ${pIn.projectedPoints} xP)\nNet Gain: +${bestTransferMove.netGain} xP | Remaining Bank: £${bestTransferMove.remainingBank}m\nKey SHAP Drivers: ${drivers}`;
    }

    // Format Vector News context
    let newsContextText = "No specific press conference alerts matched this query.";
    if (relevantNews && relevantNews.length > 0) {
      newsContextText = relevantNews
        .map(
          (n, idx) =>
            `  ${idx + 1}. [${n.source} (${(n.similarity * 100).toFixed(0)}% Match)]: "${n.news_text}"`
        )
        .join("\n");
    }

    // Overhauled System Prompt with Verified Ground Truth Ledger & Anti-Defaulting Directives
    const systemInstruction = `You are "Touchline AI", an expert Fantasy Premier League (FPL) tactical assistant and data scientist.
Your primary goal is to directly and conversationally answer the user's specific questions. If the user asks about a specific player's viability (e.g., rotation risk, clean sheet odds, transfer targets, form, tactical role), analyze the provided squad data, xP projections, FDR, and news RAG context to give a sharp, tactical answer. Do NOT default to listing their optimal starting XI unless specifically requested.
Use the Google Search tool when enabled to verify recent match results, real-time injuries, and live FPL data. Always read the conversation history to understand pronoun references (e.g., 'he' or 'him') before answering.
When a 'VERIFIED GAMEWEEK MATCH LEDGER' is provided, treat it as absolute mathematical truth for all player stats and scores. Never contradict this ledger or claim a player scored/assisted if the ledger shows 0.

${miniLedgerText ? `\n${miniLedgerText}\n` : ""}

=== LIVE MANAGER & SQUAD CONTEXT ===
- Manager: ${stats.managerName} | Team: "${stats.teamName}" (FPL ID: #${entryId})
- Gameweek: Current GW${stats.currentGameweek} • Target Upcoming GW${stats.nextGameweek}
- Overall Rank: #${stats.overallRank.toLocaleString()} (Top ${stats.overallRankPercentile}%) • Points: ${stats.overallPoints} pts
- In The Bank (ITB): £${stats.inTheBank.toFixed(1)}m | Free Transfers: ${stats.freeTransfers} FT | Team Value: £${stats.teamValue.toFixed(1)}m
- Current Squad (${players.length} players):
${players
  .map(
    (p) =>
      `  • ${p.webName} (${p.teamShort}, ${p.position}) - Price: £${p.price.toFixed(1)}m, ML xP: ${p.projectedPoints} pts, Form: ${p.form}, Fixture: ${p.currentFixture.opponent} (${p.currentFixture.isHome ? "H" : "A"}, FDR ${p.currentFixture.difficulty}), Start%: ${p.startProbability}%, Status: ${p.status || "available"}${p.news ? ` [Medical: ${p.news}]` : ""}`
  )
  .join("\n")}

=== MATHEMATICAL ILP OPTIMIZATION REFERENCE ===
- Optimal Starting Formation: ${optimalXI.formation} (Projected: ${optimalXI.totalStartingXP} xP)
- Top Captain Pick: ${optimalXI.captain.webName} (${optimalXI.captain.teamShort}) - ${optimalXI.captain.projectedPoints} xP
- Top Vice-Captain Pick: ${optimalXI.viceCaptain.webName} (${optimalXI.viceCaptain.teamShort}) - ${optimalXI.viceCaptain.projectedPoints} xP
- Optimal 1-Transfer Move: ${transferContextText}

=== REAL-TIME PRESS CONFERENCES & MEDICAL INTEL ===
${newsContextText}

=== STRICT GUIDELINES FOR YOUR RESPONSE ===
1. Direct Focus: Always answer the user's exact question or topic first. If they ask about a specific player (e.g., Szoboszlai, Palmer, Saka, Diaz, Elanga), analyze that specific player's expected minutes, fixture difficulty, attacking/defensive threat, price bracket competition, and rotation risk directly.
2. Anti-Defaulting Rule: NEVER default to dumping the starting XI or full team layout unless the user explicitly asks for their starting XI or team optimization.
3. Ground Truth Strictness: Never hallucinate match scores or player stats when the VERIFIED GAMEWEEK MATCH LEDGER contains the true numbers.
4. Pronoun and Context Awareness: Evaluate the conversation history carefully when resolving references like "him", "he", "them", or "both".
5. Tone: Authoritative, tactical, concise, and engaging FPL punditry with exact data points (FDR, xP, price, form).
6. Formatting: Use clean Markdown with bolding on player names, clear headers (###), and bullet points where helpful. Keep it mobile-friendly (2-4 concise paragraphs/sections).`;

    let responseText = "";

    // Call Google Gemini API with gated tools and fallback models (12s timeout)
    if (genAI) {
      const candidateModels = [
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.6-flash",
        "gemini-3-flash-preview",
        "gemini-3.7-flash",
        "gemini-flash-latest",
      ];

      for (const modelName of candidateModels) {
        try {
          const modelOptions: any = {
            model: modelName,
            systemInstruction: systemInstruction,
          };

          if (toolsConfig && toolsConfig.length > 0) {
            modelOptions.tools = toolsConfig;
          }

          const model = genAI.getGenerativeModel(modelOptions);
          const geminiPromise = model.generateContent({ contents });
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 12000)
          );

          const result: any = await Promise.race([geminiPromise, timeoutPromise]);
          if (result && result.response) {
            const geminiText = result.response.text();
            if (geminiText && geminiText.trim().length > 0) {
              responseText = geminiText.trim();
              break;
            }
          }
        } catch (geminiError: any) {
          console.warn(`Model ${modelName} attempt with tools error:`, geminiError.message || geminiError);

          // Retry without tools if toolsConfig was rejected or rate limited
          if (toolsConfig.length > 0) {
            try {
              const fallbackModel = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemInstruction,
              });
              const fallbackPromise = fallbackModel.generateContent({ contents });
              const timeoutPromise = new Promise<null>((resolve) =>
                setTimeout(() => resolve(null), 8000)
              );
              const result: any = await Promise.race([fallbackPromise, timeoutPromise]);
              if (result && result.response) {
                const geminiText = result.response.text();
                if (geminiText && geminiText.trim().length > 0) {
                  responseText = geminiText.trim();
                  break;
                }
              }
            } catch {
              continue;
            }
          }
        }
      }
    }

    // Dynamic Context-Aware Fallback (only used if Gemini API is unreachable or rate limited)
    if (!responseText) {
      if (actionType === "OPTIMIZE_XI" || (!isFreeTextQuery && lowerQuery.includes("optimize"))) {
        responseText = `### ⚡ Mathematically Optimal Starting XI (GW${stats.nextGameweek})\n\n- **Formation**: **${optimalXI.formation}** (Total Projected: **${optimalXI.totalStartingXP} pts**)\n- **Captain**: **${optimalXI.captain.webName} (C)** (${optimalXI.captain.projectedPoints} xP)\n- **Vice-Captain**: **${optimalXI.viceCaptain.webName} (VC)** (${optimalXI.viceCaptain.projectedPoints} xP)\n- **Starting XI**: ${optimalXI.starters.map((p) => p.webName).join(", ")}\n- **Bench Priority**: ${optimalXI.bench.map((p, idx) => `B${idx + 1}: ${p.webName}`).join(" · ")}`;
      } else if (actionType === "CAPTAINCY_CHECK" || (!isFreeTextQuery && lowerQuery.includes("captain"))) {
        responseText = `### 👑 Gameweek ${stats.nextGameweek} Captaincy Recommendation\n\nOur LightGBM model projects **${topPlayerA.webName}** (${topPlayerA.teamShort}) as your premier armband pick with **${topPlayerA.projectedPoints} xP** (${topPlayerA.startProbability}% start probability) vs **${topPlayerA.currentFixture.opponent}** (${topPlayerA.currentFixture.isHome ? "H" : "A"}).\n\n**Vice-Captain Option**: **${topPlayerB.webName}** (${topPlayerB.teamShort}) with **${topPlayerB.projectedPoints} xP**.`;
      } else if (actionType === "TRANSFER_TARGETS" || (!isFreeTextQuery && lowerQuery.includes("transfer"))) {
        if (bestTransferMove && bestTransferMove.transfersIn.length > 0) {
          const pIn = bestTransferMove.transfersIn[0].player;
          const pOut = bestTransferMove.transfersOut[0];
          responseText = `### 🔄 Optimal 1-Transfer Recommendation\n\n- **Transfer Out**: **${pOut.webName}** (${pOut.teamShort}, £${pOut.price}m, ${pOut.projectedPoints} xP)\n- **Transfer In**: **${pIn.webName}** (${pIn.teamShort}, £${pIn.price}m, ${pIn.projectedPoints} xP)\n- **Net Projected Gain**: **+${bestTransferMove.netGain} xP**\n- **Remaining Budget**: **£${bestTransferMove.remainingBank}m ITB**`;
        } else {
          responseText = `Your current 15-player squad is mathematically optimal for Gameweek ${stats.nextGameweek}. We recommend rolling your Free Transfer to carry 2 FTs into next gameweek.`;
        }
      } else if (actionType === "CHECK_INJURIES" || (!isFreeTextQuery && lowerQuery.includes("injury"))) {
        if (relevantNews && relevantNews.length > 0) {
          responseText = `### 🚑 Real-Time Medical & Press Conference Briefing\n\n` +
            relevantNews.map((n) => `- **${n.source}**: ${n.news_text}`).join("\n\n");
        } else {
          responseText = `No critical injury flags detected across your active squad. All starting XI outfielders are rated available for Gameweek ${stats.nextGameweek}.`;
        }
      } else if (hasVerifiedLedger) {
        responseText = `### Verified Matchday Telemetry (GW${targetGW})\n\n${miniLedgerText}\n\nAll metrics are verified from official Premier League match logs.`;
      } else {
        const matchedSquadPlayer = players.find(
          (p) =>
            lowerQuery.includes(p.webName.toLowerCase()) ||
            lowerQuery.includes(p.fullName.toLowerCase())
        );

        if (matchedSquadPlayer) {
          const fixture = matchedSquadPlayer.currentFixture;
          responseText = `### Tactical Report: **${matchedSquadPlayer.webName}** (${matchedSquadPlayer.teamShort})\n\n` +
            `• **Upcoming Matchup**: vs **${fixture.opponent}** (${fixture.isHome ? "Home" : "Away"}) — Fixture Difficulty: **FDR ${fixture.difficulty}**\n` +
            `• **Projections**: **${matchedSquadPlayer.projectedPoints} xP** with a **${matchedSquadPlayer.startProbability}%** probability of starting\n` +
            `• **Season Form**: **${matchedSquadPlayer.form}** (${matchedSquadPlayer.totalPoints} total points, price £${matchedSquadPlayer.price.toFixed(1)}m)\n` +
            (matchedSquadPlayer.news ? `• **Medical Intel**: ${matchedSquadPlayer.news}\n\n` : "\n") +
            (fixture.difficulty <= 2
              ? `**Tactical Verdict**: Highly favorable fixture. Excellent candidate for your starting XI with strong attacking/defensive potential.`
              : fixture.difficulty >= 4
              ? `**Tactical Verdict**: Facing stern defensive opposition. Moderate ceiling for Gameweek ${stats.nextGameweek}; consider benching if you have strong depth.`
              : `**Tactical Verdict**: Balanced fixture. Expected to maintain a solid baseline return for Gameweek ${stats.nextGameweek}.`);
        } else {
          responseText = `Regarding **"${cleanMessage}"** for Gameweek ${stats.nextGameweek}:\n\nWith **£${stats.inTheBank.toFixed(1)}m ITB** and **${stats.freeTransfers} Free Transfer(s)** in **${stats.teamName}**, our model recommends assessing upcoming FDR swings before locking in changes. Would you like a breakdown of specific transfer targets, captaincy picks, or rotation risks?`;
        }
      }
    }

    return NextResponse.json({
      text: responseText,
      comparisonCard,
      insights: dynamicInsights,
      quickActions,
      stats,
      captainId: squadData.captainId,
      viceCaptainId: squadData.viceCaptainId,
      optimalXI,
      bestTransferMove,
      news: relevantNews,
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to process chat decision",
        text: "I encountered an issue analyzing your squad. Please verify your FPL Team ID.",
      },
      { status: 500 }
    );
  }
}
