"use client";

import Link from "next/link";
import { useSubscription } from "@/components/providers/SubscriptionProvider";

export default function ExpiryBanner() {
  const { isExpired, isPastDue, currentPeriodEnd } = useSubscription();

  if (!isExpired && !isPastDue) return null;

  const endDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "an unknown date";

  if (isExpired) {
    return (
      <div className="mx-4 mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-5 py-4 sm:mx-6 lg:mx-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-rose-200">
              Your Aurora subscription ended on {endDate}.
            </div>
            <div className="mt-1 text-xs text-rose-300/60">
              Renew now to restore full access to the scanner, calculator, and all premium features.
            </div>
          </div>
          <Link
            href="/dashboard/upgrade"
            className="shrink-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Renew now
          </Link>
        </div>
      </div>
    );
  }

  // past_due
  return (
    <div className="mx-4 mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-5 py-4 sm:mx-6 lg:mx-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-amber-200">
            Your payment failed. Please update your payment method to keep your plan active.
          </div>
        </div>
        <form action="/api/stripe/portal" method="post">
          <button
            type="submit"
            className="shrink-0 rounded-full bg-amber-500/20 px-5 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/30"
          >
            Update payment
          </button>
        </form>
      </div>
    </div>
  );
}
