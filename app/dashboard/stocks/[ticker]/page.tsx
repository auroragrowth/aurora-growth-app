import StockPageClient from './StockPageClient'

type Props = {
  params: Promise<{
    ticker: string;
  }>;
};

export default async function StockPage({ params }: Props) {
  const { ticker } = await params;

  return <StockPageClient ticker={ticker.toUpperCase()} />;
}
