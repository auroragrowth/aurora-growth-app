import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function DailyTop20Table() {
  const { data } = await supabase
    .from("daily_stock_scans")
    .select("*")
    .order("scan_date", { ascending: false })
    .order("rank", { ascending: true })
    .limit(20);

  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(30,55,110,0.55),rgba(8,14,34,0.72))] px-7 py-7 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-white/40">
          Saved setups
        </p>
        <h2 className="mt-2 text-5xl font-bold tracking-tight text-white">
          Aurora Top 20
        </h2>
        <p className="mt-3 text-lg text-white/65">
          Highest ranked opportunities from the latest Finviz scan.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-white/40">
              <th className="px-4 py-4">Rank</th>
              <th className="px-4 py-4">Ticker</th>
              <th className="px-4 py-4">Company</th>
              <th className="px-4 py-4">Score</th>
              <th className="px-4 py-4">Sector</th>
              <th className="px-4 py-4">PEG</th>
              <th className="px-4 py-4">ROE</th>
              <th className="px-4 py-4">ROA</th>
              <th className="px-4 py-4">Price</th>
              <th className="px-4 py-4">Change</th>
            </tr>
          </thead>

          <tbody>
            {!data || data.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-white/55">
                  No scan data for today yet.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/6 text-base text-white/90 transition hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-5 font-medium text-white/70">{row.rank}</td>
                  <td className="px-4 py-5 font-semibold text-white">{row.ticker}</td>
                  <td className="px-4 py-5">{row.company}</td>
                  <td className="px-4 py-5">
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm font-semibold text-cyan-200">
                      {Number(row.aurora_score || 0).toFixed(0)}
                    </span>
                  </td>
                  <td className="px-4 py-5">{row.sector}</td>
                  <td className="px-4 py-5">{row.peg}</td>
                  <td className="px-4 py-5">{row.roe}</td>
                  <td className="px-4 py-5">{row.roa}</td>
                  <td className="px-4 py-5">{row.price}</td>
                  <td className="px-4 py-5">{row.change}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
