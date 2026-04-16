/**
 * Aurora Growth — TradingView Symbol Utility
 *
 * TradingView's free embedded widget requires the correct exchange prefix
 * for reliable symbol resolution. Without it, some symbols fail silently.
 *
 * Usage:
 *   getTVSymbol('RDDT')          → 'NYSE:RDDT'
 *   getTVSymbol('NVDA')          → 'NASDAQ:NVDA'
 *   getTVSymbol('RDDT', 'NYSE')  → 'NYSE:RDDT'  (explicit override)
 */

const NYSE_TICKERS = new Set([
  'RDDT','BIRK','NEM','NUE','BSX','ISRG','FNV','OR','USLM','B',
  'CCJ','CRS','EGO','ITT','LSTR','MSM','NVT','PAAS','RGLD','SII',
  'SSRM','STLD','TEL','TW','WOR','SHOP','ONON','RSI','AGX','RBC',
  'AGI','CDE','HL','KGC','EW','FSS','SAIA','SPXC','ATAT','AEIS',
  'ADI','AMD','PINS','TTD','SPOT','PATH','CDNS','LRCX','MPWR',
  'DSGX','EXLS','KEYS','CGNX','TER','TSEM','VC','IESC','HQY',
  'GWRE','CLBT','FIGS','OLLI','PEN','AVPT','RELY','OSW','KNSA',
  'TFPM','SN','GMED',
])

const AMEX_TICKERS = new Set([
  'SPY','GLD','TLT','USO','IWM','UVXY','SQQQ','QQQ',
  'GDX','GDXJ','SLV','XLE','XLF','XLK','XLV',
])

export function getTVSymbol(ticker: string, exchangeOverride?: string): string {
  if (!ticker) return 'NASDAQ:SPY'

  const t = ticker.toUpperCase().trim()

  // Already has exchange prefix
  if (t.includes(':')) return t

  // Explicit override
  if (exchangeOverride && exchangeOverride !== 'NASDAQ') {
    return `${exchangeOverride.toUpperCase()}:${t}`
  }

  if (AMEX_TICKERS.has(t)) return `AMEX:${t}`
  if (NYSE_TICKERS.has(t)) return `NYSE:${t}`

  return `NASDAQ:${t}`
}

export function getTVUrl(ticker: string, exchange?: string): string {
  const symbol = getTVSymbol(ticker, exchange)
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`
}
