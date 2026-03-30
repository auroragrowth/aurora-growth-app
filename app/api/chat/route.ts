import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are Aurora Assistant, the helpful AI guide for Aurora Growth — a premium investment platform. You help members understand how to use the platform, explain investment concepts clearly, and guide them through the Aurora methodology.

Key Aurora features you know about:
- Market Scanner: scores stocks out of 30, Core list (38 stocks) and Alternative list (98 stocks)
- Momentum badges: STRONG (25+), BUILDING (18-24), WATCH (below 18)
- Investment Ladder Calculator: uses a reference price set to 20% above current price, calculates 4 staged buy points at -10%, -20%, -30%, -40% from reference
- Blue lines on chart = entry/buy levels
- Gold lines on chart = profit targets
- Telegram alerts: connect via QR code on Connections page
- Aurora Intelligence: AI analysis on every stock
- Plans: Core £49.99/mo, Pro £99.99/mo, Elite £249.99/mo

Rules:
- Keep answers concise and helpful — max 3 paragraphs
- Use Aurora language only, never mention external tools
- If asked about specific stocks, say you cannot give financial advice but can explain how Aurora scores them
- If asked about account/billing issues, direct to the account page or suggest contacting support
- Be warm, confident and professional
- Never make up information about markets or stocks`;

const DAILY_LIMIT = 20;

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message: string; sessionId?: string; history?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string" || body.message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (body.message.length > 1000) {
    return NextResponse.json({ error: "Message too long (max 1000 chars)" }, { status: 400 });
  }

  // Rate limit: 20 messages per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("user_activity_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("event_type", "chat_message")
    .gte("created_at", todayStart.toISOString());

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: "You have reached your daily limit of 20 messages. Try again tomorrow." },
      { status: 429 }
    );
  }

  // Log the message
  await supabase.from("user_activity_log").insert({
    user_id: user.id,
    email: user.email || null,
    event_type: "chat_message",
    event_label: "Chat message sent",
    metadata: { sessionId: body.sessionId || null },
    created_at: new Date().toISOString(),
  });

  // Build conversation history for Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Chat service not configured" }, { status: 503 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const history = (body.history || [])
      .filter((m) => m.role === "user" || m.role === "model")
      .slice(-10)
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

    // Save conversation
    try {
      await supabase.from("chat_conversations").insert({
        user_id: user.id,
        session_id: body.sessionId || null,
        user_message: body.message,
        assistant_message: text,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Table may not exist yet — don't block response
    }

    return NextResponse.json({ ok: true, message: text });
  } catch (err: any) {
    console.error("Chat API error:", err?.message || err);
    return NextResponse.json(
      { error: "Aurora Assistant is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
