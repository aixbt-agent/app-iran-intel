// Fetches stock quotes from Stooq with Yahoo Finance crumb-auth fallback

export interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// --- Stooq (primary) ---

function stooqSymbol(sym: string): string {
  return `${sym.toLowerCase()}.us`;
}

async function fetchFromStooq(symbols: string[]): Promise<YahooQuote[]> {
  const results: YahooQuote[] = [];
  // Batch in groups of 5 with small delays to avoid Stooq rate limits
  for (let i = 0; i < symbols.length; i += 5) {
    const batch = symbols.slice(i, i + 5);
    if (i > 0) await new Promise((r) => setTimeout(r, 300));
    await Promise.all(
      batch.map(async (sym) => {
        try {
          const stooqSym = stooqSymbol(sym);
          const res = await fetch(
            `https://stooq.com/q/l/?s=${stooqSym}&f=sd2t2ohlcv&h&e=csv`,
            { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) }
          );
          if (!res.ok) return;
          const text = await res.text();
          const lines = text.trim().split("\n");
          if (lines.length < 2) return;
          const vals = lines[1].split(",");
          // Symbol,Date,Time,Open,High,Low,Close,Volume
          const open = parseFloat(vals[3]);
          const high = parseFloat(vals[4]);
          const low = parseFloat(vals[5]);
          const close = parseFloat(vals[6]);
          const volume = parseInt(vals[7]) || 0;
          if (isNaN(close) || close === 0) return;
          // Stooq doesn't give previous close in this endpoint, compute change from open
          const changePct = open > 0 ? ((close - open) / open) * 100 : 0;
          results.push({
            symbol: sym,
            regularMarketPrice: close,
            regularMarketChangePercent: changePct,
            regularMarketVolume: volume,
            marketCap: 0,
            regularMarketOpen: open,
            regularMarketDayHigh: high,
            regularMarketDayLow: low,
          });
        } catch {}
      })
    );
  }
  return results;
}

// --- Yahoo Finance crumb auth (fallback) ---

let cachedCrumb: { crumb: string; cookie: string; ts: number } | null = null;

async function getCrumb(): Promise<{ crumb: string; cookie: string }> {
  if (cachedCrumb && Date.now() - cachedCrumb.ts < 300_000) {
    return cachedCrumb;
  }
  const initRes = await fetch("https://fc.yahoo.com", {
    headers: { "User-Agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(5000),
  });
  await initRes.text();
  const setCookies = initRes.headers.getSetCookie?.() || [];
  const cookies = setCookies.map((c) => c.split(";")[0]).filter(Boolean).join("; ");
  if (!cookies) throw new Error("Yahoo Finance: no cookies received");

  const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "User-Agent": UA, Cookie: cookies },
    signal: AbortSignal.timeout(5000),
  });
  if (!crumbRes.ok) throw new Error(`Yahoo Finance: crumb request failed (${crumbRes.status})`);
  const crumb = await crumbRes.text();
  if (!crumb || crumb.includes("<")) throw new Error("Yahoo Finance: invalid crumb response");

  cachedCrumb = { crumb, cookie: cookies, ts: Date.now() };
  return cachedCrumb;
}

async function fetchFromYahoo(symbols: string[]): Promise<YahooQuote[]> {
  // Try crumb-authenticated v7 endpoint
  try {
    const { crumb, cookie } = await getCrumb();
    const joined = symbols.join(",");
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(joined)}&crumb=${encodeURIComponent(crumb)}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketVolume,marketCap,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Cookie: cookie },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      const results = data.quoteResponse?.result;
      if (results?.length) return results;
    }
  } catch {}

  // Fallback: v8 chart endpoint per-symbol
  let auth: { crumb: string; cookie: string } | null = null;
  try { auth = await getCrumb(); } catch {}

  const results: YahooQuote[] = [];
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const headers: Record<string, string> = { "User-Agent": UA };
        let chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`;
        if (auth) {
          headers.Cookie = auth.cookie;
          chartUrl += `&crumb=${encodeURIComponent(auth.crumb)}`;
        }
        const res = await fetch(chartUrl, { headers, signal: AbortSignal.timeout(10000) });
        if (!res.ok) return;
        const data = await res.json();
        const meta = data.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) return;
        const prevClose = meta.chartPreviousClose || meta.previousClose || 0;
        const price = meta.regularMarketPrice;
        const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
        results.push({
          symbol: sym,
          regularMarketPrice: price,
          regularMarketChangePercent: changePct,
          regularMarketVolume: meta.regularMarketVolume || 0,
          marketCap: 0,
          regularMarketOpen: meta.regularMarketOpen || 0,
          regularMarketDayHigh: meta.regularMarketDayHigh || 0,
          regularMarketDayLow: meta.regularMarketDayLow || 0,
        });
      } catch {}
    })
  );
  return results;
}

// --- Public API ---

export async function getQuotes(symbols: string[]): Promise<YahooQuote[]> {
  // Try Stooq first (no auth required, no domain blocks)
  const stooqResults = await fetchFromStooq(symbols);
  if (stooqResults.length >= symbols.length * 0.8) {
    return stooqResults;
  }

  // Fill missing symbols from Yahoo if Stooq was partial
  const got = new Set(stooqResults.map((q) => q.symbol));
  const missing = symbols.filter((s) => !got.has(s));

  if (missing.length > 0) {
    try {
      const yahooResults = await fetchFromYahoo(missing);
      stooqResults.push(...yahooResults);
    } catch {}
  }

  if (stooqResults.length === 0) {
    throw new Error("Stock quotes: all sources failed");
  }
  return stooqResults;
}
