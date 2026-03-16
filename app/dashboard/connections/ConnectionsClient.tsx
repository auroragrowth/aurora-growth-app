"use client";

import { useEffect, useMemo, useState } from "react";
import SectionPanel from "@/components/dashboard/SectionPanel";

type TradingMode = "paper" | "live";

type Connection = {
  id: string;
  broker: string;
  mode: TradingMode;
  display_name: string | null;
  account_id: string | null;
  account_currency: string | null;
  account_type: string | null;
  is_active: boolean;
  last_tested_at: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function ConnectionsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<TradingMode | null>(null);
  const [tradingMode, setTradingMode] = useState<TradingMode>("paper");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [wizardStep, setWizardStep] = useState(1);
  const [setupMode, setSetupMode] = useState<TradingMode>("paper");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [status, setStatus] = useState("");
  const [accountPreview, setAccountPreview] = useState<{
    accountId?: string | null;
    currency?: string | null;
    totalValue?: number | null;
    freeCash?: number | null;
    invested?: number | null;
    pnl?: number | null;
    positionsCount?: number | null;
    detectedMode?: TradingMode | null;
  } | null>(null);

  async function load() {
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch("/api/connections/trading212", {
        cache: "no-store",
      });

      const data = await res.json();

      setTradingMode(data.tradingMode || "paper");
      setConnections(data.connections || []);
    } catch {
      setStatus("Could not load Trading 212 connections.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const paperConnection = useMemo(
    () => connections.find((c) => c.mode === "paper") || null,
    [connections]
  );

  const liveConnection = useMemo(
    () => connections.find((c) => c.mode === "live") || null,
    [connections]
  );

  async function saveConnection() {
    setSaving(true);
    setStatus("");
    setAccountPreview(null);

    try {
      const res = await fetch("/api/connections/trading212", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: setupMode,
          apiKey,
          apiSecret,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save connection.");
      }

      setStatus(
        `${setupMode === "paper" ? "Paper" : "Live"} connection saved.`
      );
      setWizardStep(4);
      await load();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to save connection."
      );
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(mode: TradingMode) {
    setTesting(mode);
    setStatus("");
    setAccountPreview(null);

    try {
      const res = await fetch("/api/connections/trading212/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Connection test failed.");
      }

      setStatus(
        `${data.detectedMode === "paper" ? "Paper" : "Live"} connection verified successfully.`
      );

      setAccountPreview({
        ...data.account,
        detectedMode: data.detectedMode,
      });

      await load();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Connection test failed."
      );
    } finally {
      setTesting(null);
    }
  }

  async function switchTradingMode(mode: TradingMode) {
    setStatus("");

    try {
      const res = await fetch("/api/user/trading-mode", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to switch trading mode.");
      }

      setTradingMode(mode);
      setStatus(
        `Site mode switched to ${
          mode === "paper" ? "Paper Trading" : "Live Trading"
        }.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to switch trading mode."
      );
    }
  }

  async function disconnect(mode: TradingMode) {
    setStatus("");
    setAccountPreview(null);

    try {
      const res = await fetch(`/api/connections/trading212?mode=${mode}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove connection.");
      }

      setStatus(`${mode === "paper" ? "Paper" : "Live"} connection removed.`);
      await load();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to remove connection."
      );
    }
  }

  function formatMoney(value?: number | null, currency?: string | null) {
    if (typeof value !== "number") return "—";

    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currency || "GBP",
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${currency || "GBP"} ${value.toFixed(2)}`;
    }
  }

  if (loading) {
    return (
      <SectionPanel className="p-6">
        <div className="text-sm text-slate-300">Loading connections...</div>
      </SectionPanel>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.7fr_0.85fr]">
      <SectionPanel className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white md:text-3xl">
              Trading 212 setup wizard
            </h2>
            <p className="mt-2 text-sm text-slate-400 md:text-base">
              Simple 4-step setup for every member.
            </p>
          </div>

          <div className="text-sm text-slate-500">Step {wizardStep} of 4</div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((step) => (
            <button
              key={step}
              onClick={() => setWizardStep(step)}
              className={`rounded-[24px] border px-5 py-5 text-left transition ${
                wizardStep === step
                  ? "border-cyan-400/30 bg-cyan-400/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.05]"
              }`}
            >
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                Step {step}
              </div>
              <div className="mt-3 text-lg font-medium">
                {step === 1 && "Choose broker"}
                {step === 2 && "Choose mode"}
                {step === 3 && "Paste keys"}
                {step === 4 && "Verify"}
              </div>
            </button>
          ))}
        </div>

        {wizardStep === 1 && (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-7">
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
              Broker
            </div>

            <h3 className="mt-4 text-4xl font-semibold text-white">
              Trading 212
            </h3>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Aurora supports per-user Trading 212 connections with separate
              Paper and Live credentials.
            </p>

            <button
              onClick={() => setWizardStep(2)}
              className="mt-6 rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] px-7 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110"
            >
              Continue
            </button>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-7">
            <div>
              <h3 className="text-2xl font-semibold text-white">
                Choose environment
              </h3>
              <p className="mt-2 text-base leading-7 text-slate-300">
                Save separate keys for Paper and Live. New users should start in
                Paper.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                onClick={() => setSetupMode("paper")}
                className={`rounded-[28px] border p-6 text-left transition ${
                  setupMode === "paper"
                    ? "border-amber-400/30 bg-amber-300/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                }`}
              >
                <div className="text-2xl font-semibold text-white">
                  Paper Trading
                </div>
                <div className="mt-3 text-sm leading-7 text-slate-300">
                  Safe testing environment.
                </div>
              </button>

              <button
                onClick={() => setSetupMode("live")}
                className={`rounded-[28px] border p-6 text-left transition ${
                  setupMode === "live"
                    ? "border-emerald-400/30 bg-emerald-300/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                }`}
              >
                <div className="text-2xl font-semibold text-white">
                  Live Trading
                </div>
                <div className="mt-3 text-sm leading-7 text-slate-300">
                  Real money account.
                </div>
              </button>
            </div>

            <button
              onClick={() => setWizardStep(3)}
              className="rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] px-7 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110"
            >
              Continue
            </button>
          </div>
        )}

        {wizardStep === 3 && (
          <div className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-7">
            <div>
              <h3 className="text-2xl font-semibold text-white">
                Paste your {setupMode === "paper" ? "Paper" : "Live"} API
                credentials
              </h3>
              <p className="mt-2 text-base leading-7 text-slate-300">
                These are stored encrypted on the server and never exposed to
                the browser after saving.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                API Key
              </label>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-full border border-white/10 bg-[#09182c]/75 px-5 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/35 focus:ring-2 focus:ring-cyan-400/20"
                placeholder="Paste Trading 212 API key"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                API Secret
              </label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full rounded-full border border-white/10 bg-[#09182c]/75 px-5 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/35 focus:ring-2 focus:ring-cyan-400/20"
                placeholder="Paste Trading 212 API secret"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={saveConnection}
                disabled={saving}
                className="rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] px-7 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save connection"}
              </button>

              <button
                onClick={() => setWizardStep(4)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-7 py-3.5 text-base font-medium text-slate-200 transition hover:bg-white/[0.06]"
              >
                Skip to verify
              </button>
            </div>
          </div>
        )}

        {wizardStep === 4 && (
          <div className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-7">
            <div>
              <h3 className="text-2xl font-semibold text-white">
                Verify connection
              </h3>
              <p className="mt-2 text-base leading-7 text-slate-300">
                Run a live test call to make sure the credentials work
                correctly.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => testConnection("paper")}
                disabled={testing === "paper" || !paperConnection}
                className="rounded-full bg-amber-300/12 px-6 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-300/18 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {testing === "paper"
                  ? "Testing Paper..."
                  : "Test Paper connection"}
              </button>

              <button
                onClick={() => testConnection("live")}
                disabled={testing === "live" || !liveConnection}
                className="rounded-full bg-emerald-300/12 px-6 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-300/18 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {testing === "live"
                  ? "Testing Live..."
                  : "Test Live connection"}
              </button>
            </div>

            {accountPreview ? (
              <div className="grid gap-4 pt-2 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Account ID
                  </div>
                  <div className="mt-3 text-xl font-semibold text-white">
                    {accountPreview.accountId || "—"}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Total Value
                  </div>
                  <div className="mt-3 text-xl font-semibold text-white">
                    {formatMoney(
                      accountPreview.totalValue,
                      accountPreview.currency
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Free Cash
                  </div>
                  <div className="mt-3 text-xl font-semibold text-white">
                    {formatMoney(
                      accountPreview.freeCash,
                      accountPreview.currency
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Invested
                  </div>
                  <div className="mt-3 text-xl font-semibold text-white">
                    {formatMoney(
                      accountPreview.invested,
                      accountPreview.currency
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    P/L
                  </div>
                  <div className="mt-3 text-xl font-semibold text-white">
                    {formatMoney(accountPreview.pnl, accountPreview.currency)}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Positions
                  </div>
                  <div className="mt-3 text-xl font-semibold text-white">
                    {accountPreview.positionsCount ?? "—"}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </SectionPanel>

      <div className="space-y-6">
        <SectionPanel className="p-6">
          <h2 className="text-2xl font-semibold text-white">
            Current site mode
          </h2>

          <div
            className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
              tradingMode === "paper"
                ? "bg-amber-300 text-slate-900"
                : "bg-emerald-300 text-slate-950"
            }`}
          >
            {tradingMode === "paper" ? "Paper Trading" : "Live Trading"}
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-300">
            Aurora will use this mode across the scanner, calculator, portfolio
            and trade actions.
          </p>
        </SectionPanel>

        {[paperConnection, liveConnection].map((connection, index) => {
          const mode: TradingMode = index === 0 ? "paper" : "live";

          return (
            <SectionPanel key={mode} className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-semibold text-white">
                    {mode === "paper" ? "Paper connection" : "Live connection"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {connection ? "Connected" : "Not connected"}
                  </p>
                </div>

                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                  {connection ? "Active" : "Missing"}
                </div>
              </div>

              {connection ? (
                <div className="mt-5 space-y-2 text-sm text-slate-300">
                  <div>Account ID: {connection.account_id || "—"}</div>
                  <div>Currency: {connection.account_currency || "—"}</div>
                  <div>Type: {connection.account_type || "—"}</div>
                  <div>
                    Last tested:{" "}
                    {connection.last_tested_at
                      ? new Date(connection.last_tested_at).toLocaleString()
                      : "—"}
                  </div>
                  <div>
                    Last sync:{" "}
                    {connection.last_sync_at
                      ? new Date(connection.last_sync_at).toLocaleString()
                      : "—"}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => testConnection(mode)}
                      disabled={testing === mode}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] disabled:opacity-40"
                    >
                      {testing === mode ? "Testing..." : "Test"}
                    </button>

                    <button
                      onClick={() => disconnect(mode)}
                      className="rounded-full border border-rose-400/20 bg-rose-300/10 px-5 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-300/15"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <button
                    onClick={() => {
                      setSetupMode(mode);
                      setWizardStep(2);
                    }}
                    className="rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                  >
                    Add {mode === "paper" ? "Paper" : "Live"} connection
                  </button>
                </div>
              )}
            </SectionPanel>
          );
        })}

        {status && (
          <SectionPanel className="p-4">
            <div className="text-sm text-slate-200">{status}</div>
          </SectionPanel>
        )}
      </div>
    </div>
  );
}
