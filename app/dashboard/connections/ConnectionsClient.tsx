"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBrokerPopup } from "@/components/providers/BrokerPopupProvider";

import BrokerModeToggle from "@/components/broker/BrokerModeToggle";
import { ConnectionGuideButton } from "@/components/broker/ConnectionGuideModal";
import AlertsPanel from "@/components/telegram/AlertsPanel";

type Connection = {
  id: string;
  broker: string;
  mode?: string;
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
  const [qrError, setQrError] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrGenerated = useRef(false);

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

  const generateQr = useCallback(async () => {
    if (generating || qrGenerated.current) return;
    qrGenerated.current = true;
    setGenerating(true);
    setQrError(null);
    try {
      const res = await fetch("/api/telegram/generate-token", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.qr_url) {
        setQrError(data.error || "Failed to generate Telegram link");
        return;
      }
      setQrUrl(data.qr_url);
      const qrRes = await fetch(`/api/telegram/qr?url=${encodeURIComponent(data.qr_url)}`);
      if (qrRes.ok) {
        const blob = await qrRes.blob();
        setQrDataUrl(URL.createObjectURL(blob));
      } else {
        setQrError("Failed to generate QR code image");
      }
      if (!pollRef.current) {
        pollRef.current = setInterval(checkStatus, 3000);
      }
    } catch (e: any) {
      setQrError(e.message || "Failed to connect");
      qrGenerated.current = false;
    } finally {
      setGenerating(false);
    }
  }, [generating, checkStatus]);

  // Auto-generate QR when status loads and not connected
  useEffect(() => {
    if (tgStatus && !tgStatus.connected && !qrDataUrl && !qrGenerated.current) {
      generateQr();
    }
  }, [tgStatus, qrDataUrl, generateQr]);

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

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <AlertsPanel />

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="flex flex-wrap gap-2">
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
            Scan this QR code with your phone to connect Telegram and receive price alerts.
          </p>

          {qrDataUrl ? (
            <div className="mt-5">
              <div className="inline-block rounded-2xl border border-white/10 bg-white p-3">
                <img src={qrDataUrl} alt="Telegram QR code" width={180} height={180} className="h-44 w-44" />
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
          ) : generating ? (
            <div className="mt-5 flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <span className="text-sm text-white/40">Generating your unique QR code...</span>
            </div>
          ) : qrError ? (
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {qrError}
              </div>
              <button
                onClick={() => { qrGenerated.current = false; generateQr(); }}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/15"
              >
                Try again
              </button>
            </div>
          ) : (
            <button
              onClick={generateQr}
              className="mt-auto rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] px-7 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-110"
            >
              Connect Telegram
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Connection Card ─── */

function ConnectionCard({
  mode,
  connection,
  loading,
  onTest,
  onDisconnect,
  onConnect,
  testing,
}: {
  mode: "live" | "demo";
  connection: Connection | null;
  loading: boolean;
  onTest: () => void;
  onDisconnect: () => void;
  onConnect: () => void;
  testing: boolean;
}) {
  const isLive = mode === "live";
  const dot = isLive ? "bg-emerald-400" : "bg-amber-400";
  const label = isLive ? "LIVE ACCOUNT" : "DEMO / PRACTICE";
  const icon = isLive ? "🟢" : "🟡";

  return (
    <div className={`rounded-2xl border p-5 ${
      connection?.is_connected
        ? isLive ? "border-emerald-400/20 bg-emerald-400/5" : "border-amber-400/20 border-dashed bg-amber-400/5"
        : "border-white/10 bg-white/[0.03]"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        {loading ? (
          <span className="text-xs text-slate-500">Loading...</span>
        ) : connection?.is_connected ? (
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
            isLive ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-amber-400/25 bg-amber-400/10 text-amber-300"
          }`}>Active</span>
        ) : (
          <span className="text-[10px] text-slate-500">Not connected</span>
        )}
      </div>

      {connection?.is_connected ? (
        <div className="mt-4">
          <div className="text-sm text-slate-300">
            Account: {connection.account_id || "—"} · {connection.account_currency || "—"}
          </div>
          <div className="text-xs text-slate-500">
            Last sync: {connection.last_tested_at ? fmtDate(connection.last_tested_at) : "Never"}
          </div>
          {connection.last_error && (
            <div className="mt-2 text-xs text-rose-300">{connection.last_error}</div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={onTest} disabled={testing} className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.06] disabled:opacity-40">
              {testing ? "Testing..." : "Test"}
            </button>
            <button onClick={onConnect} className="rounded-full border border-cyan-400/15 bg-cyan-400/5 px-3.5 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/10">
              Reconnect
            </button>
            <button onClick={onDisconnect} className="rounded-full border border-rose-400/15 bg-rose-400/5 px-3.5 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-400/10">
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-slate-400">
            {isLive ? "Connect your live account to track your real portfolio." : "Connect a practice account to test without real money."}
          </p>
          <button
            onClick={onConnect}
            className={`mt-3 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              isLive
                ? "bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#a855f7_100%)] text-slate-950 hover:brightness-110"
                : "border border-amber-400/20 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15"
            }`}
          >
            Connect {isLive ? "Live" : "Demo"} Account
          </button>

          <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-slate-400">
              Don&apos;t have an account yet? Sign up to our recommended broker and get a free share worth up to &pound;100 when you make your first deposit.
            </p>
            <a
              href="https://www.trading212.com/invite/4DqdKdJdUH3"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              Open a broker account &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Notification Preferences ──────────────────────── */

function NotificationPreferences() {
  const [prefs, setPrefs] = useState<{
    notify_telegram: boolean;
    notify_email: boolean;
    notify_in_app: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile/notification-prefs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setPrefs(d.prefs);
      })
      .catch(() => {});
  }, []);

  async function toggle(key: "notify_telegram" | "notify_email" | "notify_in_app") {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      await fetch("/api/profile/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch {
      setPrefs(prefs); // revert
    } finally {
      setSaving(false);
    }
  }

  const channels = [
    { key: "notify_telegram" as const, label: "Telegram", icon: "💬", desc: "Receive alerts via Telegram bot" },
    { key: "notify_email" as const, label: "Email", icon: "📧", desc: "Receive alerts to your email address" },
    { key: "notify_in_app" as const, label: "In-App", icon: "🔔", desc: "See alerts inside Aurora dashboard" },
  ];

  return (
    <div className="rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/10">
          <span className="text-lg">⚙️</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
          <p className="text-xs text-slate-400">Choose how you receive alerts and notifications</p>
        </div>
      </div>

      <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {!prefs ? (
        <div className="text-sm text-white/40">Loading preferences...</div>
      ) : (
        <div className="space-y-3">
          {channels.map((ch) => (
            <div
              key={ch.key}
              className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                prefs[ch.key]
                  ? "border-cyan-400/15 bg-cyan-400/5"
                  : "border-white/8 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{ch.icon}</span>
                <div>
                  <div className="text-sm font-medium text-white">{ch.label}</div>
                  <div className="text-xs text-slate-400">{ch.desc}</div>
                </div>
              </div>
              <button
                onClick={() => toggle(ch.key)}
                disabled={saving}
                className={`relative flex-shrink-0 h-7 w-12 rounded-full transition-colors ${
                  prefs[ch.key] ? "bg-cyan-500" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    prefs[ch.key] ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────── */

export default function ConnectionsClient() {
  const { openTrading212Popup } = useBrokerPopup();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<"live" | "demo" | null>(null);
  const [liveConn, setLiveConn] = useState<Connection | null>(null);
  const [demoConn, setDemoConn] = useState<Connection | null>(null);
  const [activeMode, setActiveMode] = useState<"live" | "demo">("live");
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/connections/trading212?mode=all", { cache: "no-store" });
      const data = await res.json();
      const conns: Connection[] = data.connections || [];
      setLiveConn(conns.find((c) => c.mode === "live") || null);
      setDemoConn(conns.find((c) => c.mode === "demo") || null);
      setActiveMode(data.activeMode || "live");
    } catch {
      setStatus("Could not load connections.");
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

  async function testConnection(mode: "live" | "demo") {
    setTesting(mode);
    setStatus("");
    try {
      const res = await fetch("/api/connections/trading212/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection test failed.");
      setStatus(`${mode === "live" ? "Live" : "Demo"} connection verified.`);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Connection test failed.");
    } finally {
      setTesting(null);
    }
  }

  async function disconnect(mode: "live" | "demo") {
    setStatus("");
    try {
      const res = await fetch(`/api/connections/trading212?mode=${mode}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disconnect.");
      setStatus(`${mode === "live" ? "Live" : "Demo"} connection removed.`);
      await load();
      window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to disconnect.");
    }
  }

  return (
    <div className="mx-auto w-full space-y-6 px-2">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Connections</h1>
        <p className="mt-2 text-base text-slate-400">Manage your broker and notification integrations.</p>
      </div>

      {status && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-5 py-3">
          <div className="text-sm text-slate-200">{status}</div>
          <button onClick={() => setStatus("")} className="text-xs text-slate-500 hover:text-slate-300">Dismiss</button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ═══ LEFT — Broker Connections ═══ */}
        <div className="flex flex-col rounded-[32px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(8,20,43,0.98),rgba(3,12,28,0.98))] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <span className="text-lg">🔗</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Broker Connections</h2>
              <p className="text-xs text-slate-400">Live and practice accounts</p>
            </div>
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="space-y-4">
            <ConnectionCard
              mode="live"
              connection={liveConn}
              loading={loading}
              testing={testing === "live"}
              onTest={() => testConnection("live")}
              onDisconnect={() => disconnect("live")}
              onConnect={openTrading212Popup}
            />
            <ConnectionCard
              mode="demo"
              connection={demoConn}
              loading={loading}
              testing={testing === "demo"}
              onTest={() => testConnection("demo")}
              onDisconnect={() => disconnect("demo")}
              onConnect={openTrading212Popup}
            />
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <ConnectionGuideButton />

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <BrokerModeToggle initialMode={activeMode} />
        </div>

        {/* ═══ RIGHT — Telegram Alerts ═══ */}
        <TelegramSection />
      </div>

      {/* ═══ Notification Preferences ═══ */}
      <NotificationPreferences />
    </div>
  );
}
