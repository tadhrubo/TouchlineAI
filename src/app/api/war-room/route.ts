import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface WarRoomDigest {
  gameweek: number;
  executive_briefing: string;
  press_conference_radar: string[];
  creator_and_reddit_consensus: {
    top_buys: string[];
    top_sells: string[];
    captaincy_poll_leader: string;
  };
  community_traps_vs_sota_math: string[];
  shield_vs_sword_captaincy: {
    shield: string;
    sword: string;
  };
  player_specific_intel?: Array<{
    player_web_name: string;
    news_text: string;
    source: string;
  }>;
}

export async function GET() {
  try {
    // 1. Try local cache from backend/ml/models/gw_intelligence_digest.json
    const digestPath = path.join(
      process.cwd(),
      "backend",
      "ml",
      "models",
      "gw_intelligence_digest.json"
    );

    if (fs.existsSync(digestPath)) {
      try {
        const fileContent = fs.readFileSync(digestPath, "utf-8");
        const parsed = JSON.parse(fileContent) as WarRoomDigest;
        const stat = fs.statSync(digestPath);
        return NextResponse.json({
          success: true,
          digest: parsed,
          source: "local_cache",
          updatedAt: stat.mtime.toISOString(),
        });
      } catch (parseErr) {
        console.warn("Failed parsing local gw_intelligence_digest.json:", parseErr);
      }
    }

    // 2. Fallback to Supabase team_news where source = 'GW_WAR_ROOM_DIGEST'
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from("team_news")
        .select("news_text, published_at")
        .eq("source", "GW_WAR_ROOM_DIGEST")
        .order("published_at", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].news_text) {
        try {
          const parsed = JSON.parse(data[0].news_text) as WarRoomDigest;
          return NextResponse.json({
            success: true,
            digest: parsed,
            source: "supabase_db",
            updatedAt: data[0].published_at,
          });
        } catch (dbParseErr) {
          console.warn("Failed parsing Supabase GW_WAR_ROOM_DIGEST:", dbParseErr);
        }
      }
    }

    // 3. Graceful fallback if neither is available
    const fallbackDigest: WarRoomDigest = {
      gameweek: 10,
      executive_briefing:
        "Gameweek deadline desk active. Poisson SOTA engine and Monte Carlo simulations loaded.",
      press_conference_radar: [
        "Check official Premier League press conference team sheets before deadline.",
      ],
      creator_and_reddit_consensus: {
        top_buys: ["Evaluate form vs underlying xGI before committing transfers."],
        top_sells: ["Flagged or injured assets with high ownership drop priority."],
        captaincy_poll_leader: "Haaland (MCI) template high-EO benchmark.",
      },
      community_traps_vs_sota_math: [
        "Scrutinize high-volume transfer bandwagons against per-90 Poisson underlying rates.",
      ],
      shield_vs_sword_captaincy: {
        shield: "Haaland (MCI) - High ownership protection.",
        sword: "Mbeumo (MUN) / Palmer (CHE) - High differential ceiling.",
      },
    };

    return NextResponse.json({
      success: true,
      digest: fallbackDigest,
      source: "fallback",
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error in /api/war-room:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error fetching war room digest",
      },
      { status: 500 }
    );
  }
}

