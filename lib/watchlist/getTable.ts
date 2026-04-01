/**
 * Returns the watchlist table name based on broker mode.
 * Uses separate tables for live and demo watchlists.
 */
export function getWatchlistTable(mode: string | null | undefined): string {
  return mode === "demo" ? "watchlist_demo" : "watchlist_live";
}
