export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { fetchBootstrapStatic } from "@/services/fpl";

export async function GET() {
  try {
    const data = await fetchBootstrapStatic();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("FPL API Error in /api/bootstrap:", error?.message || error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to load player database",
        details: "FPL bootstrap API request failed or was blocked by Cloudflare. Please try again shortly."
      },
      { status: 500 }
    );
  }
}
