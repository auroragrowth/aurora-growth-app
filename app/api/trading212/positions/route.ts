import { NextResponse } from "next/server";

function buildTrading212AuthHeader() {
  const apiKey = process.env.TRADING212_API_KEY;
  const apiSecret = process.env.TRADING212_API_SECRET;

  if (!apiKey || !apiSecret) return null;

  const encoded = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  return `Basic ${encoded}`;
}

export async function GET() {
  try {
    const authHeader = buildTrading212AuthHeader();

    if (!authHeader) {
      return NextResponse.json(
        {
          ok: false,
          error: "Trading 212 credentials missing",
          positions: [],
        },
        { status: 401 }
      );
    }

    const response = await fetch(
      "https://live.trading212.com/api/v0/equity/positions",
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await response.text();

    let data: unknown = [];
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      data = [];
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            typeof data === "object" && data && "error" in data
              ? String((data as { error?: unknown }).error)
              : text || `Trading 212 request failed (${response.status})`,
          positions: [],
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      positions: Array.isArray(data) ? data : [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown server error",
        positions: [],
      },
      { status: 500 }
    );
  }
}
