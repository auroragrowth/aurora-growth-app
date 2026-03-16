"use client"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-[28px] border border-red-400/20 bg-red-400/10 p-8 text-center">
        <h2 className="text-2xl font-semibold text-white">Dashboard Error</h2>
        <p className="mt-3 text-red-200">
          {error.message || "Something went wrong loading the dashboard."}
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 rounded-full border border-white/10 bg-white/10 px-5 py-2 text-white"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
