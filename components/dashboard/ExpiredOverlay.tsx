"use client";

import Link from "next/link";
import { useSubscription } from "@/components/providers/SubscriptionProvider";

export function ExpiredBlur({ children }: { children: React.ReactNode }) {
  const { isExpired } = useSubscription();

  if (!isExpired) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[6px] opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-[rgba(4,10,22,0.92)] px-6 py-5 text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-sm">
          <div className="text-sm font-medium text-white/80">
            Your subscription has ended
          </div>
          <div className="mt-2 text-xs text-white/50">
            Renew your plan to access this content
          </div>
          <Link
            href="/dashboard/upgrade"
            className="mt-4 inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Renew now
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ExpiredLock({ children }: { children: React.ReactNode }) {
  const { isExpired } = useSubscription();

  if (!isExpired) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[8px] opacity-40">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-[28px] border border-cyan-400/20 bg-[rgba(4,14,30,0.95)] px-8 py-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/15 ring-1 ring-cyan-400/25">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-300">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div className="mt-4 text-lg font-semibold text-white">
            Renew to unlock
          </div>
          <div className="mt-2 text-sm text-white/50">
            This feature requires an active Aurora subscription
          </div>
          <Link
            href="/dashboard/upgrade"
            className="mt-5 inline-flex rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.3)] transition hover:brightness-110"
          >
            Renew now
          </Link>
        </div>
      </div>
    </div>
  );
}
