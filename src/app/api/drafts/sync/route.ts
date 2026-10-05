export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400, headers: corsHeaders }
      );
    }

    const { manager_id, gw, picks } = body || {};

    if (!manager_id || !picks) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: manager_id and picks are required.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Attempt to persist to Supabase if table exists
    let dbWarning: string | null = null;
    try {
      const { error } = await supabase
        .from("drafts")
        .upsert(
          {
            manager_id: String(manager_id),
            gw: gw ? Number(gw) : null,
            picks: picks,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "manager_id,gw" }
        );

      if (error) {
        console.warn("Supabase drafts upsert warning:", error.message);
        dbWarning = error.message;
      }
    } catch (dbErr: any) {
      console.warn("Supabase drafts table operation failed:", dbErr?.message);
      dbWarning = dbErr?.message || "Database operation unavailable";
    }

    return NextResponse.json(
      {
        success: true,
        message: "Draft synced",
        manager_id,
        gw: gw ?? null,
        picksCount: Array.isArray(picks) ? picks.length : undefined,
        ...(dbWarning ? { warning: dbWarning } : {}),
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error: any) {
    console.error("Draft sync endpoint error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
