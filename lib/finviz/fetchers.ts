import * as cheerio from "cheerio"

const BASE_URL = "https://finviz.com"

export type FinvizRow = {
  ticker: string
  company: string
  sector?: string
  industry?: string
  country?: string
  marketCap?: string
  income?: string
  epsThisY?: string
  epsNextY?: string
  epsNext5Y?: string
  roa?: string
  roe?: string
  roic?: string
  quickRatio?: string
  currRatio?: string
  debtEq?: string
  peg?: string
  instOwn?: string
  price?: string
  change?: string
  volume?: string
  salesQoq?: string
  perfYear?: string
}

export type FinvizScreenerResult = {
  rows: FinvizRow[]
  total: number
  page: number
  totalPages: number
}

function getHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Referer: "https://finviz.com/",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
    Connection: "keep-alive",
  }
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function getCellMap(headers: string[], values: string[]) {
  const map: Record<string, string> = {}

  headers.forEach((header, index) => {
    map[header] = values[index] ?? ""
  })

  return map
}

function normaliseRow(map: Record<string, string>): FinvizRow {
  return {
    ticker: map["Ticker"] || "",
    company: map["Company"] || "",
    sector: map["Sector"] || "",
    industry: map["Industry"] || "",
    country: map["Country"] || "",
    marketCap: map["Market Cap"] || "",
    income: map["Income"] || "",
    epsThisY: map["EPS this Y"] || "",
    epsNextY: map["EPS next Y"] || "",
    epsNext5Y: map["EPS next 5Y"] || "",
    roa: map["ROA"] || "",
    roe: map["ROE"] || "",
    roic: map["ROI"] || map["ROIC"] || "",
    quickRatio: map["Quick Ratio"] || map["Quick R"] || "",
    currRatio: map["Current Ratio"] || map["Curr R"] || "",
    debtEq: map["Debt/Eq"] || "",
    peg: map["PEG"] || "",
    instOwn: map["Inst Own"] || "",
    price: map["Price"] || "",
    change: map["Change"] || "",
    volume: map["Volume"] || "",
    salesQoq: map["Sales Q/Q"] || "",
    perfYear: map["Perf Year"] || "",
  }
}

export async function fetchFinvizScreener(
  page = 1,
  limit = 20
): Promise<FinvizScreenerResult> {
  const start = (page - 1) * limit + 1

  const url =
    `${BASE_URL}/screener.ashx` +
    `?v=152` +
    `&f=cap_midover,fa_curratio_o2,fa_debteq_u0.4,fa_epsyoy_o10,fa_epsyoy1_o10,fa_estltgrowth_o10,fa_peg_u2,fa_quickratio_o1,fa_roa_o10,fa_roe_o10,fa_roi_o10,sh_instown_o30` +
    `&o=-marketcap` +
    `&c=0,1,2,6,7,8,9,10,11,12,13,14,15,16,17,18,20,21,23,24,32,33,34,35,36,38,43,57,67,68,69,70,71,72,73,74` +
    `&r=${start}`

  const res = await fetch(url, {
    headers: getHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Finviz screener request failed: ${res.status}`)
  }

  const html = await res.text()
  const $ = cheerio.load(html)

  const rows: FinvizRow[] = []

  let headers: string[] = []

  $("table").each((_, table) => {
    const ths = $(table)
      .find("tr")
      .first()
      .find("th, td")
      .map((__, el) => cleanText($(el).text()))
      .get()

    if (ths.includes("Ticker") && ths.includes("Company")) {
      headers = ths

      $(table)
        .find("tr")
        .slice(1)
        .each((__, tr) => {
          const tds = $(tr)
            .find("td")
            .map((___, td) => cleanText($(td).text()))
            .get()

          if (tds.length >= headers.length) {
            const map = getCellMap(headers, tds)
            const row = normaliseRow(map)

            if (row.ticker && row.company) {
              rows.push(row)
            }
          }
        })
    }
  })

  let total = rows.length
  let totalPages = page

  const pageText = $("body").text()
  const totalMatch = pageText.match(/#\d+\s*\/\s*(\d+)\s*Total/i)
  if (totalMatch?.[1]) {
    total = Number(totalMatch[1])
    totalPages = Math.max(1, Math.ceil(total / limit))
  }

  return {
    rows: rows.slice(0, limit),
    total,
    page,
    totalPages,
  }
}

export async function fetchFinvizTicker(ticker: string) {
  const url = `${BASE_URL}/quote.ashx?t=${encodeURIComponent(ticker)}`

  const res = await fetch(url, {
    headers: getHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Finviz ticker request failed: ${res.status}`)
  }

  const html = await res.text()
  const $ = cheerio.load(html)

  const title = cleanText($("title").text())
  const company =
    cleanText($('h1').first().text()) ||
    title.replace(/\s*Stock Price.*$/i, "").trim()

  const metricMap: Record<string, string> = {}

  $("table")
    .find("tr")
    .each((_, tr) => {
      const tds = $(tr).find("td")
      for (let i = 0; i < tds.length; i += 2) {
        const key = cleanText($(tds[i]).text())
        const value = cleanText($(tds[i + 1]).text())
        if (key && value) metricMap[key] = value
      }
    })

  return {
    ticker: ticker.toUpperCase(),
    company,
    sector: metricMap["Sector"] || "",
    industry: metricMap["Industry"] || "",
    country: metricMap["Country"] || "",
    marketCap: metricMap["Market Cap"] || "",
    pe: metricMap["P/E"] || "",
    forwardPe: metricMap["Forward P/E"] || "",
    peg: metricMap["PEG"] || "",
    volume: metricMap["Volume"] || "",
    avgVolume: metricMap["Avg Volume"] || "",
    float: metricMap["Shs Float"] || "",
    instOwn: metricMap["Inst Own"] || "",
    roe: metricMap["ROE"] || "",
    roa: metricMap["ROA"] || "",
    roi: metricMap["ROI"] || "",
    debtEq: metricMap["Debt/Eq"] || "",
    quickRatio: metricMap["Quick Ratio"] || "",
    price:
      cleanText($("[data-test='instrument-price-last']").first().text()) ||
      metricMap["Price"] ||
      "",
    change:
      cleanText($("[data-test='instrument-price-change-percent']").first().text()) ||
      "",
  }
}
