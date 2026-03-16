"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function ChartClient() {

  const params = useSearchParams()
  const ticker = params.get("ticker") || "AAPL"

  const [scannerData, setScannerData] = useState(null)

  useEffect(() => {

    async function loadScanner() {

      try {
        const res = await fetch(`/api/scanner?ticker=${ticker}`)
        const data = await res.json()

        if (data) setScannerData(data)

      } catch (err) {
        console.log("No scanner data")
      }

    }

    loadScanner()

  }, [ticker])

  return (

    <div className="p-8 space-y-6">

      <h1 className="text-2xl font-bold text-white">
        {ticker} Chart
      </h1>

      {scannerData && (

        <div className="bg-[#081c2b] border border-cyan-500/30 rounded-xl p-4">

          <div className="grid grid-cols-4 gap-4 text-sm">

            <div>
              <div className="text-gray-400">Aurora Score</div>
              <div className="text-cyan-400 text-lg font-semibold">
                {scannerData.score}
              </div>
            </div>

            <div>
              <div className="text-gray-400">Sector</div>
              <div className="text-white">{scannerData.sector}</div>
            </div>

            <div>
              <div className="text-gray-400">Price</div>
              <div className="text-white">${scannerData.price}</div>
            </div>

            <div>
              <div className="text-gray-400">Trend</div>
              <div className="text-white">{scannerData.trend}</div>
            </div>

          </div>

        </div>

      )}

      <div className="rounded-xl overflow-hidden border border-cyan-500/20">

        <iframe
          src={`https://s.tradingview.com/widgetembed/?symbol=${ticker}&interval=D&theme=dark`}
          width="100%"
          height="650"
        />

      </div>

    </div>

  )
}
