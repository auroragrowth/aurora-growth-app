export function getTVSymbol(ticker: string): string {
  const nyseStocks = ['B', 'USLM', 'PAY']
  if (nyseStocks.includes(ticker.toUpperCase())) return `NYSE:${ticker.toUpperCase()}`
  return `NASDAQ:${ticker.toUpperCase()}`
}
