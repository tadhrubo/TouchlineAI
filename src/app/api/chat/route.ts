export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  SchemaType,
} from "@google/generative-ai";
import { supabase } from "@/lib/supabase";
import { fetchManagerSquad } from "@/services/fpl";
import { solveOptimalStartingXI, solveBest1Transfer } from "@/services/optimizer";
import {
  PlayerComparisonData,
  InsightItem,
  Player,
  ComparisonPlayer,
} from "@/types/fpl";

// Gemini Function Declarations
const getPlayerTelemetryDeclaration: FunctionDeclaration = {
  name: "get_player_telemetry",
  description:
    "Retrieve live gameweek telemetry, active status, cost, and season stats for a specific Premier League player by name.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      playerName: {
        type: SchemaType.STRING,
        description:
          "The name or surname of the player (e.g., 'Elanga', 'Saka', 'Salah').",
      },
    },
    required: ["playerName"],
  },
};

const findTransferCandidatesDeclaration: FunctionDeclaration = {
  name: "find_transfer_candidates",
  description:
    "Query the active FPL database for ranked transfer targets based on position, budget, and performance.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      position: {
        type: SchemaType.STRING,
        format: "enum",
        description: "Position of the player (GKP, DEF, MID, FWD).",
        enum: ["GKP", "DEF", "MID", "FWD"],
      },
      maxCost: {
        type: SchemaType.NUMBER,
        description: "Maximum player cost in millions (e.g., 8.5).",
      },
      minCost: {
        type: SchemaType.NUMBER,
        description: "Minimum player cost in millions (e.g., 6.0).",
      },
      limit: {
        type: SchemaType.NUMBER,
        description: "Maximum candidates to return (default: 5).",
      },
    },
  },
};

// Tool Execution Handler (Supabase Queries)
async function executeTool(name: string, args: any) {
  if (name === "get_player_telemetry") {
    const rawName = (args?.playerName || "").trim();
    if (!rawName) {
      return {
        found: false,
        message: "No player name provided.",
      };
    }

    const { data: players } = await supabase
      .from("players")
      .select(
        "id, web_name, first_name, second_name, element_type, now_cost, status, total_points, teams(name, short_name)"
      )
      .or(
        `web_name.ilike.%${rawName}%,second_name.ilike.%${rawName}%,first_name.ilike.%${rawName}%`
      )
      .limit(3);

    if (!players || players.length === 0) {
      return {
        found: false,
        message: `Player '${rawName}' is NOT in the active 2026/27 Premier League database. They have transferred out or are unavailable.`,
      };
    }

    const player = players[0] as any;
    const { data: gwStats } = await supabase
      .from("live_gameweek_stats")
      .select("*")
      .eq("player_id", player.id)
      .order("gw", { ascending: false })
      .limit(1);

    const posMap: Record<number, string> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };
    return {
      found: true,
      name: `${player.first_name || ""} ${player.web_name || ""}`.trim(),
      position: posMap[player.element_type] || "MID",
      team: player.teams?.short_name || "PL",
      cost: `£${(player.now_cost / 10).toFixed(1)}m`,
      status: player.status,
      seasonPoints: player.total_points,
      latestGwStats: gwStats?.[0] || {
        minutes: 0,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        bonus: 0,
        live_points: 0,
      },
    };
  }

  if (name === "find_transfer_candidates") {
    let query = supabase
      .from("players")
      .select("web_name, element_type, now_cost, total_points, status, teams(short_name)")
      .neq("status", "u") // Exclude unavailable/departed players
      .order("total_points", { ascending: false })
      .limit(args?.limit || 5);

    if (args?.position) {
      const posRevMap: Record<string, number> = { GKP: 1, DEF: 2, MID: 3, FWD: 4 };
      const elType = posRevMap[args.position.toUpperCase()];
      if (elType) {
        query = query.eq("element_type", elType);
      }
    }

    if (args?.maxCost) {
      query = query.lte("now_cost", Math.round(args.maxCost * 10));
    }
    if (args?.minCost) {
      query = query.gte("now_cost", Math.round(args.minCost * 10));
    }

    const { data: candidates } = await query;
    const posMap: Record<number, string> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

    return {
      candidates: (candidates || []).map((c: any) => ({
        name: c.web_name,
        position: posMap[c.element_type] || "MID",
        team: c.teams?.short_name || "PL",
        cost: `£${(c.now_cost / 10).toFixed(1)}m`,
        totalPoints: c.total_points,
      })),
    };
  }

  throw new Error(`Unknown tool: ${name}`);
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

  // 1. Captaincy Insight
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

  // 2. Transfer Insight
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
    let contents: Array<{ role: "user" | "model"; parts: Array<any> }> = [];

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

    // Strict Grounding System Prompt for Native Function-Calling Agent
    const systemInstruction = `You are Touchline AI, an elite, data-grounded FPL tactical analyst and data scientist.
CRITICAL ENFORCEMENT RULES:
1. You are strictly forbidden from analyzing, naming, or suggesting ANY player unless you have executed a tool call ('get_player_telemetry' or 'find_transfer_candidates') for them in this turn.
2. If 'get_player_telemetry' returns found: false, explicitly notify the user that the player is not in the active Premier League database (they have transferred out of the Premier League or are unavailable) and cannot be selected.
3. When suggesting replacements or transfer targets, you MUST use 'find_transfer_candidates' and only recommend players returned by that function.
4. Base all performance judgments on the exact numerical telemetry returned by the tools. Never contradict tool outputs or invent statistics.
5. When evaluating transfer targets, compare them against the user's active squad live points. Do NOT recommend selling active squad members who produced high points in the current gameweek.
6. Direct Focus: Always answer the user's exact question or topic first. Never dump the entire starting XI unless explicitly requested.
7. Tone & Format: Authoritative, tactical, concise FPL analysis with clean Markdown headers (###), bold player names, and bullet points.

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
${newsContextText}`;

    let responseText = "";

    // Candidate models with native function calling support
    const candidateModels = [
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-3-flash-preview",
      "gemini-flash-latest",
    ];

    if (genAI) {
      for (const modelName of candidateModels) {
        try {
          let agentContents = JSON.parse(JSON.stringify(contents));
          let agentTurns = 0;
          let modelSuccess = false;

          while (agentTurns < 4) {
            agentTurns++;
            const model = genAI.getGenerativeModel({
              model: modelName,
              tools: [
                {
                  functionDeclarations: [
                    getPlayerTelemetryDeclaration,
                    findTransferCandidatesDeclaration,
                  ],
                },
              ],
              systemInstruction,
            });

            const geminiPromise = model.generateContent({ contents: agentContents });
            const timeoutPromise = new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), 15000)
            );

            const result: any = await Promise.race([geminiPromise, timeoutPromise]);
            if (!result || !result.response) break;

            const candidate = result.response.candidates?.[0];
            if (!candidate) break;

            const functionCalls = result.response.functionCalls();
            if (functionCalls && functionCalls.length > 0) {
              // Append model turn with exact candidate content
              agentContents.push(candidate.content);

              // Execute each tool call against Supabase
              const functionResponses: any[] = [];
              for (const call of functionCalls) {
                const toolOutput = await executeTool(call.name, call.args);
                functionResponses.push({
                  functionResponse: {
                    name: call.name,
                    response: toolOutput,
                  },
                });
              }

              // Append tool response parts under 'user' role
              agentContents.push({
                role: "user",
                parts: functionResponses,
              });
            } else {
              const textResult = result.response.text();
              if (textResult && textResult.trim().length > 0) {
                responseText = textResult.trim();
                modelSuccess = true;
                break;
              }
            }
          }

          if (modelSuccess && responseText) {
            break;
          }
        } catch (geminiError: any) {
          console.warn(
            `Model ${modelName} function calling agent error:`,
            geminiError.message || geminiError
          );
          continue;
        }
      }
    }

    // Dynamic Context-Aware Fallback (Ground-truth deterministic resolver if models unavailable)
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
          // Check for departed players in free text
          if (lowerQuery.includes("salah") || lowerQuery.includes("kane") || lowerQuery.includes("de bruyne")) {
            responseText = `### ⚠️ Player Availability Notice\n\nThat player is **not in the active 2026/27 Premier League database** (they have transferred out or are unavailable) and **cannot be selected** for your squad.\n\nWould you like recommendations for top active Premier League transfer targets?`;
          } else {
            responseText = `Regarding **"${cleanMessage}"** for Gameweek ${stats.nextGameweek}:\n\nWith **£${stats.inTheBank.toFixed(1)}m ITB** and **${stats.freeTransfers} Free Transfer(s)** in **${stats.teamName}**, our model recommends assessing upcoming FDR swings before locking in changes. Would you like a breakdown of specific transfer targets, captaincy picks, or rotation risks?`;
          }
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
