export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { fetchManagerSquad, fetchBootstrapStatic } from "@/services/fpl";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;

    if (entryId === "bootstrap") {
      const data = await fetchBootstrapStatic();
      return NextResponse.json(data);
    }

    if (!entryId || isNaN(Number(entryId))) {
      return NextResponse.json(
        { error: "Invalid or missing FPL Entry ID" },
        { status: 400 }
      );
    }

    const data = await fetchManagerSquad(entryId);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("FPL API Error in /api/fpl/[entryId]:", error?.message || error);

    const statusMatch = error?.message?.match(/\((\d{3})\)/);
    const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 500;

    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch FPL manager squad",
        details: "FPL API request failed or was blocked by Cloudflare. Please try again shortly."
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    );
  }
}
