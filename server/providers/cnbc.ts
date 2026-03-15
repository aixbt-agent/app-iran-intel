// Fetches real-time commodity futures quotes from CNBC

export interface CommodityQuote {
  symbol: string;
  price: number;
  changePct: number;
}

export async function getCommodityQuotes(
  symbols: Record<string, string>
): Promise<CommodityQuote[]> {
  const cnbcSyms = Object.values(symbols).join("|");
  const url = `https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=${cnbcSyms}&requestMethod=itv&noSubscription=1&partnerId=2&fund=1&exthrs=1&output=json&events=1`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`CNBC API error: ${res.status}`);
  const data = await res.json();

  const cnbcToKey = Object.fromEntries(
    Object.entries(symbols).map(([k, v]) => [v, k])
  );

  const results: CommodityQuote[] = [];
  for (const q of data.FormattedQuoteResult?.FormattedQuote || []) {
    const key = cnbcToKey[q.symbol];
    if (!key) continue;
    const price = parseFloat(String(q.last).replace(/,/g, ""));
    const changePct = parseFloat(String(q.change_pct).replace(/[%+]/g, ""));
    if (!isNaN(price)) {
      results.push({
        symbol: key,
        price,
        changePct: isNaN(changePct) ? 0 : changePct,
      });
    }
  }
  return results;
}
