export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const fplHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;
    if (!entryId) {
      return NextResponse.json({ error: "Missing entryId" }, { status: 400 });
    }

    const entryRes = await fetch(
      `https://fantasy.premierleague.com/api/entry/${entryId}/`,
      {
        headers: fplHeaders,
        next: { revalidate: 60 },
      }
    );

    if (!entryRes.ok) {
      return NextResponse.json(
        { error: `FPL API returned ${entryRes.status}` },
        { status: entryRes.status }
      );
    }

    const entryData = await entryRes.json();
    const classicLeagues = (entryData.leagues?.classic || []).map((l: any) => ({
      id: l.id,
      name: l.name,
      entryRank: l.entry_rank,
      entryLastRank: l.entry_last_rank,
      rankCount: l.rank_count,
      leagueType: l.league_type === "x" ? "Private" : "Public",
      scoring: l.scoring,
      startEvent: l.start_event,
    }));

    return NextResponse.json({
      entryId: Number(entryId),
      managerName: `${entryData.player_first_name} ${entryData.player_last_name}`,
      teamName: entryData.name,
      overallRank: entryData.summary_overall_rank,
      classicLeagues,
    });
  } catch (error: any) {
    console.error("Error in /api/league/user/[entryId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch user leagues" },
      { status: 500 }
    );
  }
}
