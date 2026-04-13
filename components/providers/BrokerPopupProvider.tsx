"use client";

import { createContext, useCallback, useContext, useState } from "react";

type BrokerPopupContextType = {
  openTrading212Popup: () => void;
};

const BrokerPopupContext = createContext<BrokerPopupContextType>({
  openTrading212Popup: () => {},
});

export function useBrokerPopup() {
  return useContext(BrokerPopupContext);
}

/* ── Guide steps ── */

const GUIDE_STEPS = [
  { icon: "🖥️", title: "Open Trading 212 on desktop", desc: "Go to trading212.com in a desktop browser. API settings are not available on the mobile app." },
  { icon: "👤", title: "Click your profile icon", desc: "Click your profile icon or initials in the top-right corner of the platform." },
  { icon: "⚙️", title: "Open Settings", desc: "From the dropdown menu click Settings to open the settings panel." },
  { icon: "🔌", title: "Find the API section", desc: "In the left-hand settings menu scroll down and click API." },
  { icon: "🔓", title: "Enable API access", desc: "Switch the Enable API access toggle ON. Do this separately for Invest (Live) and Practice accounts." },
  { icon: "🔑", title: "Generate your keys", desc: "Click Generate. Copy both the API Key and Secret Key immediately — they only show once. Never share them with anyone." },
];

/* ── Per-account key form ── */

function KeyForm({
  mode,
  apiKey,
  setApiKey,
  secretKey,
  setSecretKey,
  connecting,
  connected,
  error,
  clearError,
  onConnect,
}: {
  mode: "live" | "demo";
  apiKey: string;
  setApiKey: (v: string) => void;
  secretKey: string;
  setSecretKey: (v: string) => void;
  connecting: boolean;
  connected: boolean;
  error: string;
  clearError: () => void;
  onConnect: () => void;
}) {
  const isLive = mode === "live";

  return (
    <div
      className={`rounded-2xl border p-5 space-y-4 ${
        connected
          ? "bg-green-500/10 border-green-500/20"
          : "bg-white/[0.02] border-white/10"
      }`}
    >
      {/* Account header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              connected
                ? isLive
                  ? "bg-green-400 animate-pulse"
                  : "bg-amber-400 animate-pulse"
                : "bg-white/20"
            }`}
          />
          <p className="text-white font-bold text-sm">
            {isLive ? "Live Account (Invest)" : "Practice Account"}
          </p>
        </div>
        {connected && (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              isLive
                ? "bg-green-500/20 border border-green-500/30 text-green-400"
                : "bg-amber-500/20 border border-amber-500/30 text-amber-400"
            }`}
          >
            ✓ Connected
          </span>
        )}
      </div>

      {connected ? (
        <p className="text-white/50 text-xs">
          Your {isLive ? "live" : "practice"} account is connected to Aurora.
        </p>
      ) : (
        <>
          {/* API Key */}
          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
              API Key
            </label>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                clearError();
              }}
              placeholder="Paste your API Key"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-cyan-400/50 placeholder:text-white/20 transition"
            />
          </div>

          {/* Secret Key */}
          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
              Secret Key
            </label>
            <input
              type="password"
              autoComplete="off"
              value={secretKey}
              onChange={(e) => {
                setSecretKey(e.target.value);
                clearError();
              }}
              placeholder="Paste your Secret Key"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-cyan-400/50 placeholder:text-white/20 transition"
            />
          </div>

          {error && <p className="text-red-400 text-xs">✗ {error}</p>}

          {/* Connect button */}
          <button
            onClick={onConnect}
            disabled={connecting || !apiKey.trim()}
            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isLive
                ? "bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                : "bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
            }`}
          >
            {connecting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Connecting...
              </span>
            ) : (
              `Connect ${isLive ? "Live" : "Practice"} Account`
            )}
          </button>
        </>
      )}
    </div>
  );
}

/* ── Modal ── */

function ConnectModal({ onClose }: { onClose: (anyConnected: boolean) => void }) {
  const [screen, setScreen] = useState<"keys" | "guide">("keys");
  const [guideStep, setGuideStep] = useState(0);

  // Live
  const [liveApiKey, setLiveApiKey] = useState("");
  const [liveSecretKey, setLiveSecretKey] = useState("");
  const [liveConnecting, setLiveConnecting] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveError, setLiveError] = useState("");

  // Demo
  const [demoApiKey, setDemoApiKey] = useState("");
  const [demoSecretKey, setDemoSecretKey] = useState("");
  const [demoConnecting, setDemoConnecting] = useState(false);
  const [demoConnected, setDemoConnected] = useState(false);
  const [demoError, setDemoError] = useState("");

  const anyConnected = liveConnected || demoConnected;

  async function connectAccount(mode: "live" | "demo") {
    const isLive = mode === "live";
    const apiKey = isLive ? liveApiKey : demoApiKey;
    const secretKey = isLive ? liveSecretKey : demoSecretKey;
    const setConnecting = isLive ? setLiveConnecting : setDemoConnecting;
    const setConnected = isLive ? setLiveConnected : setDemoConnected;
    const setError = isLive ? setLiveError : setDemoError;

    if (!apiKey.trim()) {
      setError("API Key is required");
      return;
    }

    setConnecting(true);
    setError("");

    try {
      const res = await fetch("/api/connections/trading212", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          apiSecret: secretKey.trim() || undefined,
          mode,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to connect.");
      } else if (data.verified) {
        setConnected(true);
        window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
      } else {
        setError(
          data.error || "Key saved but verification failed — check the key and try again."
        );
        window.dispatchEvent(new CustomEvent("aurora:broker-connected"));
      }
    } catch {
      setError("Connection failed — please try again.");
    }

    setConnecting(false);
  }

  return (
    <div
      className="fixed inset-0 z-[99] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(anyConnected);
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(87,211,243,0.2)",
          boxShadow: "0 0 60px rgba(87,211,243,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 sticky top-0 z-10"
          style={{ background: "var(--bg-card)" }}
        >
          <div>
            <h2 className="text-white font-bold text-lg">
              {screen === "guide"
                ? "How to get your API keys"
                : "Connect Trading 212"}
            </h2>
            <p className="text-white/40 text-sm mt-0.5">
              {screen === "guide"
                ? "Step-by-step guide"
                : "Connect your Live and Practice accounts"}
            </p>
          </div>
          <button
            onClick={() => onClose(anyConnected)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-2xl flex items-center justify-center transition-all flex-shrink-0"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {screen === "guide" ? (
          <>
            {/* Progress dots */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5">
              {GUIDE_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setGuideStep(i)}
                  className={`transition-all rounded-full ${
                    i === guideStep
                      ? "w-6 h-2.5 bg-cyan-400"
                      : i < guideStep
                        ? "w-2.5 h-2.5 bg-cyan-400/40"
                        : "w-2.5 h-2.5 bg-white/10"
                  }`}
                />
              ))}
              <span className="text-white/30 text-xs ml-1">
                {guideStep + 1}/{GUIDE_STEPS.length}
              </span>
            </div>

            {/* Step content */}
            <div className="px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-2xl flex-shrink-0">
                  {GUIDE_STEPS[guideStep].icon}
                </div>
                <div>
                  <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">
                    Step {guideStep + 1} of {GUIDE_STEPS.length}
                  </p>
                  <h3 className="text-white font-bold text-base mb-2">
                    {GUIDE_STEPS[guideStep].title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {GUIDE_STEPS[guideStep].desc}
                  </p>
                </div>
              </div>
              {guideStep === 5 && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                  <p className="text-red-400/80 text-xs">
                    Your keys only show once — copy them immediately and never share
                    them with anyone.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              <button
                onClick={() => setScreen("keys")}
                className="text-white/30 text-sm hover:text-white/60 underline"
              >
                &larr; Back to keys
              </button>
              <div className="flex gap-2">
                {guideStep > 0 && (
                  <button
                    onClick={() => setGuideStep((s) => s - 1)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-white/40 text-sm hover:bg-white/5"
                  >
                    &larr; Back
                  </button>
                )}
                {guideStep < GUIDE_STEPS.length - 1 ? (
                  <button
                    onClick={() => setGuideStep((s) => s + 1)}
                    className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:opacity-90"
                  >
                    Next &rarr;
                  </button>
                ) : (
                  <button
                    onClick={() => setScreen("keys")}
                    className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-400 to-purple-500 text-white hover:opacity-90"
                  >
                    Enter my keys &rarr;
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ── Keys screen ── */
          <div className="p-6 space-y-4">
            {/* Help guide link */}
            <button
              onClick={() => {
                setScreen("guide");
                setGuideStep(0);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 text-cyan-400 text-sm font-bold hover:bg-cyan-400/10 transition-all"
            >
              Need help connecting? &mdash; Step-by-step guide
            </button>

            {/* Live account form */}
            <KeyForm
              mode="live"
              apiKey={liveApiKey}
              setApiKey={setLiveApiKey}
              secretKey={liveSecretKey}
              setSecretKey={setLiveSecretKey}
              connecting={liveConnecting}
              connected={liveConnected}
              error={liveError}
              clearError={() => setLiveError("")}
              onConnect={() => connectAccount("live")}
            />

            {/* Demo account form */}
            <KeyForm
              mode="demo"
              apiKey={demoApiKey}
              setApiKey={setDemoApiKey}
              secretKey={demoSecretKey}
              setSecretKey={setDemoSecretKey}
              connecting={demoConnecting}
              connected={demoConnected}
              error={demoError}
              clearError={() => setDemoError("")}
              onConnect={() => connectAccount("demo")}
            />

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <button
                onClick={() => onClose(anyConnected)}
                className="text-white/30 text-sm hover:text-white/60 underline"
              >
                Skip for now
              </button>
              {anyConnected && (
                <button
                  onClick={() => onClose(true)}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:opacity-90"
                >
                  Done ✓
                </button>
              )}
            </div>

            <p className="text-white/20 text-xs text-center">
              You can update your keys anytime from the Connections page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Provider ── */

export function BrokerPopupProvider({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);

  const openTrading212Popup = useCallback(() => {
    setShowModal(true);
  }, []);

  function handleClose(anyConnected: boolean) {
    setShowModal(false);
    if (anyConnected) window.location.reload();
  }

  return (
    <BrokerPopupContext.Provider value={{ openTrading212Popup }}>
      {children}
      {showModal && <ConnectModal onClose={handleClose} />}
    </BrokerPopupContext.Provider>
  );
}
