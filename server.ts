import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { addDataRoute } from '@aixbt-agent/runtime'
import { getCommodityQuotes } from './server/providers/cnbc.js'
import { getQuotes } from './server/providers/yahoo-finance.js'
import { getSpotPrices } from './server/providers/coinbase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = parseInt(process.env.PORT || '3101')

addDataRoute(app, 'iran-intel')

let cache: { data: any; expires: number } | null = null

app.get('/api/prices', async (_req, res) => {
  if (cache && cache.expires > Date.now()) return res.json(cache.data)
  try {
    const [commodities, stocks, crypto] = await Promise.allSettled([
      getCommodityQuotes({ gold: '@GC.1', wti: '@CL.1', brent: '@BZ.1', natgas: '@NG.1' }),
      getQuotes(['RTX', 'LMT', 'NOC', 'URA', 'STNG', 'FRO', 'ITA', 'XLE', 'JETS', 'XLY', 'UVXY', 'GDX', 'KTOS', 'XAR', 'PAVE', 'DBA', 'WEAT', 'XOP', 'KSA', 'EEM', 'SPY']),
      getSpotPrices(['BTC-USD', 'ETH-USD', 'SOL-USD']),
    ])
    const prices = [
      ...(commodities.status === 'fulfilled' ? commodities.value : []).map(c => ({ symbol: c.symbol, price: c.price, change_pct: c.changePct })),
      ...(stocks.status === 'fulfilled' ? stocks.value : []).map(s => ({ symbol: s.symbol, price: s.regularMarketPrice, change_pct: s.regularMarketChangePercent || 0 })),
      ...(crypto.status === 'fulfilled' ? crypto.value : []).map(c => ({ symbol: c.symbol, price: c.price, change_pct: c.changePct || 0 })),
    ]
    for (const r of [commodities, stocks, crypto]) {
      if (r.status === 'rejected') console.warn('Provider failed:', r.reason?.message || r.reason)
    }
    const data = { prices, fetched_at: new Date().toISOString() }
    cache = { data, expires: Date.now() + 600_000 }
    res.json(data)
  } catch (err) {
    console.error('Price fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch prices' })
  }
})

app.use(express.static(path.join(__dirname, 'dist')))
app.get('/{*path}', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))
app.listen(port, () => console.log(`iran-intel listening on ${port}`))
