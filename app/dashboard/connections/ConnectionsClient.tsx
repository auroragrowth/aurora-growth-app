"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type TelegramStatus = {
  connected: boolean;
  username: string | null;
  connected_at: string | null;
};

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ── Telegram Section ───────────────────────────── */

function TelegramSection() {
  const [tgStatus, setTgStatus] = useState<TelegramStatus | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/telegram/status", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setTgStatus({
          connected: data.connected,
          username: data.username,
          connected_at: data.connected_at,
        });
        if (data.connected && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    checkStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkStatus]);

  async function generateQr() {
    setGenerating(true);
    try {
      const res = await fetch("/api/telegram/generate-token", { method: "POST" });
      const data = await res.json();
      if (data.qr_url) {
        setQrUrl(data.qr_url);
        const qrRes = await fetch(`/api/telegram/qr?url=${encodeURIComponent(data.qr_url)}`);
        if (qrRes.ok) {
          const blob = await qrRes.blob();
          setQrDataUrl(URL.createObjectURL(blob));
        }
        if (!pollRef.current) {
          pollRef.current = setInterval(checkStatus, 3000);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setGenerating(false);
    }
  }

  async function sendTestAlert() {
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/telegram/test-alert", { method: "POST" });
      const data = await res.json();
      setTestResult(data.ok ? "Test alert sent!" : data.error || "Failed");
    } catch {
      setTestResult("Failed to send test alert");
    } finally {
      setSendingTest(false);
    }
  }

  async function disconnect() {
    setTestResult("Contact support to disconnect Telegram.");
  }

  if (tgStatus === null) {
    return (
      <div className="flex h-full items-center justify-center rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8">
        <div className="text-sm text-white/40">Loading Telegram status...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
          <span className="text-lg">🔔</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Aurora Alerts</h2>
          <p className="text-xs text-slate-400">Telegram notifications</p>
        </div>
        <div className="ml-auto">
          {tgStatus.connected ? (
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Connected
            </span>
          ) : (
            <span className="rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-300">
              Not connected
            </span>
          )}
        </div>
      </div>

      <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {tgStatus.connected ? (
        <div className="flex flex-1 flex-col">
          <div className="space-y-3 text-sm">
            {tgStatus.username && (
              <div className="flex items-center gap-2 text-white/70">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                Connected as <span className="font-medium text-white">@{tgStatus.username}</span>
              </div>
            )}
            {tgStatus.connected_at && (
              <div className="text-slate-400">Connected on {fmtDate(tgStatus.connected_at)}</div>
            )}
          </div>

          <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Alerts active for
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-white/60">
            <li className="flex items-center gap-2"><span className="text-emerald-400">&#10003;</span> Price rise/fall alerts</li>
            <li className="flex items-center gap-2"><span className="text-emerald-400">&#10003;</span> Entry level alerts</li>
            <li className="flex items-center gap-2"><span className="text-emerald-400">&#10003;</span> Watchlist notifications</li>
          </ul>

          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            <button
              onClick={sendTestAlert}
              disabled={sendingTest}
              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/15 disabled:opacity-40"
            >
              {sendingTest ? "Sending..." : "Send test alert"}
            </button>
            <button
              onClick={disconnect}
              className="rounded-full border border-rose-400/15 bg-rose-400/5 px-5 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-400/10"
            >
              Disconnect
            </button>
          </div>

          {testResult && <div className="mt-3 text-sm text-white/50">{testResult}</div>}
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <p className="text-sm text-slate-400">
            Scan this QR code with your phone to receive price alerts via Telegram.
          </p>

          {qrDataUrl ? (
            <div className="mt-5">
              <div className="inline-block rounded-2xl border border-white/10 bg-white p-2">
                <img src={qrDataUrl} alt="Telegram QR code" width={128} height={128} className="h-32 w-32" />
              </div>

              <div className="mt-4">
                <div className="text-sm text-white/50">Or tap this link on your phone:</div>
                <a
                  href={qrUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
                >
                  Open in Telegram &rarr;
                </a>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-amber-300/70">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Waiting for connection...
              </div>
            </div>
          ) : (
            <button
              onClick={generateQr}
              disabled={generating}
              className="mt-auto rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] px-7 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Connect Telegram"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────── */

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

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-2">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Connections</h1>
        <p className="mt-2 text-base text-slate-400">Manage your broker and notification integrations.</p>
      </div>

      {/* Status toast */}
      {status && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-5 py-3">
          <div className="text-sm text-slate-200">{status}</div>
          <button onClick={() => setStatus("")} className="text-xs text-slate-500 hover:text-slate-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* ═══ LEFT — Broker Connection ═══ */}
        <div className="flex flex-col rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <span className="text-lg">🔗</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Broker Connection</h2>
              <p className="text-xs text-slate-400">Trading 212 live account</p>
            </div>
            <div className="ml-auto">
              {loading ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">Loading...</span>
              ) : connection?.is_connected ? (
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Connected
                </span>
              ) : connection ? (
                <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  Unverified
                </span>
              ) : (
                <span className="rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-300">
                  Disconnected
                </span>
              )}
            </div>
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {loading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-white/40">Loading connection...</div>
          ) : connection ? (
            <div className="flex flex-1 flex-col">
              {/* Connection details */}
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Account ID</div>
                  <div className="mt-1 font-medium text-white">{connection.account_id || "—"}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Currency</div>
                  <div className="mt-1 font-medium text-white">{connection.account_currency || "—"}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Connected</div>
                  <div className="mt-1 font-medium text-white">{fmtDate(connection.created_at)}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Last tested</div>
                  <div className="mt-1 font-medium text-white">{fmtDate(connection.last_tested_at)}</div>
                </div>
              </div>

              {/* Error display */}
              {connection.last_error && (
                <div className="mt-4 rounded-2xl border border-rose-400/15 bg-rose-400/5 px-4 py-3">
                  <div className="text-sm font-medium text-rose-200">
                    {connection.last_error.includes("401")
                      ? "Your broker connection needs refreshing. Please enter a new API key to reconnect."
                      : connection.last_error.includes("decryption")
                        ? "Your broker credentials could not be read. Please reconnect with a new API key."
                        : connection.last_error}
                  </div>
                  {(connection.last_error.includes("401") || connection.last_error.includes("decryption")) && (
                    <button
                      type="button"
                      onClick={openTrading212Popup}
                      className="mt-2 rounded-full bg-rose-400/15 px-4 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/25"
                    >
                      Reconnect
                    </button>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-auto flex flex-wrap gap-2 pt-6">
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
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
              <div className="text-4xl">📊</div>
              <div className="mt-4 text-lg font-medium text-white">No broker connected</div>
              <p className="mt-2 max-w-xs text-sm text-slate-400">
                Connect your Trading 212 account to start tracking your portfolio in real time.
              </p>
              <button
                onClick={openTrading212Popup}
                className="mt-6 rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] px-7 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110"
              >
                Connect Trading 212
              </button>
            </div>
          )}
        </div>

        {/* ═══ RIGHT — Telegram Alerts ═══ */}
        <TelegramSection />
      </div>
    </div>
  );
}
