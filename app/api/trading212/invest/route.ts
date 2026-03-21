import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    return NextResponse.json({
      ok: true,
      message: "Trading 212 invest placeholder received.",
      received: {
        ticker: body?.ticker ?? null,
        budget: body?.budget ?? null,
        ladderCount: Array.isArray(body?.ladder) ? body.ladder.length : 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid request body",
      },
      { status: 400 }
    );
  }
}
