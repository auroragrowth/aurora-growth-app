"use client";

export default function ScannerActions() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(87,211,243,0.22)] transition hover:scale-[1.01]"
      >
        Run Scanner
      </button>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        Refresh Scanner
      </button>
    </div>
  );
}
