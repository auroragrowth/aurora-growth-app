"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function cleanTicker(v: unknown) {
  return String(v || "").trim().toUpperCase();
}

export async function toggleWatchlist(ticker: string) {
  const supabase = await createClient();
  const t = cleanTicker(ticker);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!auth?.user) throw new Error("Not authenticated");

  const TABLE = "watchlist_items";

  // already on watchlist?
  const { data: existing, error: exErr } = await supabase
    .from(TABLE)
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("ticker", t)
    .maybeSingle();

  if (exErr) throw exErr;

  if (existing?.id) {
    const { error: delErr } = await supabase.from(TABLE).delete().eq("id", existing.id);
    if (delErr) throw delErr;

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/watchlist");
    revalidatePath(`/dashboard/${t}`);
    return { ok: true, added: false, ticker: t };
  }

  const { error: insErr } = await supabase
    .from(TABLE)
    .insert([{ user_id: auth.user.id, ticker: t }]);

  if (insErr) throw insErr;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/watchlist");
  revalidatePath(`/dashboard/${t}`);
  return { ok: true, added: true, ticker: t };
}
