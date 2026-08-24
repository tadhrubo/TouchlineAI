import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const fplHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json",
};

export interface MatchFixture {
  id: number;
  event: number;
  kickoff_time: string;
  kickoff_formatted: {
    date: string; // e.g. "Sat 29 Aug"
    time: string; // e.g. "17:30"
    iso: string;
  };
  finished: boolean;
  started: boolean;
  team_h: {
    id: number;
    name: string;
    short_name: string;
    code: number;
    score: number | null;
    fdr: number;
  };
  team_a: {
    id: number;
    name: string;
    short_name: string;
    code: number;
    score: number | null;
    fdr: number;
  };
}

export interface TeamFDRCell {
  gw: number;
  opponentId: number;
  opponentShort: string;
  opponentName: string;
  isHome: boolean;
  fdr: number;
}

export interface TeamFDRRow {
  teamId: number;
  name: string;
  short_name: string;
  code: number;
  schedule: TeamFDRCell[];
}

function formatDateHeader(isoString: string): { date: string; time: string; iso: string } {
  if (!isoString) {
    return { date: "TBD", time: "TBD", iso: "" };
  }
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    return { date: "TBD", time: "TBD", iso: isoString };
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const dayName = days[d.getUTCDay()];
  const dateNum = d.getUTCDate();
  const monthName = months[d.getUTCMonth()];
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");

  return {
    date: `${dayName} ${dateNum} ${monthName}`,
    time: `${hours}:${minutes}`,
    iso: isoString,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventParam = searchParams.get("event");
    const typeParam = searchParams.get("type");

    // 1. Fetch bootstrap-static teams and current event info
    let bootstrapData: any = null;
    try {
      const bsRes = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
        headers: fplHeaders,
        next: { revalidate: 300 },
      });
      if (bsRes.ok) {
        bootstrapData = await bsRes.json();
      }
    } catch (e) {
      console.warn("FPL bootstrap-static fetch fallback:", e);
    }

    const rawTeams = bootstrapData?.teams || [];
    const events = (bootstrapData?.events || []).map((ev: any) => ({
      id: ev.id,
      name: ev.name,
      deadline_time: ev.deadline_time,
      is_current: ev.is_current,
      is_next: ev.is_next,
    }));

    const teamMap = new Map<number, { id: number; name: string; short_name: string; code: number }>();
    rawTeams.forEach((t: any) => {
      teamMap.set(t.id, {
        id: t.id,
        name: t.name,
        short_name: t.short_name,
        code: t.code,
      });
    });

    // 2. Fetch all FPL fixtures
    let rawFixtures: any[] = [];
    try {
      const fixRes = await fetch("https://fantasy.premierleague.com/api/fixtures/", {
        headers: fplHeaders,
        next: { revalidate: 300 },
      });
      if (fixRes.ok) {
        rawFixtures = await fixRes.json();
      }
    } catch (e) {
      console.warn("FPL fixtures fetch error:", e);
    }

    // 3. Process fixtures into structured MatchFixture objects
    const allMatches: MatchFixture[] = rawFixtures.map((f: any) => {
      const homeTeam = teamMap.get(f.team_h) || {
        id: f.team_h,
        name: `Team ${f.team_h}`,
        short_name: "PL",
        code: 3,
      };
      const awayTeam = teamMap.get(f.team_a) || {
        id: f.team_a,
        name: `Team ${f.team_a}`,
        short_name: "PL",
        code: 3,
      };

      return {
        id: f.id,
        event: f.event || 1,
        kickoff_time: f.kickoff_time,
        kickoff_formatted: formatDateHeader(f.kickoff_time),
        finished: !!f.finished,
        started: !!f.started,
        team_h: {
          id: homeTeam.id,
          name: homeTeam.name,
          short_name: homeTeam.short_name,
          code: homeTeam.code,
          score: f.team_h_score ?? null,
          fdr: f.team_h_difficulty || 3,
        },
        team_a: {
          id: awayTeam.id,
          name: awayTeam.name,
          short_name: awayTeam.short_name,
          code: awayTeam.code,
          score: f.team_a_score ?? null,
          fdr: f.team_a_difficulty || 3,
        },
      };
    });

    // 4. Build 20-Team FDR Matrix Ticker
    const fdrMatrix: TeamFDRRow[] = rawTeams.map((t: any) => {
      const schedule: TeamFDRCell[] = [];

      for (let gw = 1; gw <= 38; gw++) {
        const gwMatches = allMatches.filter((m) => m.event === gw);
        const match = gwMatches.find((m) => m.team_h.id === t.id || m.team_a.id === t.id);

        if (match) {
          const isHome = match.team_h.id === t.id;
          const opp = isHome ? match.team_a : match.team_h;
          schedule.push({
            gw: gw,
            opponentId: opp.id,
            opponentShort: opp.short_name,
            opponentName: opp.name,
            isHome: isHome,
            fdr: isHome ? match.team_h.fdr : match.team_a.fdr,
          });
        } else {
          // Blank gameweek for this team
          schedule.push({
            gw: gw,
            opponentId: 0,
            opponentShort: "-",
            opponentName: "Blank",
            isHome: true,
            fdr: 1,
          });
        }
      }

      return {
        teamId: t.id,
        name: t.name,
        short_name: t.short_name,
        code: t.code,
        schedule: schedule,
      };
    });

    // 5. If specific event requested, filter fixtures
    if (eventParam && eventParam !== "all") {
      const selectedEvent = parseInt(eventParam, 10) || 1;
      const eventFixtures = allMatches.filter((m) => m.event === selectedEvent);
      return NextResponse.json({
        event: selectedEvent,
        events: events,
        fixtures: eventFixtures,
        fdrMatrix: fdrMatrix,
      });
    }

    return NextResponse.json({
      events: events,
      fixtures: allMatches,
      fdrMatrix: fdrMatrix,
    });
  } catch (error: any) {
    console.error("Fixtures API route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
