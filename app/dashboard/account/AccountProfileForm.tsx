"use client";

import { useState } from "react";

type Props = {
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
  lastLogin: string | null;
  userId: string;
};

function formatLastLogin(value: string | null) {
  if (!value) return "No login data";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "No login data";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AccountProfileForm({
  defaultName,
  defaultEmail,
  defaultPhone,
  lastLogin,
  userId,
}: Props) {
  const [fullName, setFullName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/watchlist", { method: "HEAD" }).catch(() => null);

      // Use Supabase client directly since we have the user context
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const nameParts = fullName.trim().split(" ");
      const first_name = nameParts[0] || "";
      const last_name = nameParts.slice(1).join(" ") || "";

      const { error: updateError } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName.trim(),
        first_name,
        last_name,
        phone: phone.trim(),
        updated_at: new Date().toISOString(),
      });

      if (updateError) throw new Error(updateError.message);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <div>
        <label className="mb-2 block text-sm text-slate-400">Full Name</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-3.5 text-lg text-white outline-none transition focus:border-cyan-400/40"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-400">Email</label>
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-5 py-3.5 text-lg text-white/60">
          {defaultEmail}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-400">Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+44 7700 900000"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-3.5 text-lg text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-400">Last Login</label>
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-5 py-3.5 text-sm text-white/60">
          {formatLastLogin(lastLogin)}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Profile saved successfully.
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.25)] transition hover:brightness-105 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}
