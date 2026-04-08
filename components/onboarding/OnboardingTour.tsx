"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/* ─── Tour step definitions ─────────────────────────────────── */

type TourStep = {
  title: string;
  body: string;
  /** CSS selector for the element to highlight — null = centre screen */
  selector: string | null;
  /** data-tour attribute value (shorthand for [data-tour="x"]) */
  tourId?: string;
  cta?: string;
  quote?: { text: string; author: string };
};

const QUOTES = [
  { text: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
  { text: "In investing, what is comfortable is rarely profitable.", author: "Robert Arnott" },
  { text: "The individual investor should act consistently as an investor and not as a speculator.", author: "Ben Graham" },
  { text: "Know what you own, and know why you own it.", author: "Peter Lynch" },
];

const STEPS: TourStep[] = [
  {
    title: "Welcome to Aurora Growth \u2726",
    body: "Let us show you around in 60 seconds. This quick tour covers the 7 key parts of Aurora so you can start finding opportunities straight away.",
    selector: null,
    cta: "Start tour \u2192",
    quote: QUOTES[Math.floor(Math.random() * QUOTES.length)],
  },
  {
    title: "\uD83D\uDD0D Market Scanner",
    body: "This is where Aurora identifies high-conviction stocks for you. The Core list has 38 stocks. The Alternative list has 98. Every stock is scored out of 30 \u2014 the higher the score, the stronger the opportunity. Click any ticker to see full analysis.",
    tourId: "scanner",
    selector: null,
  },
  {
    title: "\u2B50 Your Watchlist",
    body: "Star any stock from the scanner to add it to your watchlist. Aurora recommended stocks show with a teal badge. Stocks you find yourself show as My List. Your watchlist is where you monitor opportunities you are tracking.",
    tourId: "watchlist",
    selector: null,
  },
  {
    title: "\uD83D\uDCCA Investment Ladder Calculator",
    body: "Select any stock from your watchlist and Aurora automatically sets the reference price to 20% above current market price. The calculator shows you exactly where to buy in 4 staged steps \u2014 blue lines on the chart show entry points, gold lines show profit targets.",
    tourId: "calculator",
    selector: null,
  },
  {
    title: "\uD83D\uDD14 Price Alerts",
    body: "Click the bell icon on any watchlist stock to set automated alerts. Aurora can notify you when a stock rises above your target, falls below a level you are watching, or reaches your first ladder entry point. Alerts arrive instantly on Telegram.",
    tourId: "watchlist",
    selector: null,
  },
  {
    title: "\uD83D\uDCF1 Connect Telegram Alerts",
    body: "Go to Connections and scan the QR code with your phone to link your Telegram account. Once connected, Aurora sends you real-time alerts when your price levels are hit \u2014 so you never miss an entry point again.",
    tourId: "connections",
    selector: null,
  },
  {
    title: "\u2726 Aurora Intelligence",
    body: "Every stock comes with AI-powered analysis updated daily. Click any ticker in the scanner to see the full analysis. You can also listen to it using the headphones button. Aurora Intelligence gives you a structured read on momentum, fundamentals, and opportunity.",
    tourId: "scanner",
    selector: null,
    cta: "Start exploring \u2192",
  },
];

const TOTAL = STEPS.length; // 7

/* ─── Component ─────────────────────────────────────────────── */

export default function OnboardingTour() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0); // 0 = welcome, 1-6 = steps
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  /* ── Check eligibility on mount ───────────────────────────── */
  useEffect(() => {
    // Only auto-start on dashboard pages
    if (!pathname.startsWith("/dashboard")) return;

    // localStorage is the PRIMARY gate — checked BEFORE any API calls
    if (
      localStorage.getItem("aurora_tour_done") === "true" ||
      localStorage.getItem("aurora_all_popups_done") === "true" ||
      localStorage.getItem("aurora_tour_completed") === "true"
    ) {
      return;
    }

    // "Skip for now" expires after 24 hours
    const skipTime = localStorage.getItem("aurora_tour_skip_session");
    if (skipTime) {
      const hoursSinceSkip = (Date.now() - Number(skipTime)) / 3600000;
      if (hoursSinceSkip < 24) return; // still within 24h — stay hidden
      // Expired — clear so the tour can show again
      localStorage.removeItem("aurora_tour_skip_session");
    }
    // Legacy end-of-day skip — also check and clear
    if (localStorage.getItem("aurora_tour_skip") === "true") {
      localStorage.removeItem("aurora_tour_skip");
      localStorage.removeItem("aurora_tour_skip_date");
    }

    const savedStep = localStorage.getItem("aurora_tour_step");

    (async () => {
      try {
        const res = await fetch("/api/onboarding");
        if (!res.ok) return;
        const data = await res.json();

        // DB is the source of truth — if any dismiss flag is set, never show
        if (
          data.onboarding_tour_completed ||
          data.has_seen_welcome_message ||
          data.has_seen_welcome ||
          (data.welcome_popup_shown_count ?? 0) >= 3
        ) {
          // Sync to localStorage so we skip DB next time
          localStorage.setItem("aurora_tour_completed", "true");
          localStorage.setItem("aurora_tour_done", "true");
          localStorage.setItem("aurora_all_popups_done", "true");
          return;
        }

        const resumeStep = savedStep ? parseInt(savedStep, 10) : 0;
        setStep(resumeStep);
        setVisible(true);
      } catch {
        // Silently fail — don't block the app
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Position the card next to the highlighted element ────── */
  const updatePosition = useCallback(() => {
    const current = STEPS[step];
    if (!current) return;

    const selector = current.tourId
      ? `[data-tour="${current.tourId}"]`
      : current.selector;

    if (!selector) {
      setRect(null);
      return;
    }

    const el = document.querySelector(selector);
    if (!el) {
      setRect(null);
      return;
    }

    setRect(el.getBoundingClientRect());
  }, [step]);

  useEffect(() => {
    if (!visible) return;
    updatePosition();

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };
    const onResize = () => updatePosition();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [visible, step, updatePosition]);

  const [toast, setToast] = useState(false);

  /* ── Handlers ──────────────────────────────────────────────── */
  const showDismissToast = useCallback(() => {
    setToast(true);
    setTimeout(() => setToast(false), 4000);
  }, []);

  const completeTour = useCallback(async () => {
    // 1. Hide immediately
    setVisible(false);

    // 2. Set localStorage immediately — survives until cleared
    localStorage.setItem("aurora_tour_completed", "true");
    localStorage.setItem("aurora_tour_done", "true");
    localStorage.setItem("aurora_all_popups_done", "true");
    localStorage.removeItem("aurora_tour_step");
    localStorage.removeItem("aurora_tour_skip_session");

    // 3. Save to DB — source of truth across devices/browsers
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      if (!res.ok) {
        // Retry once after a short delay
        await new Promise((r) => setTimeout(r, 1000));
        await fetch("/api/onboarding/complete", { method: "POST" });
      }
    } catch {
      // localStorage blocks re-show even if DB fails
    }
    showDismissToast();
  }, [showDismissToast]);

  const skipForNow = useCallback(() => {
    setVisible(false);
    localStorage.setItem("aurora_tour_skip_session", Date.now().toString());
    localStorage.removeItem("aurora_tour_step");
    // Don't set completed — will show again next day
    showDismissToast();
  }, [showDismissToast]);

  const next = useCallback(() => {
    if (step >= TOTAL - 1) {
      completeTour();
      return;
    }
    const newStep = step + 1;
    setStep(newStep);
    localStorage.setItem("aurora_tour_step", String(newStep));
  }, [step, completeTour]);

  /* ── Restart handler (called externally via custom event) ─── */
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem("aurora_tour_completed");
      localStorage.removeItem("aurora_tour_done");
      localStorage.removeItem("aurora_tour_skip");
      localStorage.removeItem("aurora_tour_skip_date");
      localStorage.removeItem("aurora_tour_skip_session");
      localStorage.setItem("aurora_tour_step", "0");
      setStep(0);
      setVisible(true);
    };
    window.addEventListener("aurora:restart-tour", handler);
    return () => window.removeEventListener("aurora:restart-tour", handler);
  }, []);

  if (!visible) {
    return toast ? (
      <div className="fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-2xl border border-cyan-400/20 bg-[rgba(4,16,40,0.95)] px-5 py-3 text-sm text-slate-300 shadow-xl backdrop-blur-xl">
        You can restart the Aurora tour anytime from your Account page
      </div>
    ) : null;
  }

  const current = STEPS[step];
  const isWelcome = step === 0;
  const isFinal = step === TOTAL - 1;

  /* ── Card positioning ──────────────────────────────────────── */
  let cardStyle: React.CSSProperties;
  let arrowPosition: "left" | "none" = "none";

  if (rect) {
    // Position to the right of the sidebar element
    const top = Math.max(16, rect.top + rect.height / 2 - 120);
    const left = rect.right + 20;
    cardStyle = {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      maxWidth: "380px",
      width: "380px",
    };
    arrowPosition = "left";
  } else {
    // Centre screen
    cardStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "420px",
      width: "420px",
    };
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={skipForNow}
      />

      {/* Highlight ring on target element */}
      {rect && (
        <div
          className="pointer-events-none fixed z-[9999] rounded-2xl ring-2 ring-cyan-400/60 shadow-[0_0_24px_rgba(34,211,238,0.35)]"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            transition: "all 0.3s ease",
          }}
        />
      )}

      {/* Tour card */}
      <div
        ref={cardRef}
        className="z-[10000] animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={cardStyle}
      >
        {/* Arrow pointer */}
        {arrowPosition === "left" && (
          <div
            className="absolute -left-[10px] top-[28px]"
            style={{ width: 0, height: 0 }}
          >
            <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
              <path d="M12 0L0 10L12 20V0Z" fill="rgba(8,20,42,0.97)" />
              <path d="M12 0L0 10L12 20" stroke="rgba(34,211,238,0.3)" strokeWidth="1" fill="none" />
            </svg>
          </div>
        )}

        <div
          className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-[rgba(8,20,42,0.97)] shadow-[0_25px_70px_rgba(0,0,0,0.5),0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-xl"
          style={{
            background: "linear-gradient(135deg, rgba(8,20,42,0.97) 0%, rgba(12,28,56,0.97) 100%)",
          }}
        >
          {/* Aurora gradient border top */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400" />

          <div className="p-6">
            {/* Title */}
            <h3 className="text-lg font-semibold text-white">{current.title}</h3>

            {/* Body */}
            <p className="mt-3 text-sm leading-relaxed text-white/75">{current.body}</p>

            {/* Quote (welcome step only) */}
            {current.quote && (
              <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-sm italic text-white/60">
                  &ldquo;{current.quote.text}&rdquo;
                </p>
                <p className="mt-1 text-xs text-cyan-300/70">
                  &mdash; {current.quote.author}
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="mt-5 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />

            {/* Controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={skipForNow}
                  className="text-xs font-medium text-white/40 transition hover:text-white/70"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={completeTour}
                  className="text-xs font-medium text-white/25 transition hover:text-white/50"
                >
                  Don&apos;t show again
                </button>
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                      i <= step
                        ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                        : "bg-white/20"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={next}
                className="rounded-lg bg-gradient-to-r from-cyan-400 to-blue-400 px-4 py-1.5 text-xs font-semibold text-slate-950 transition hover:brightness-110"
              >
                {current.cta
                  ? current.cta
                  : isFinal
                    ? "Start exploring \u2192"
                    : "Next \u2192"}
              </button>
            </div>

            {/* Step counter */}
            {!isWelcome && (
              <div className="mt-2 text-center text-[11px] text-white/30">
                Step {step} of {TOTAL - 1}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
