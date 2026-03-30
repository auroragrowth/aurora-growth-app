"use client";

import { useEffect, useState } from "react";

type ChangelogEntry = {
  id: string;
  version: string;
  title: string;
  changes: string[];
  released_at: string;
  is_major?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

function versionBadgeClass(entry: ChangelogEntry) {
  const parts = entry.version.split(".");
  const major = parseInt(parts[0] || "0");
  const minor = parseInt(parts[1] || "0");
  const patch = parseInt(parts[2] || "0");

  if (entry.is_major || (major >= 1 && minor === 0 && patch === 0)) {
    return "border-emerald-400/30 bg-emerald-400/15 text-emerald-300";
  }
  if (minor > 0) {
    return "border-teal-400/30 bg-teal-400/15 text-teal-300";
  }
  return "border-white/15 bg-white/5 text-white/55";
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ChangelogModal({ open, onClose }: Props) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    fetch("/api/changelog", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setEntries(Array.isArray(data?.entries) ? data.entries : []);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (open && entries.length > 0) {
      localStorage.setItem("aurora_last_seen_version", entries[0].version);
    }
  }, [open, entries]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#060e1e] shadow-[0_8px_40px_rgba(0,180,255,0.12)]">
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            What&apos;s new in Aurora
          </h2>
          <button
            onClick={onClose}
            className="text-white/40 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "calc(80vh - 60px)" }}>
          {loading ? (
            <div className="py-8 text-center text-sm text-white/40">
              Loading changelog...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/40">
              No changelog entries yet.
            </div>
          ) : (
            <div className="space-y-6">
              {entries.map((entry) => (
                <div key={entry.id} className="relative pl-4">
                  <div className="absolute left-0 top-2 h-2 w-2 rounded-full bg-cyan-400/60" />

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${versionBadgeClass(entry)}`}
                    >
                      v{entry.version}
                    </span>
                    <span className="text-xs text-white/35">
                      {formatDate(entry.released_at)}
                    </span>
                  </div>

                  <h3 className="mt-2 text-sm font-semibold text-white">
                    {entry.title}
                  </h3>

                  <ul className="mt-2 space-y-1">
                    {(entry.changes || []).map((change, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs text-white/60"
                      >
                        <span className="mt-1 text-cyan-400/50">•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
