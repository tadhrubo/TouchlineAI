import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchBootstrapStatic, resolveCurrentEvent } from "@/services/fpl";
import { Player, Position } from "@/types/fpl";
import { computeFallbackXP } from "@/utils/xp";

export const dynamic = "force-dynamic";

const POSITION_MAP: Record<number, Position> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

const TEAM_KIT_MAP: Record<string, { color: string; secondaryColor: string; pattern: "solid" | "stripes" | "sleeves" | "halves" }> = {
  ARS: { color: "#EF0107", secondaryColor: "#FFFFFF", pattern: "sleeves" },
  AVL: { color: "#670E36", secondaryColor: "#95BFE5", pattern: "sleeves" },
  BOU: { color: "#DA291C", secondaryColor: "#000000", pattern: "stripes" },
  BRE: { color: "#E30613", secondaryColor: "#FFFFFF", pattern: "stripes" },
  BHA: { color: "#0057B8", secondaryColor: "#FFFFFF", pattern: "stripes" },
  CHE: { color: "#034694", secondaryColor: "#FFFFFF", pattern: "solid" },
  CRY: { color: "#1B458F", secondaryColor: "#C4122E", pattern: "stripes" },
  EVE: { color: "#003399", secondaryColor: "#FFFFFF", pattern: "solid" },
  FUL: { color: "#FFFFFF", secondaryColor: "#000000", pattern: "sleeves" },
  IPS: { color: "#005DAA", secondaryColor: "#FFFFFF", pattern: "solid" },
  LEI: { color: "#003090", secondaryColor: "#FFFFFF", pattern: "solid" },
  LIV: { color: "#C8102E", secondaryColor: "#FFFFFF", pattern: "solid" },
  MCI: { color: "#6CABDD", secondaryColor: "#FFFFFF", pattern: "solid" },
  MUN: { color: "#DA291C", secondaryColor: "#000000", pattern: "solid" },
  NEW: { color: "#241F20", secondaryColor: "#FFFFFF", pattern: "stripes" },
  NFO: { color: "#DD0000", secondaryColor: "#FFFFFF", pattern: "solid" },
  SOU: { color: "#D71920", secondaryColor: "#FFFFFF", pattern: "stripes" },
  TOT: { color: "#FFFFFF", secondaryColor: "#132257", pattern: "sleeves" },
  WHU: { color: "#7A263A", secondaryColor: "#1BB1E7", pattern: "sleeves" },
  WOL: { color: "#FDB913", secondaryColor: "#231F20", pattern: "solid" },
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get("position"); // optional filter

    let query = supabase
      .from("players")
      .select("*, teams(*), player_predictions(*)")
      .order("total_points", { ascending: false });

    let dbPlayers: any[] | null = null;
    try {
      const { data, error } = await query;
      if (error) {
        console.warn("Supabase players fetch error, will fallback to bootstrap-static:", error.message);
      } else {
        dbPlayers = data;
      }
    } catch (dbErr) {
      console.warn("Supabase players exception, will fallback to bootstrap-static:", dbErr);
    }

    let players: Player[] = [];

    // Bootstrap data supplies the current gameweek (per-GW denominator for the xP fallback)
    let bData: any = null;
    try {
      bData = await fetchBootstrapStatic();
    } catch (bErr) {
      console.warn("Bootstrap-static fetch failed, defaulting current gameweek:", bErr);
    }
    const currentEvent = resolveCurrentEvent(bData);

    if (dbPlayers && dbPlayers.length > 0) {
      players = dbPlayers.map((p: any) => {
        const teamShort = p.teams?.short_name || "PL";
        const teamName = p.teams?.name || "Premier League";
        const kit = TEAM_KIT_MAP[teamShort] || {
          color: "#02894a",
          secondaryColor: "#FFFFFF",
          pattern: "solid" as const,
        };

        const posType = POSITION_MAP[p.element_type || 3] || "MID";
        const pred = p.player_predictions?.[0];
        const totalPts = p.total_points || 0;
        const priceVal = (p.now_cost || 50) / 10;
        const projectedPts = pred?.projected_points != null
          ? Number(pred.projected_points.toFixed(1))
          : computeFallbackXP(totalPts, currentEvent, posType);

        return {
          id: String(p.id),
          name: p.web_name || `${p.first_name} ${p.second_name}`,
          webName: p.web_name || `${p.first_name} ${p.second_name}`,
          fullName: `${p.first_name || ""} ${p.second_name || ""}`.trim() || p.web_name,
          team: teamName,
          teamShort: teamShort,
          teamColor: kit.color,
          teamSecondaryColor: kit.secondaryColor,
          teamPattern: kit.pattern,
          position: posType,
          price: priceVal,
          selectedByPercent: Number(p.selected_by_percent || "5.0"),
          totalPoints: totalPts,
          gameweekPoints: 0,
          projectedPoints: projectedPts,
          form: Number(p.form || (totalPts / 10).toFixed(1)),
          xG: 0.1,
          xA: 0.1,
          xGI: 0.2,
          minutesExpected: 90,
          startProbability: pred?.start_probability != null ? Number(pred.start_probability.toFixed(1)) : 85,
          status: p.status === "i" ? "injured" : p.status === "d" ? "doubtful" : "available",
          news: p.news || undefined,
          currentFixture: {
            opponent: "PL",
            isHome: true,
            difficulty: 3,
            gameweek: 1,
          },
          upcomingFixtures: [],
          photoUrl: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.id}.png`,
          top10kEo: p.top_10k_eo != null ? Number(p.top_10k_eo) : undefined,
          top_10k_eo: p.top_10k_eo != null ? Number(p.top_10k_eo) : undefined,
        };
      });
    } else {
      if (!bData) {
        throw new Error("Failed to load player data from Supabase and FPL bootstrap-static");
      }
      const teamMap = new Map<number, { name: string; short_name: string }>();
      for (const t of bData.teams || []) {
        teamMap.set(t.id, { name: t.name, short_name: t.short_name });
      }

      players = (bData.elements || []).map((el: any) => {
        const teamInfo = teamMap.get(el.team) || { name: "Premier League", short_name: "PL" };
        const teamShort = teamInfo.short_name;
        const teamName = teamInfo.name;
        const kit = TEAM_KIT_MAP[teamShort] || {
          color: "#02894a",
          secondaryColor: "#FFFFFF",
          pattern: "solid" as const,
        };
        const posType = POSITION_MAP[el.element_type || 3] || "MID";
        const totalPts = el.total_points || 0;
        const priceVal = (el.now_cost || 50) / 10;
        const projectedPts = el.ep_next != null ? parseFloat(el.ep_next) : computeFallbackXP(totalPts, currentEvent, posType);

        return {
          id: String(el.id),
          name: el.web_name || `${el.first_name} ${el.second_name}`,
          webName: el.web_name || `${el.first_name} ${el.second_name}`,
          fullName: `${el.first_name || ""} ${el.second_name || ""}`.trim() || el.web_name,
          team: teamName,
          teamShort: teamShort,
          teamColor: kit.color,
          teamSecondaryColor: kit.secondaryColor,
          teamPattern: kit.pattern,
          position: posType,
          price: priceVal,
          selectedByPercent: Number(el.selected_by_percent || "5.0"),
          totalPoints: totalPts,
          gameweekPoints: 0,
          projectedPoints: projectedPts,
          form: Number(el.form || (totalPts / 10).toFixed(1)),
          xG: parseFloat(el.expected_goals) || 0.1,
          xA: parseFloat(el.expected_assists) || 0.1,
          xGI: parseFloat(el.expected_goal_involvements) || 0.2,
          minutesExpected: 90,
          startProbability: el.chance_of_playing_next_round != null ? el.chance_of_playing_next_round : 85,
          status: el.status === "i" ? "injured" : el.status === "d" ? "doubtful" : "available",
          news: el.news || undefined,
          currentFixture: {
            opponent: "PL",
            isHome: true,
            difficulty: 3,
            gameweek: 1,
          },
          upcomingFixtures: [],
          photoUrl: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${el.code}.png`,
        };
      });
    }

    const filtered = position
      ? players.filter((p) => p.position.toUpperCase() === position.toUpperCase())
      : players;

    return NextResponse.json({ players: filtered }, { status: 200 });
  } catch (error: any) {
    console.error("Players route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
