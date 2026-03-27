"use client";

import { useEffect, useState } from "react";
import SectionPanel from "@/components/dashboard/SectionPanel";
import { useBrokerPopup } from "@/components/providers/BrokerPopupProvider";

type Connection = {
  id: string;
  broker: string;
  display_name: string | null;
  account_id: string | null;
  account_currency: string | null;
  account_type: string | null;
  is_active: boolean;
  is_connected: boolean;
  last_tested_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export default function ConnectionsClient() {
  const { openTrading212Popup } = useBrokerPopup();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/connections/trading212", { cache: "no-store" });
      const data = await res.json();
      setConnection(data.connection || null);
    } catch {
      setStatus("Could not load connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("aurora:broker-connected", handler);
    return () => window.removeEventListener("aurora:broker-connected", handler);
  }, []);

  async function testConnection() {
    setTesting(true);
    setStatus("");
    try {
      const res = await fetch("/api/connections/trading212/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection test failed.");
      setStatus("Connection verified successfully.");
      await load();
      window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Connection test failed.");
    } finally {
      setTesting(false);
    }
  }

  async function disconnect() {
    setStatus("");
    try {
      const res = await fetch("/api/connections/trading212", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disconnect.");
      setStatus("Connection removed.");
      await load();
      window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to disconnect.");
    }
  }

  if (loading) {
    return (
      <SectionPanel className="p-6">
        <div className="text-sm text-slate-300">Loading connection...</div>
      </SectionPanel>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.7fr_0.85fr]">
      <SectionPanel className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white md:text-3xl">Trading 212 connection</h2>
          <p className="mt-2 text-sm text-slate-400">Manage your broker connection. Credentials are entered via the secure popup.</p>
        </div>

        {!connection ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="text-lg font-medium text-white">No Trading 212 connection</div>
            <p className="mt-3 text-sm text-slate-400">Connect your account to start tracking your portfolio.</p>
            <button
              onClick={openTrading212Popup}
              className="mt-6 rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] px-7 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110"
            >
              Connect Trading 212
            </button>
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    connection.is_connected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" : "bg-amber-400"
                  }`} />
                  <h3 className="text-xl font-semibold text-white">Trading 212</h3>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {connection.is_connected ? "Verified and active" : "Saved but not verified"}
                </p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
                connection.is_connected
                  ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : "border border-amber-400/20 bg-amber-400/10 text-amber-300"
              }`}>
                {connection.is_connected ? "Connected" : "Unverified"}
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <div>Account ID: {connection.account_id || "—"}</div>
              <div>Currency: {connection.account_currency || "—"}</div>
              <div>
                Last tested:{" "}
                {connection.last_tested_at ? new Date(connection.last_tested_at).toLocaleString() : "—"}
              </div>
              <div>
                Last synced:{" "}
                {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : "—"}
              </div>
            </div>

            {connection.last_error && (
              <div className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/5 px-3 py-2 text-xs text-rose-300">
                {connection.last_error}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={testConnection}
                disabled={testing}
                className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] disabled:opacity-40"
              >
                {testing ? "Testing..." : "Test connection"}
              </button>
              <button
                onClick={openTrading212Popup}
                className="rounded-full border border-cyan-400/15 bg-cyan-400/5 px-5 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/10"
              >
                Update credentials
              </button>
              <button
                onClick={disconnect}
                className="rounded-full border border-rose-400/15 bg-rose-400/5 px-5 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-400/10"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </SectionPanel>

      <div className="space-y-6">
        {status && (
          <SectionPanel className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-200">{status}</div>
              <button onClick={() => setStatus("")} className="text-xs text-slate-500 hover:text-slate-300">Dismiss</button>
            </div>
          </SectionPanel>
        )}
      </div>
    </div>
  );
}
