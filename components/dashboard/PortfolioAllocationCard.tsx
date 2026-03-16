import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Props = {
  userId: string;
};

const colors = [
  "#60a5fa",
  "#34d399",
  "#f59e0b",
  "#f472b6",
  "#a78bfa",
  "#fb7185",
  "#22d3ee",
  "#84cc16",
  "#f97316",
  "#e879f9",
];

export default async function PortfolioAllocationCard({ userId }: Props) {
  const { data } = await supabase
    .from("investments")
    .select("ticker, amount")
    .eq("user_id", userId)
    .order("amount", { ascending: false });

  const rows = data || [];
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const segments = rows.map((row, i) => {
    const pct = total > 0 ? (Number(row.amount) / total) * 100 : 0;
    return {
      ticker: row.ticker,
      amount: Number(row.amount),
      pct,
      color: colors[i % colors.length],
    };
  });

  let running = 0;
  const gradient = segments.length
    ? `conic-gradient(${segments
        .map((s) => {
          const start = running;
          running += s.pct;
          return `${s.color} ${start}% ${running}%`;
        })
        .join(", ")})`
    : "conic-gradient(#1f2937 0% 100%)";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-white">Portfolio Allocation</h3>
        <p className="text-sm text-white/60">Percentage of money invested in each stock</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px,1fr] md:items-center">
        <div className="flex justify-center">
          <div
            className="h-56 w-56 rounded-full border border-white/10"
            style={{ background: gradient }}
          />
        </div>

        <div className="space-y-3">
          {segments.length === 0 ? (
            <p className="text-sm text-white/60">No investments saved yet.</p>
          ) : (
            segments.map((s) => (
              <div
                key={s.ticker}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-medium text-white">{s.ticker}</span>
                </div>
                <div className="text-right">
                  <div className="text-white">{s.pct.toFixed(1)}%</div>
                  <div className="text-xs text-white/60">£{s.amount.toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
