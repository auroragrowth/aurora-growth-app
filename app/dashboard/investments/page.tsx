"use client";

import { useEffect, useState } from "react";

type Position = {
  ticker?: string;
  quantity?: number;
  averagePrice?: number;
  currentPrice?: number;
  result?: number;
  [key: string]: any;
};

export default function InvestmentsPage() {
  const [mode, setMode] = useState<string>("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);

        const res = await fetch("/api/trading212/positions", {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load positions.");
        }

        setMode(data.mode);
        setPositions(data.positions || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load positions."
        );
      } finally {
        setLoading(false);
      }
    }

    run();
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Investments
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Live holdings from your active Trading 212 mode.
            </p>
          </div>

          {mode && (
            <div
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                mode === "paper"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-emerald-100 text-emerald-900"
              }`}
            >
              {mode === "paper" ? "Paper" : "Live"}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-slate-600">Loading positions...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : positions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No open positions found in the selected account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-4 py-3">Ticker</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Average</th>
                  <th className="px-4 py-3">Current</th>
                  <th className="px-4 py-3">P/L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position, index) => (
                  <tr
                    key={`${position.ticker}-${index}`}
                    className="border-b border-slate-100"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {position.ticker || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {position.quantity ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {position.averagePrice ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {position.currentPrice ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {position.result ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
