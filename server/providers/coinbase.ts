// Fetches spot prices and 24h change for crypto pairs from Coinbase

export interface CoinbaseSpotPrice {
  pair: string;
  symbol: string;
  price: number;
  changePct: number;
}

export async function getSpotPrices(
  pairs: string[]
): Promise<CoinbaseSpotPrice[]> {
  const results: CoinbaseSpotPrice[] = [];
  await Promise.all(
    pairs.map(async (pair) => {
      try {
        const [spotRes, statsRes] = await Promise.all([
          fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`),
          fetch(`https://api.exchange.coinbase.com/products/${pair}/stats`),
        ]);
        const spotJson = await spotRes.json();
        const symbol = pair.split("-")[0];
        const price = parseFloat(spotJson.data?.amount);
        let changePct = 0;
        if (statsRes.ok) {
          const stats = await statsRes.json();
          const open = parseFloat(stats.open);
          if (!isNaN(open) && open > 0) {
            changePct = ((price - open) / open) * 100;
          }
        }
        if (!isNaN(price)) {
          results.push({ pair, symbol, price, changePct });
        }
      } catch {}
    })
  );
  return results;
}
