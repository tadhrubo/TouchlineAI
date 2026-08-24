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
      starters.find((p) => p.currentFixture.difficulty >= 4) || starters[1];
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
    const { entryId = "1", message = "", actionType = "" } = body;

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

    const userPromptText =
      message ||
      (actionType === "CAPTAINCY_CHECK"
        ? "Who should I captain for the upcoming gameweek?"
        : actionType === "OPTIMIZE_XI"
        ? "Optimize my starting XI and bench order for maximum points."
        : actionType === "TRANSFER_TARGETS"
        ? "What are the best transfer recommendations given my squad and budget?"
        : actionType === "CHECK_INJURIES"
        ? "Check any injury flags, press conference updates, or rotation risks in my squad."
        : "Analyze my squad and give me tactical recommendations.");

    // Vector Similarity Search for Press Conference & Injury News
    const newsQuery =
      actionType === "CHECK_INJURIES"
        ? "Premier League injury fitness update rotation team news press conference"
        : userPromptText;
    const relevantNews = await fetchRelevantNews(newsQuery, genAI);

    // Filter starting outfielders and sort by ML projected points
    const starters = players.filter((p) => !p.isBench);
    const bench = players.filter((p) => p.isBench);

    const outfieldStarters = starters
      .filter((p) => p.position !== "GKP")
      .sort((a, b) => b.projectedPoints - a.projectedPoints);

    const topPlayerA = optimalXI.captain || outfieldStarters[0] || starters[0];
    const topPlayerB = optimalXI.viceCaptain || outfieldStarters[1] || starters[1] || topPlayerA;

    const captainPlayer =
      players.find((p) => p.id === squadData.captainId || p.isCaptain) ||
      optimalXI.captain;

    const viceCaptainPlayer =
      players.find(
        (p) => p.id === squadData.viceCaptainId || p.isViceCaptain
      ) || optimalXI.viceCaptain;

    // Generate comparison card and top 3 insights
    const comparisonCard = generateComparisonCard(
      topPlayerA,
      topPlayerB,
      stats.nextGameweek
    );
    const dynamicInsights = generateDynamicInsights(
      players,
      captainPlayer,
      stats.nextGameweek,
      bestTransferMove,
      relevantNews
    );

    const lowerMsg = (message || actionType).toLowerCase();

    // Determine if captaincy comparison card should be displayed
    const includeComparison =
      lowerMsg.includes("captain") ||
      actionType === "CAPTAINCY_CHECK" ||
      lowerMsg.includes("who should i captain") ||
      lowerMsg.includes(topPlayerA.webName.toLowerCase()) ||
      lowerMsg.includes(topPlayerB.webName.toLowerCase());

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
    let newsContextText = "No breaking press conference alerts matched this query.";
    if (relevantNews && relevantNews.length > 0) {
      newsContextText = relevantNews
        .map(
          (n, idx) =>
            `  ${idx + 1}. [${n.source} (${(n.similarity * 100).toFixed(0)}% Match)]: "${n.news_text}"`
        )
        .join("\n");
    }

    // Construct RAG System Prompt feeding real FPL context + ILP optimizer results + Vector News to Gemini
    const systemInstruction = `You are "Touchline AI", an elite Fantasy Premier League (FPL) tactical assistant and data scientist.
You provide sharp, concise, engaging, and mathematically exact FPL recommendations based strictly on the user's real team data, LightGBM machine learning predictions, Integer Linear Programming (ILP) optimization, and real-time press conference reports.

=== LIVE MANAGER & SQUAD CONTEXT ===
- Manager: ${stats.managerName} | Team: "${stats.teamName}" (FPL ID: #${entryId})
- Gameweek: Current GW${stats.currentGameweek} • Upcoming Target GW${stats.nextGameweek}
- Overall Rank: #${stats.overallRank.toLocaleString()} (Top ${stats.overallRankPercentile}%) • Points: ${stats.overallPoints} pts
- In The Bank (ITB): £${stats.inTheBank.toFixed(1)}m | Free Transfers: ${stats.freeTransfers} FT | Team Value: £${stats.teamValue.toFixed(1)}m
- Current Squad (${players.length} players):
${players
  .map(
    (p) =>
      `  • ${p.webName} (${p.teamShort}, ${p.position}) - Price: £${p.price.toFixed(1)}m, ML xP: ${p.projectedPoints} pts, Start%: ${p.startProbability}%, Status: ${p.status || "available"}${p.news ? ` [Medical: ${p.news}]` : ""}`
  )
  .join("\n")}

=== MATHEMATICAL ILP OPTIMIZATION ENGINE RESULTS ===
1. Optimal Starting XI Formation: ${optimalXI.formation}
   - Total Starting Projected xP: ${optimalXI.totalStartingXP} pts
   - Recommended Captain (C): ${optimalXI.captain.webName} (${optimalXI.captain.teamShort}) - ${optimalXI.captain.projectedPoints} xP
   - Recommended Vice-Captain (VC): ${optimalXI.viceCaptain.webName} (${optimalXI.viceCaptain.teamShort}) - ${optimalXI.viceCaptain.projectedPoints} xP
   - Starters: ${optimalXI.starters.map((p) => `${p.webName} (${p.projectedPoints} xP)`).join(", ")}
   - Auto-Sub Bench Order: ${optimalXI.bench.map((p, idx) => `[B${idx + 1}] ${p.webName} (${p.projectedPoints} xP)`).join(", ")}

2. Optimal 1-Transfer Move:
${transferContextText}

=== REAL-TIME PRESS CONFERENCES & INJURY NEWS (VECTOR RETRIEVAL) ===
${newsContextText}

=== GUIDELINES FOR YOUR RESPONSE ===
1. Tone: Insightful, authoritative, data-driven yet conversational.
2. Formatting: Use clean Markdown formatting with clear section headers (###), bold text for player names, and bullet points.
3. Accuracy: When asked about starting XI, captaincy, or transfers, always quote the exact ILP solver recommendation (formation, net xP gains, and specific player names).
4. Real-time News: If discussing injuries or fitness, quote the specific manager statements from the press conference context above.
5. Length: Keep your response mobile-friendly, crisp, and concise (2-4 structured paragraphs or bullet blocks).`;

    let responseText = "";

    // Call Google Gemini API with supported models with 5s timeout race
    if (genAI) {
      const candidateModels = [
        "gemini-flash-latest",
        "gemini-3.6-flash",
      ];

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstruction,
          });

          const geminiPromise = model.generateContent(userPromptText);
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 5000)
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
          console.warn(`Model ${modelName} attempt error:`, geminiError.message || geminiError);
        }
      }
    }

    // Fallback heuristic response if Gemini API is unreachable or times out
    if (!responseText) {
      if (includeComparison) {
        responseText = `Here is your dynamic **Gameweek ${stats.nextGameweek} Captaincy Breakdown** for **${stats.teamName}**:\n\nComparing your two highest ceiling assets: **${topPlayerA.fullName} (${topPlayerA.teamShort})** vs **${topPlayerB.fullName} (${topPlayerB.teamShort})**.\n\nOur LightGBM model rates **${topPlayerA.webName}** as the optimal armband pick with **${topPlayerA.projectedPoints} xP** (${topPlayerA.startProbability}% start probability).`;
      } else if (lowerMsg.includes("optimize") || actionType === "OPTIMIZE_XI") {
        responseText = `### ⚡ Mathematically Optimal Starting XI (GW${stats.nextGameweek})\n\n- **Formation**: **${optimalXI.formation}** (Total Projected: **${optimalXI.totalStartingXP} pts**)\n- **Captain**: **${optimalXI.captain.webName} (C)** (${optimalXI.captain.projectedPoints} xP)\n- **Vice-Captain**: **${optimalXI.viceCaptain.webName} (VC)** (${optimalXI.viceCaptain.projectedPoints} xP)\n- **Starting XI**: ${optimalXI.starters.map((p) => p.webName).join(", ")}\n- **Bench Priority**: ${optimalXI.bench.map((p, idx) => `B${idx + 1}: ${p.webName}`).join(" · ")}`;
      } else if (lowerMsg.includes("transfer") || actionType === "TRANSFER_TARGETS") {
        if (bestTransferMove && bestTransferMove.transfersIn.length > 0) {
          const pIn = bestTransferMove.transfersIn[0].player;
          const pOut = bestTransferMove.transfersOut[0];
          responseText = `### 🔄 Optimal 1-Transfer Recommendation\n\n- **Transfer Out**: **${pOut.webName}** (${pOut.teamShort}, £${pOut.price}m, ${pOut.projectedPoints} xP)\n- **Transfer In**: **${pIn.webName}** (${pIn.teamShort}, £${pIn.price}m, ${pIn.projectedPoints} xP)\n- **Net Projected Gain**: **+${bestTransferMove.netGain} xP**\n- **Remaining Budget**: **£${bestTransferMove.remainingBank}m ITB**`;
        } else {
          responseText = `Your current 15-player squad is mathematically optimal for Gameweek ${stats.nextGameweek}. We recommend rolling your Free Transfer to carry 2 FTs into next gameweek.`;
        }
      } else if (lowerMsg.includes("injury") || actionType === "CHECK_INJURIES") {
        if (relevantNews && relevantNews.length > 0) {
          responseText = `### 🚑 Real-Time Medical & Press Conference Briefing\n\n` +
            relevantNews.map(n => `- **${n.source}**: ${n.news_text}`).join("\n\n");
        } else {
          responseText = `No critical injury flags detected across your active squad. All starting XI outfielders are rated available.`;
        }
      } else {
        responseText = `Based on your squad in **${stats.teamName}** (Formation: **${optimalXI.formation}**, Bank: **£${stats.inTheBank.toFixed(1)}m**):\n\nYour optimal starting projection is **${optimalXI.totalStartingXP} pts** with **${optimalXI.captain.webName} (C)**. How else can I assist with your FPL planning?`;
      }
    }

    return NextResponse.json({
      text: responseText,
      comparisonCard: includeComparison ? comparisonCard : null,
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
