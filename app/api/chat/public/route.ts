import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are Aurora Assistant on the Aurora Growth website. You help potential members understand what Aurora Growth offers and whether it is right for them.

Aurora Growth is a premium investment platform with:
- Market scanner identifying high-conviction stocks scored out of 30
- Investment ladder calculator for staged buying at optimal entry points
- Telegram price alerts so you never miss an entry
- Aurora Intelligence AI analysis updated daily on every stock
- Plans from £49.99/mo with a 7-day free trial on Core
- Pro plan at £99.99/mo and Elite at £249.99/mo

Keep answers brief and friendly — max 2-3 paragraphs.
Always end with a relevant CTA like "You can try Aurora Core free for 7 days at app.auroragrowth.co.uk/signup"
Never give specific investment advice.
Do not mention competitors or other platforms.`;

const HOURLY_LIMIT = 10;

// Simple in-memory rate limiter by IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true;
  }

  if (entry.count >= HOURLY_LIMIT) return false;
  entry.count++;
  return true;
}

// Clean up old entries every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(ip);
    }
  }, 600_000);
}

export async function POST(req: Request) {
  // Get IP from headers
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit reached. Please try again in an hour." },
      { status: 429 }
    );
  }

  let body: { message: string; history?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string" || body.message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (body.message.length > 500) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Chat service not configured" }, { status: 503 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const history = (body.history || [])
      .filter((m) => m.role === "user" || m.role === "model")
      .slice(-6)
      .map((m) => ({
        role: m.role === "user" ? "user" as const : "model" as const,
        parts: [{ text: m.content }],
      }));

    const chat = model.startChat({
      history,
      systemInstruction: { role: "user" as const, parts: [{ text: SYSTEM_PROMPT }] },
    });

    const result = await chat.sendMessage(body.message);
    const text = result.response.text();

    return NextResponse.json({ ok: true, message: text });
  } catch (err: any) {
    console.error("Public chat error:", err?.message || err);
    return NextResponse.json(
      { error: "Aurora Assistant is temporarily unavailable." },
      { status: 500 }
    );
  }
}
