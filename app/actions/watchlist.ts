"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function normaliseTicker(input: string) {
  return String(input || "").trim().toUpperCase();
}

export async function addToWatchlist(tickerInput: string, companyName?: string) {
  const symbol = normaliseTicker(tickerInput);

  if (!symbol) {
    return { ok: false, error: "Missing symbol" };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("addToWatchlist auth error:", userError);
      return { ok: false, error: userError.message };
    }

    if (!user) {
      return { ok: false, error: "You must be signed in to use the watchlist." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("watchlist_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("symbol", symbol)
      .maybeSingle();

    if (existingError) {
      console.error("addToWatchlist check existing error:", existingError);
      return { ok: false, error: existingError.message };
    }

    if (existing) {
      return { ok: true, alreadyExists: true };
    }

    const { error: insertError } = await supabase.from("watchlist_items").insert({
      user_id: user.id,
      symbol,
      company_name: companyName || null,
    });

    if (insertError) {
      console.error("addToWatchlist insert error:", insertError);
      return { ok: false, error: insertError.message };
    }

    revalidatePath("/dashboard/watchlist");
    revalidatePath("/dashboard/market-scanner");
    revalidatePath("/dashboard/opportunities");
    revalidatePath("/dashboard/investments/calculator");

    return { ok: true, added: true };
  } catch (error) {
    console.error("addToWatchlist unexpected error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to add to watchlist",
    };
  }
}

export async function removeFromWatchlist(tickerInput: string) {
  const symbol = normaliseTicker(tickerInput);

  if (!symbol) {
    return { ok: false, error: "Missing symbol" };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("removeFromWatchlist auth error:", userError);
      return { ok: false, error: userError.message };
    }

    if (!user) {
      return { ok: false, error: "You must be signed in to use the watchlist." };
    }

    const { error: deleteError } = await supabase
      .from("watchlist_items")
      .delete()
      .eq("user_id", user.id)
      .eq("symbol", symbol);

    if (deleteError) {
      console.error("removeFromWatchlist delete error:", deleteError);
      return { ok: false, error: deleteError.message };
    }

    revalidatePath("/dashboard/watchlist");
    revalidatePath("/dashboard/market-scanner");
    revalidatePath("/dashboard/opportunities");
    revalidatePath("/dashboard/investments/calculator");

    return { ok: true, removed: true };
  } catch (error) {
    console.error("removeFromWatchlist unexpected error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to remove from watchlist",
    };
  }
}
