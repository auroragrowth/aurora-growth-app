"use client";

import { useMemo, useState, useTransition } from "react";
import {
  connectTrading212,
  disconnectTrading212,
} from "@/app/actions/trading212";

type Connection = {
  is_connected?: boolean | null;
  account_name?: string | null;
  account_currency?: string | null;
  last_sync_at?: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function Trading212ConnectionCard({
  connection,
}: {
  connection: Connection | null;
}) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const connected = !!connection?.is_connected;

  const statusText = useMemo(() => {
    return connected ? "Connected" : "Not connected";
  }, [connected]);

  const handleConnect = () => {
    setMessage(null);

    const formData = new FormData();
    formData.set("apiKey", apiKey);
    formData.set("apiSecret", apiSecret);

    startTransition(async () => {
      const result = await connectTrading212(formData);
      setMessage(result.ok ? "Trading 212 connected." : result.error || "Failed.");
      if (result.ok) {
        setApiKey("");
        setApiSecret("");
      }
    });
  };

  const handleDisconnect = () => {
    setMessage(null);

    startTransition(async () => {
      const result = await disconnectTrading212();
      setMessage(
        result.ok ? "Trading 212 disconnected." : result.error || "Failed."
      );
    });
  };

  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(7,14,28,.96),rgba(9,18,38,.92))] p-6 shadow-[0_0_40px_rgba(0,180,255,.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/75">
            Broker Connection
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Trading 212
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
            Connect your Trading 212 account so Aurora can sync positions,
            portfolio information, and account-linked investment data.
          </p>
        </div>

        <div
          className={[
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
            connected
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-amber-400/30 bg-amber-400/10 text-amber-300",
          ].join(" ")}
        >
          {statusText}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
            Account
          </div>
          <div className="mt-2 text-sm font-medium text-white">
            {connection?.account_name || "—"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
            Currency
          </div>
          <div className="mt-2 text-sm font-medium text-white">
            {connection?.account_currency || "—"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
            Last Sync
          </div>
          <div className="mt-2 text-sm font-medium text-white">
            {formatDateTime(connection?.last_sync_at)}
          </div>
        </div>
      </div>

      {!connected ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Trading 212 API key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Trading 212 API secret
              </label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Paste your API secret"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/40"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleConnect}
              disabled={pending || !apiKey.trim() || !apiSecret.trim()}
              className="inline-flex items-center rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Connecting..." : "Connect Trading 212"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={pending}
            className="inline-flex items-center rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      )}

      {message ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">
          {message}
        </div>
      ) : null}
    </section>
  );
}
