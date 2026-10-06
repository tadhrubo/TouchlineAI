export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const fplHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
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
      const text = await entryRes.text().catch(() => "");
      console.error("FPL API Error:", text);
      return NextResponse.json(
        { error: `FPL API returned ${entryRes.status}: Unable to fetch user entry` },
        { status: 500 }
      );
    }

    let entryData: any;
    try {
      entryData = await entryRes.json();
    } catch (parseErr) {
      console.error("FPL API Error (non-JSON):", parseErr);
      return NextResponse.json(
        { error: "FPL API returned non-JSON response (Cloudflare block)" },
        { status: 500 }
      );
    }

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
