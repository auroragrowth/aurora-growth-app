import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const severity = req.nextUrl.searchParams.get("severity");

  let query = supabaseAdmin
    .from("error_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (severity && severity !== "all") {
    query = query.eq("severity", severity);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const id = body.id as string;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("error_logs")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
