import { getCurrentUser, getUserConnection, sanitizeConnection } from "@/lib/trading212/connections";
import { trading212Fetch } from "@/lib/trading212/client";

export type Trading212Summary = {
  free?: number | null;
  total?: number | null;
  ppl?: number | null;
  result?: number | null;
  invested?: number | null;
  pieCash?: number | null;
  blocked?: number | null;
};

export async function getTrading212ConnectionForUser() {
  const user = await getCurrentUser();
  return getUserConnection(user.id);
}

export async function fetchTrading212Summary(): Promise<{
  connected: boolean;
  summary: Trading212Summary | null;
  connection: Record<string, unknown> | null;
}> {
  const connection = await getTrading212ConnectionForUser();

  if (!connection?.api_key_encrypted || !connection.is_connected) {
    return {
      connected: false,
      summary: null,
      connection: sanitizeConnection(connection as unknown as Record<string, unknown>),
    };
  }

  const summary = await trading212Fetch<Trading212Summary>(connection, "/equity/account/cash");

  return {
    connected: true,
    summary,
    connection: sanitizeConnection(connection as unknown as Record<string, unknown>),
  };
}
