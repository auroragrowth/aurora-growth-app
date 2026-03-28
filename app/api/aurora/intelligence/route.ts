import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ANALYSIS_TTL_MS = 24 * 60 * 60 * 1000;
const OVERVIEW_TTL_MS = 60 * 60 * 1000;

type CacheEntry = { text: string; ts: number };
const analysisCache = new Map<string, CacheEntry>();
const overviewCache = { text: "", ts: 0 };

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export async function GET(req: NextRequest) {
  try {
    const ticker = req.nextUrl.searchParams.get("ticker");
    const mode = req.nextUrl.searchParams.get("mode") || "stock";

    if (mode === "overview") {
      return handleOverview(req);
    }

    if (!ticker) {
      return NextResponse.json(
        { ok: false, error: "ticker is required" },
        { status: 400 }
      );
    }

    const cacheKey = `ai_analysis:${ticker.toUpperCase()}`;
    const cached = analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < ANALYSIS_TTL_MS) {
      return NextResponse.json({
        ok: true,
        analysis: cached.text,
        cached: true,
        ticker: ticker.toUpperCase(),
      });
    }

    const supabase = getSupabase();
    let stockData: any = null;

    if (supabase) {
      const { data } = await supabase
        .from("scanner_results")
        .select("*")
        .eq("ticker", ticker.toUpperCase())
        .maybeSingle();
      stockData = data;
    }

    const anthropic = getAnthropic();
    if (!anthropic) {
      return NextResponse.json({
        ok: true,
        analysis: buildFallbackAnalysis(ticker.toUpperCase(), stockData),
        cached: false,
        ticker: ticker.toUpperCase(),
      });
    }

    const prompt = buildStockPrompt(ticker.toUpperCase(), stockData);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system:
        "You are Aurora Intelligence, an expert investment analyst. Analyse this stock based on its Aurora score, fundamentals and momentum. Be concise, insightful and actionable. Max 3 sentences. Do not mention any external tools or data providers.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text"
        ? message.content[0].text
        : "Analysis unavailable.";

    analysisCache.set(cacheKey, { text, ts: Date.now() });

    return NextResponse.json({
      ok: true,
      analysis: text,
      cached: false,
      ticker: ticker.toUpperCase(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Intelligence failed" },
      { status: 500 }
    );
  }
}

async function handleOverview(req: NextRequest) {
  const force = req.nextUrl.searchParams.get("force") === "1";

  if (!force && overviewCache.text && Date.now() - overviewCache.ts < OVERVIEW_TTL_MS) {
    return NextResponse.json({
      ok: true,
      overview: overviewCache.text,
      cached: true,
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      overview: "Aurora scanner data is loading. Check back shortly.",
      cached: false,
    });
  }

  const { data: rows } = await supabase
    .from("scanner_results")
    .select("ticker,company_name,sector,score,change_percent,scanner_type")
    .order("score", { ascending: false })
    .limit(200);

  const stocks = rows || [];
  const strongCount = stocks.filter((r: any) => (r.score ?? 0) >= 25).length;

  function isRealSector(s: string) {
    if (!s || s.length < 3) return false;
    if (/^[\d.,]+[BKMT]?$/.test(s.trim())) return false;
    return true;
  }

  const sectors = [
    ...new Set(
      stocks.map((r: any) => r.sector).filter((s: any) => isRealSector(String(s || "")))
    ),
  ];

  const topStocks = stocks
    .filter((r: any) => (r.score ?? 0) > 0)
    .slice(0, 3)
    .map((r: any) => r.ticker)
    .filter(Boolean);

  const topSector =
    sectors.length > 0
      ? sectors
          .map((s) => ({
            sector: s as string,
            avgScore:
              stocks
                .filter((r: any) => r.sector === s)
                .reduce((sum: number, r: any) => sum + (r.score ?? 0), 0) /
              stocks.filter((r: any) => r.sector === s).length,
          }))
          .sort((a, b) => b.avgScore - a.avgScore)[0]?.sector
      : null;

  const anthropic = getAnthropic();
  if (!anthropic) {
    const topTickers = topStocks.length > 0 ? ` Strongest momentum: ${topStocks.join(", ")}.` : "";
    const fallback = `Today's Aurora scanner has identified ${strongCount} high-conviction opportunities across ${sectors.length} sectors.${topTickers}`;
    overviewCache.text = fallback;
    overviewCache.ts = Date.now();
    return NextResponse.json({ ok: true, overview: fallback, cached: false });
  }

  const top5 = stocks.slice(0, 5).map((r: any) => `${r.ticker} (score ${r.score})`).join(", ");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 150,
    system:
      "You are Aurora Intelligence. Write a brief one-sentence market overview for the Aurora scanner dashboard. Be concise and insightful. Do not mention any external tools or data providers.",
    messages: [
      {
        role: "user",
        content: `Aurora scanner has ${stocks.length} stocks, ${strongCount} with strong momentum (score ≥30), across ${sectors.length} sectors. Top momentum sector: ${topSector || "mixed"}. Top 5: ${top5}. Write a brief market overview sentence.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text"
      ? message.content[0].text
      : `Today's Aurora scanner shows ${strongCount} strong opportunities across ${sectors.length} sectors.`;

  overviewCache.text = text;
  overviewCache.ts = Date.now();

  return NextResponse.json({ ok: true, overview: text, cached: false });
}

function buildStockPrompt(ticker: string, data: any) {
  if (!data) {
    return `Analyse the stock ${ticker}. I don't have detailed scanner data, so provide a general perspective on this stock.`;
  }

  return `Analyse ${ticker} (${data.company_name || data.company || ticker}):
- Aurora Score: ${data.score ?? "N/A"}/30
- Sector: ${data.sector || "Unknown"}
- Price: $${data.price || "N/A"}
- Change: ${data.change_percent || 0}%
- ROE: ${data.roe || "N/A"}%, ROA: ${data.roa || "N/A"}%, ROI: ${data.roi || "N/A"}%
- EPS This Year: ${data.eps_this_y || "N/A"}%, EPS Next Year: ${data.eps_next_y || "N/A"}%
- PEG: ${data.peg || "N/A"}
- Current Ratio: ${data.current_ratio || "N/A"}, Debt/Equity: ${data.debt_eq || "N/A"}
- Trend: ${data.trend || "flat"}`;
}

function buildFallbackAnalysis(ticker: string, data: any) {
  if (!data) {
    return `Aurora Intelligence is analysing ${ticker}. Check back shortly for your insight.`;
  }

  const score = data.score ?? 0;
  const change = data.change_percent ?? 0;

  let quality = "under observation";
  if (score >= 30) quality = "showing strong fundamental strength";
  else if (score >= 22) quality = "building momentum with solid fundamentals";
  else if (score >= 15) quality = "a developing setup worth monitoring";

  const direction = change > 0 ? "positive" : change < 0 ? "negative" : "flat";

  return `${ticker} is ${quality} with an Aurora score of ${score}. Current price action is ${direction} at ${change.toFixed(2)}%. ${score >= 22 ? "Consider staged entries at support levels." : "Wait for stronger momentum confirmation before entry."}`;
}
