import StockIntelligenceClient from "@/components/stocks/StockIntelligenceClient"

export default async function StockIntelligencePage({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const resolved = await params
  const ticker = decodeURIComponent(resolved.ticker || "AAPL").toUpperCase()

  return <StockIntelligenceClient ticker={ticker} />
}
