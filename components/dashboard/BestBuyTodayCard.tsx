import BestBuyTodayCard from "@/components/dashboard/BestBuyTodayCard";
import DailyTop20Table from "@/components/dashboard/DailyTop20Table";
import FinvizScreenerTable from "@/components/dashboard/FinvizScreenerTable";

export default async function DashboardPage() {
  return (
    <div className="px-8 py-10">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="mb-10">
          <h1 className="bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-6xl font-bold tracking-tight text-transparent">
            Dashboard
          </h1>
          <p className="mt-3 text-2xl text-white/70">
            Daily scanner, ranked opportunities and Aurora market intelligence.
          </p>
        </div>

        <div className="space-y-8">
          <BestBuyTodayCard />
          <DailyTop20Table />
          <FinvizScreenerTable />
        </div>
      </div>
    </div>
  );
}
