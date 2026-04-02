/**
 * TradingView resolves bare tickers automatically.
 * No need to prefix with exchange — it finds the primary listing.
 */
export function getTVSymbol(ticker: string): string {
  return ticker.toUpperCase()
}
