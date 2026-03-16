import StockIntelligenceClient from "@/components/stocks/StockIntelligenceClient";

type Props = {
  params: Promise<{
    ticker: string;
  }>;
};

export default async function StockPage({ params }: Props) {
  const { ticker } = await params;

  return <StockIntelligenceClient ticker={ticker} />;
}
