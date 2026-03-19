import { createClient } from "@/lib/supabase/server";

const TRADING212_BASE =
  process.env.TRADING212_BASE_URL || "https://live.trading212.com/api/v0";

export type Trading212Summary = {
  accountId?: string | number | null;
  currencyCode?: string | null;
  freeCash?: number | null;
  invested?: number | null;
  result?: number | null;
  total?: number | null;
};

export async function getTrading212ConnectionForUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("user_broker_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("broker", "trading212")
    .eq("is_connected", true)
    .maybeSingle();

  return data || null;
}

export async function fetchTrading212Summary(): Promise<{
  connected: boolean;
  summary: Trading212Summary | null;
  connection: any;
}> {
  const connection = await getTrading212ConnectionForUser();

  if (!connection?.api_key || !connection?.api_secret) {
    return {
      connected: false,
      summary: null,
      connection,
    };
  }

  const credentials = Buffer.from(
    `${connection.api_key}:${connection.api_secret}`
  ).toString("base64");

  const res = await fetch(`${TRADING212_BASE}/equity/account/summary`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Trading 212 summary failed (${res.status})`);
  }

  const summary = (await res.json()) as Trading212Summary;

  return {
    connected: true,
    summary,
    connection,
  };
}
