"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "active" | "waiting" | "error";

export default function CheckoutSuccessPage() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<Status>("checking");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!cancelled) setStatus("error");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_status, plan_key")
          .eq("id", user.id)
          .single();

        const isActive =
          profile?.subscription_status === "active" ||
          profile?.subscription_status === "trialing";

        if (!cancelled) {
          setAttempts((n) => n + 1);

          if (isActive) {
            setStatus("active");
            // Small delay so the user sees the success state before redirect
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 1500);
          } else {
            setStatus("waiting");
          }
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [supabase]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_28%),radial-gradient(circle_at_right,_rgba(168,85,247,0.12),_transparent_30%),linear-gradient(180deg,_#040816_0%,_#081120_55%,_#050816_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[88vh] max-w-3xl items-center justify-center">
        <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-10">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
            Aurora Growth
          </p>

          {status === "active" ? (
            <>
              <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="h-8 w-8 text-emerald-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>

              <h1 className="mt-5 text-3xl font-bold text-white md:text-4xl">
                Payment successful
              </h1>

              <p className="mt-4 text-base text-white/70">
                Your Aurora membership is now active. Taking you to the
                dashboard to connect your Trading 212 account...
              </p>

              <div className="mt-6 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
              </div>
            </>
          ) : status === "error" ? (
            <>
              <h1 className="mt-6 text-3xl font-bold text-white">
                Something went wrong
              </h1>
              <p className="mt-4 text-base text-white/65">
                We could not confirm your session. Please sign in and check
                your account.
              </p>
              <a
                href="/login"
                className="mt-8 inline-flex rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Back to login
              </a>
            </>
          ) : (
            <>
              <h1 className="mt-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                Payment received
              </h1>

              <p className="mt-4 text-base text-white/70">
                Activating your Aurora membership — this usually takes a few
                seconds.
              </p>

              <div className="mt-8 flex justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-3 border-white/10 border-t-cyan-400" />
              </div>

              {attempts > 7 ? (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-white/50">
                    Taking longer than expected — your payment was received and
                    your plan will activate shortly.
                  </p>
                  <a
                    href="/dashboard"
                    className="inline-flex rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_30px_rgba(59,130,246,0.3)] transition hover:brightness-110"
                  >
                    Continue to Dashboard
                  </a>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
