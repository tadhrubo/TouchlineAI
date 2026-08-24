import { NextRequest, NextResponse } from "next/server";
import { fetchManagerSquad } from "@/services/fpl";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;

    if (!entryId || isNaN(Number(entryId))) {
      return NextResponse.json(
        { error: "Invalid or missing FPL Entry ID" },
        { status: 400 }
      );
    }

    const data = await fetchManagerSquad(entryId);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in /api/fpl/[entryId]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch FPL manager squad" },
      { status: 500 }
    );
  }
}
