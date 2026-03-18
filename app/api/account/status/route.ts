import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      plan: "Pro",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        plan: "Pro",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
