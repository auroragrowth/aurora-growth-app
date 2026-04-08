"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, Check, Circle, ChevronRight, PartyPopper } from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────── */

type Steps = {
  planSelected: boolean;
  scannerViewed: boolean;
  watchlistAdded: boolean;
  calculatorUsed: boolean;
  alertsSetup: boolean;
  alertsPartial: boolean;
};

type StatusResponse = {
  shouldShow: boolean;
  shownCount: number;
  steps: Steps;
  allComplete: boolean;
};

/* ─── Step definitions ────────────────────────────────────────── */

type StepDef = {
  key: keyof Omit<Steps, "alertsPartial">;
  label: string;
  description: string;
  cta: string;
  href: string;
};

const STEP_DEFS: StepDef[] = [
  {
    key: "planSelected",
    label: "Plan selected",
    description: "Choose your Aurora membership plan",
    cta: "View Plans \u2192",
    href: "/dashboard/upgrade",
  },
  {
    key: "scannerViewed",
    label: "Run the scanner",
    description: "Open the scanner and explore today&rsquo;s Aurora opportunities",
    cta: "Go to Scanner \u2192",
    href: "/dashboard/market-scanner",
  },
  {
    key: "watchlistAdded",
    label: "Add a stock to watchlist",
    description: "Star a stock you want to track",
    cta: "Go to Scanner \u2192",
    href: "/dashboard/market-scanner",
  },
  {
    key: "calculatorUsed",
    label: "Build a ladder",
    description: "Use the calculator to plan your entry strategy",
    cta: "Open Calculator \u2192",
    href: "/dashboard/investments/calculator",
  },
  {
    key: "alertsSetup",
    label: "Set up alerts",
    description: "Connect Telegram and set a price alert on your first stock",
    cta: "Go to Connections \u2192",
    href: "/dashboard/connections",
  },
];

/* ─── Component ───────────────────────────────────────────────── */

export default function QuickStartGuide() {
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<StatusResponse | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const hasIncremented = useRef(false);

  /* ── Fetch status ──────────────────────────────────────────── */
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/quickstart/status");
      if (!res.ok) return;
      const json: StatusResponse = await res.json();
      setData(json);

      if (json.allComplete) {
        setAllDone(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      if (json.shouldShow) {
        // Only show on dashboard pages
        if (pathname.startsWith("/dashboard")) {
          setVisible(true);

          // Increment shown count once per session
          if (!hasIncremented.current) {
            hasIncremented.current = true;
            // Fire-and-forget: increment shown_count
            // We use dismiss with permanently=false to just bump the counter
            // But we don't want to close — so we call the API directly
            fetch("/api/quickstart/dismiss", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ permanently: false }),
            }).catch(() => {});
          }
        }
      }
    } catch {
      // silently fail
    }
  }, [pathname]);

  useEffect(() => {
    // Don't show on non-dashboard pages
    if (!pathname.startsWith("/dashboard")) return;

    // localStorage is the PRIMARY gate — no flicker
    if (
      localStorage.getItem("aurora_tour_done") === "true" ||
      localStorage.getItem("aurora_all_popups_done") === "true" ||
      localStorage.getItem("aurora_quickstart_done") === "true"
    ) {
      return;
    }

    // Check if dismissed this session
    const dismissed = sessionStorage.getItem("aurora_quickstart_dismissed");
    if (dismissed === "true") return;

    fetchStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check steps when user navigates back
  useEffect(() => {
    if (visible && pathname.startsWith("/dashboard")) {
      fetchStatus();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Handlers ──────────────────────────────────────────────── */
  const handleClose = useCallback(() => {
    setVisible(false);
    sessionStorage.setItem("aurora_quickstart_dismissed", "true");
  }, []);

  const handleRemindLater = useCallback(() => {
    setVisible(false);
    sessionStorage.setItem("aurora_quickstart_dismissed", "true");
  }, []);

  const handleDontShowAgain = useCallback(async () => {
    setVisible(false);
    sessionStorage.setItem("aurora_quickstart_dismissed", "true");
    localStorage.setItem("aurora_quickstart_done", "true");
    localStorage.setItem("aurora_all_popups_done", "true");
    try {
      await fetch("/api/quickstart/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permanently: true }),
      });
    } catch { /* best effort */ }
  }, []);

  const handleAllDoneClick = useCallback(async () => {
    setVisible(false);
    sessionStorage.setItem("aurora_quickstart_dismissed", "true");
    localStorage.setItem("aurora_quickstart_done", "true");
    localStorage.setItem("aurora_all_popups_done", "true");
    try {
      await fetch("/api/quickstart/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permanently: true }),
      });
    } catch { /* best effort */ }
  }, []);

  const handleNavigate = useCallback(
    (href: string) => {
      setVisible(false);
      sessionStorage.setItem("aurora_quickstart_dismissed", "true");
      router.push(href);
    },
    [router]
  );

  if (!visible || !data) return null;

  const steps = data.steps;
  const completedCount = [
    steps.planSelected,
    steps.scannerViewed,
    steps.watchlistAdded,
    steps.calculatorUsed,
    steps.alertsSetup,
  ].filter(Boolean).length;

  const progressPercent = (completedCount / 5) * 100;

  return (
    <>
      {/* Confetti burst */}
      {showConfetti && <ConfettiBurst />}

      {/* Floating card */}
      <div
        className="fixed bottom-6 right-6 z-[9990] w-[380px] animate-in slide-in-from-bottom-4 fade-in duration-400"
        style={{ maxHeight: "calc(100vh - 48px)" }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 shadow-[0_25px_70px_rgba(0,0,0,0.5),0_0_40px_rgba(34,211,238,0.06)] backdrop-blur-xl"
          style={{ background: "linear-gradient(135deg, rgba(8,20,42,0.98) 0%, rgba(12,28,56,0.98) 100%)" }}
        >
          {/* Aurora gradient border top */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400" />

          {/* Header */}
          <div className="flex items-start justify-between p-5 pb-3">
            <div>
              <h3 className="text-base font-semibold text-white">
                {allDone ? "\u2726 You&rsquo;re all set!" : "\u2726 Aurora Quick Start"}
              </h3>
              <p className="mt-1 text-xs text-white/50">
                {allDone
                  ? "You have completed the Aurora quick start. Explore the platform at your own pace."
                  : "Complete these steps to get started"}
              </p>
            </div>
            {!allDone && (
              <button
                type="button"
                onClick={handleClose}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/10 hover:text-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mx-5 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mx-5 mt-1.5 text-[10px] text-white/35">
            {completedCount}/5 complete
          </div>

          {/* Steps or completion message */}
          {allDone ? (
            <div className="p-5 pt-4">
              <button
                type="button"
                onClick={handleAllDoneClick}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-400 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                Got it &mdash; let&rsquo;s go
              </button>
            </div>
          ) : (
            <>
              <div className="max-h-[380px] space-y-1 overflow-y-auto px-3 py-3">
                {STEP_DEFS.map((def, i) => {
                  const done = steps[def.key];
                  const isAlerts = def.key === "alertsSetup";
                  const partial = isAlerts && steps.alertsPartial;

                  return (
                    <div
                      key={def.key}
                      className={`rounded-xl px-3 py-2.5 transition ${
                        done
                          ? "bg-cyan-400/[0.06]"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="mt-0.5 shrink-0">
                          {done ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20">
                              <Check className="h-3 w-3 text-emerald-400" />
                            </div>
                          ) : partial ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/20">
                              <Check className="h-3 w-3 text-amber-400" />
                            </div>
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15">
                              <Circle className="h-2.5 w-2.5 text-white/25" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${done ? "text-white/50 line-through" : "text-white/90"}`}>
                            Step {i + 1} &mdash; {def.label}
                          </div>

                          {!done && (
                            <>
                              <p className="mt-0.5 text-xs text-white/40">{def.description}</p>
                              {/* Don't show CTA for step 1 since it's already done by definition when guide shows */}
                              {i > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleNavigate(def.href)}
                                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-cyan-300 transition hover:text-cyan-200"
                                >
                                  {def.cta}
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="border-t border-white/6 px-5 py-3">
                <div className="mb-2 text-[10px] text-white/25">
                  Shown {Math.min(data.shownCount + 1, 3)} of 3 times
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRemindLater}
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] py-2 text-xs font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white/80"
                  >
                    Remind me later
                  </button>
                  <button
                    type="button"
                    onClick={handleDontShowAgain}
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] py-2 text-xs font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white/80"
                  >
                    Don&apos;t show again
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Confetti animation ──────────────────────────────────────── */

function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#22d3ee", "#3b82f6", "#8b5cf6", "#34d399", "#fbbf24", "#f472b6"];
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      w: number; h: number; color: string; rot: number; vr: number;
      life: number;
    }> = [];

    // Create particles from bottom-right area
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width - 200 + Math.random() * 100,
        y: canvas.height - 300 + Math.random() * 100,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 4,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.rot += p.vr;
        p.life -= 0.012;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (alive) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[10000]"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
