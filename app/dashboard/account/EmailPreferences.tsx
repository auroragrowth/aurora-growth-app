"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

type Props = {
  userId: string;
  defaults: {
    weekly: boolean;
    monthly: boolean;
    quarterly: boolean;
    yearly: boolean;
    alerts: boolean;
  };
};

const EMAIL_TYPES = [
  { key: "weekly", label: "Weekly Review", desc: "Top scanner stocks, market summary, and watchlist updates every Friday" },
  { key: "monthly", label: "Monthly Review", desc: "Best performing picks, portfolio summary, and strategy reminder" },
  { key: "quarterly", label: "Quarterly Report", desc: "Quarter in review with market conditions and Aurora picks vs market" },
  { key: "yearly", label: "Annual Review", desc: "Full year market recap, best picks, and your personalised stats" },
  { key: "alerts", label: "Watchlist Alerts", desc: "Instant alerts when stocks cross your ladder entry levels" },
] as const;

export default function EmailPreferences({ userId, defaults }: Props) {
  const [prefs, setPrefs] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleToggle(key: string, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaving(true);
    setSaved(false);

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      await supabase.from("profiles").update({
        [`email_${key}`]: value,
        updated_at: new Date().toISOString(),
      }).eq("id", userId);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to update email preference:", err);
      // Revert
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(11,28,63,0.62)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-3">
        <Mail className="h-5 w-5 text-cyan-300" />
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">Email Preferences</div>
        {saved && <span className="text-xs text-emerald-300 ml-auto">Saved</span>}
      </div>

      <p className="mt-3 text-sm text-slate-300">
        Choose which Aurora emails you would like to receive. All emails use Aurora premium branding and include an unsubscribe link.
      </p>

      <div className="mt-5 space-y-3">
        {EMAIL_TYPES.map(({ key, label, desc }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-2xl border border-white/8 bg-[rgba(5,16,40,0.55)] px-5 py-4"
          >
            <div className="flex-1 mr-4">
              <div className="text-sm font-medium text-white">{label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle(key, !prefs[key as keyof typeof prefs])}
              disabled={saving}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                prefs[key as keyof typeof prefs]
                  ? "bg-cyan-500"
                  : "bg-white/10"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  prefs[key as keyof typeof prefs] ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
