"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CheckoutSuccessPage() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<"checking" | "active" | "waiting" | "error">("checking");
  const [message, setMessage] = useState("Finalising your Aurora membership...");

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!cancelled) {
            setStatus("error");
            setMessage("We could not confirm your session. Please sign in again.");
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("subscription_status, plan_key")
          .eq("id", user.id)
          .single();

        if (profileError) {
          if (!cancelled) {
            setStatus("waiting");
            setMessage("Payment received. Waiting for Aurora to activate your subscription...");
          }
          return;
        }

        const isActive =
          profile?.subscription_status === "active" ||
          profile?.subscription_status === "trialing";

        if (isActive) {
          if (!cancelled) {
            setStatus("active");
            setMessage("Your subscription is active. Redirecting to your dashboard...");
            window.location.href = "/dashboard";
          }
          return;
        }

        if (!cancelled) {
          setStatus("waiting");
          setMessage("Payment received. Waiting for Aurora to activate your subscription...");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Something went wrong while checking your payment.");
        }
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
          <div className="mb-5 text-sm uppercase tracking-[0.35em] text-cyan-300/80">
            Aurora Growth
          </div>

          <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-bold text-transparent">
            Payment successful
          </h1>

          <p className="mt-5 text-lg text-white/70">
            {message}
          </p>

          <div className="mt-8 flex justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400" />
          </div>

          <div className="mt-8 text-sm text-white/50">
            Status: {status}
          </div>

          <div className="mt-8">
            <a
              href="/dashboard"
              className="inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 px-6 py-3 text-sm font-medium text-white transition hover:opacity-95"
            >
              Continue to dashboard
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
