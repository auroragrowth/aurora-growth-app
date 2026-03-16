"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ScannerRow = {
  ticker?: string;
  company?: string;
  sector?: string;
  industry?: string;
  score?: number;
  trend?: string;
  price?: number;
  change_pct?: number;
};

export default function ChartClient() {
  const searchParams = useSearchParams();
  const ticker = searchParams.get("ticker")?.toUpperCase() || "";

  const [scannerRows, setScannerRows] = useState<ScannerRow[]>([]);

  useEffect(() => {
    async function loadScanner() {
      try {
        const res = await fetch("/data/scanner-cache.json", {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();

        if (Array.isArray(data)) {
          setScannerRows(data);
        }
      } catch (err) {
        console.error("Scanner load failed", err);
      }
    }

    loadScanner();
  }, []);

  const scannerData = useMemo(() => {
    if (!ticker) return null;

    return (
      scannerRows.find(
        (row) =>
          String(row?.ticker || "").toUpperCase() === ticker.toUpperCase()
      ) || null
    );
  }, [scannerRows, ticker]);

  return (
    <div className="w-full p-6 space-y-6">

      <div className="flex items-center justify-between">

        <div>
          <div className="text-2xl font-bold text-white">
            {ticker || "Stock"}
          </div>

          <div className="text-gray-400 text-sm">
            {scannerData?.company ?? "Loading company..."}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-gray-400">Aurora Score</div>

          <div className="text-cyan-400 text-lg font-semibold">
            {scannerData?.score ?? "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Price</div>
          <div className="text-white text-lg">
            {scannerData?.price ?? "—"}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Change</div>
          <div className="text-white text-lg">
            {scannerData?.change_pct ?? "—"}%
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Trend</div>
          <div className="text-white text-lg">
            {scannerData?.trend ?? "—"}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Sector</div>
          <div className="text-white text-lg">
            {scannerData?.sector ?? "—"}
          </div>
        </div>

      </div>

      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">

        <iframe
          src={`https://s.tradingview.com/widgetembed/?symbol=${ticker}&interval=D&theme=dark&style=1&toolbarbg=black`}
          width="100%"
          height="600"
          frameBorder="0"
        />

      </div>

    </div>
  );
}
