"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBrokerPopup } from "@/components/providers/BrokerPopupProvider";

type Connection = {
  id: string;
  broker: string;
  account_id: string | null;
  account_currency: string | null;
  is_connected: boolean;
  last_tested_at: string | null;
};

export default function BrokerConnectionSection() {
  const { openTrading212Popup } = useBrokerPopup();
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<Connection | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/connections/trading212", { cache: "no-store" });
      const data = await res.json();
      setConnection(data.connection || null);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("aurora:broker-connected", handler);
    return () => window.removeEventListener("aurora:broker-connected", handler);
  }, []);

  if (loading) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-[rgba(11,28,63,0.62)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="text-sm text-slate-400">Loading broker connection...</div>
      </section>
    );
  }

  const connected = !!connection?.is_connected;

  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(11,28,63,0.62)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">Broker Connection</div>
          <h3 className="mt-2 text-xl font-semibold text-white">Trading 212</h3>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
          connected
            ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            : "border border-rose-400/20 bg-rose-400/10 text-rose-300"
        }`}>
          <div className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-rose-400"}`} />
          {connected ? "Connected" : "Not connected"}
        </div>
      </div>

      {connection && (
        <div className="mt-4 space-y-1 text-sm text-slate-400">
          {connection.account_id && <div>Account: {connection.account_id}</div>}
          {connection.account_currency && <div>Currency: {connection.account_currency}</div>}
          {connection.last_tested_at && (
            <div>Tested: {new Date(connection.last_tested_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
          )}
        </div>
      )}

      <div className="mt-5">
        <button
          onClick={openTrading212Popup}
          className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 px-5 py-2.5 text-xs font-semibold text-slate-950 transition hover:brightness-110"
        >
          {connected ? "Update credentials" : "Connect Trading 212"}
        </button>
        {connected && (
          <Link href="/dashboard/connections" className="ml-3 text-xs font-medium text-cyan-300 transition hover:text-cyan-200">
            Connection settings
          </Link>
        )}
      </div>
    </section>
  );
}
