export function buildProfitTargets(avgPrice: number, shares: number) {
  return [10, 15, 20, 25].map(p => {
    const targetPrice = avgPrice * (1 + p / 100);
    const profit = (targetPrice - avgPrice) * shares;

    return {
      percent: p,
      price: targetPrice,
      profit
    };
  });
}
