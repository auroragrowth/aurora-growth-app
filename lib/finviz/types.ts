export type FinvizRow = {
  ticker: string
  company: string
  sector: string
  industry: string
  country: string
  marketCap: number | null
  marketCapText: string
  pe: number | null
  price: number | null
  changePct: number | null
  changeText: string
  volume: number | null
  floatShares: number | null
  instOwn: number | null
  roe: number | null
  roa: number | null
  roi: number | null
  epsThisY: number | null
  epsNextY: number | null
  salesQoq: number | null
  perf52w: number | null
}

export type FinvizTickerDetail = {
  ticker: string
  company: string
  exchange?: string
  sector?: string
  industry?: string
  country?: string
  marketCap?: string
  pe?: string
  forwardPe?: string
  peg?: string
  price?: string
  change?: string
  volume?: string
  avgVolume?: string
  float?: string
  instOwn?: string
  roe?: string
  roa?: string
  roi?: string
  debtEq?: string
  quickRatio?: string
  currentRatio?: string
  targetPrice?: string
  epsTtm?: string
  epsNextY?: string
  salesGrowthQoq?: string
  perfWeek?: string
  perfMonth?: string
  perfQuarter?: string
  perfHalfY?: string
  perfYear?: string
  perfYtd?: string
  high52w?: string
  low52w?: string
}
