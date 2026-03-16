"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ScanSearch,
  Star,
  BriefcaseBusiness,
  Calculator,
  Link2,
  CreditCard,
  UserCircle2,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Trading212Status = "connected" | "attention" | "disconnected";

type DashboardSidebarProps = {
  currentPlan?: string | null;
  planActive?: boolean;
  trading212Connected?: boolean;
  trading212Status?: Trading212Status | null;
  userName?: string | null;
  userEmail?: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: any;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getPlanTheme(plan?: string | null, active?: boolean) {
  const value = (plan || "").toLowerCase();

  if (!active || !value || value === "free" || value === "no plan") {
    return {
      card: "border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))]",
      glow: "shadow-[0_0_30px_rgba(8,15,40,0.35)]",
      badge: "border-slate-400/20 bg-slate-500/10 text-slate-200",
      label: "No plan",
      subtitle: "Plan inactive",
    };
  }

  if (value === "core") {
    return {
      card: "border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_35%),linear-gradient(180deg,rgba(10,34,64,0.96),rgba(2,6,23,0.98))]",
      glow: "shadow-[0_0_38px_rgba(34,211,238,0.12)]",
      badge: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
      label: "Core",
      subtitle: "Plan active",
    };
  }

  if (value === "pro") {
    return {
      card: "border-fuchsia-400/20 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.18),transparent_35%),linear-gradient(180deg,rgba(60,30,110,0.96),rgba(2,6,23,0.98))]",
      glow: "shadow-[0_0_38px_rgba(217,70,239,0.14)]",
      badge: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100",
      label: "Pro",
      subtitle: "Plan active",
    };
  }

  return {
    card: "border-amber-300/20 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_35%),linear-gradient(180deg,rgba(82,50,14,0.96),rgba(2,6,23,0.98))]",
    glow: "shadow-[0_0_40px_rgba(251,191,36,0.14)]",
    badge: "border-amber-300/25 bg-amber-400/10 text-amber-100",
    label: "Elite",
    subtitle: "Plan active",
  };
}

function getTrading212Theme(
  trading212Status?: Trading212Status | null,
  trading212Connected?: boolean
) {
  const status: Trading212Status =
    trading212Status ||
    (trading212Connected ? "connected" : "disconnected");

  if (status === "connected") {
    return {
      wrapper: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
      dot: "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.75)]",
      label: "Trading 212 connected",
    };
  }

  if (status === "attention") {
    return {
      wrapper: "border-amber-400/20 bg-amber-500/10 text-amber-100",
      dot: "bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.75)]",
      label: "Trading 212 needs attention",
    };
  }

  return {
    wrapper: "border-rose-400/20 bg-rose-500/10 text-rose-100",
    dot: "bg-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.75)]",
    label: "Not connected to Trading 212",
  };
}

export default function DashboardSidebar({
  currentPlan,
  planActive,
  trading212Connected,
  trading212Status,
  userName,
  userEmail,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const planTheme = useMemo(
    () => getPlanTheme(currentPlan, planActive),
    [currentPlan, planActive]
  );

  const connectionTheme = useMemo(
    () => getTrading212Theme(trading212Status, trading212Connected),
    [trading212Status, trading212Connected]
  );

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/market-scanner", label: "Market Scanner", icon: ScanSearch },
    { href: "/dashboard/watchlist", label: "Watchlist", icon: Star },
    { href: "/dashboard/investments", label: "Investments", icon: BriefcaseBusiness },
    { href: "/dashboard/investments/calculator", label: "Calculator", icon: Calculator },
    { href: "/dashboard/connections", label: "Connections", icon: Link2 },
    { href: "/dashboard/upgrade", label: "Upgrade Plan", icon: CreditCard },
    { href: "/dashboard/account", label: "Account", icon: UserCircle2 },
  ];

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      alert("Unable to log out right now");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-cyan-400/10 bg-[linear-gradient(180deg,#020617_0%,#03122b_45%,#020617_100%)] transition-all duration-300",
        collapsed ? "w-20" : "w-[265px]"
      )}
    >
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-5">
        <Link href="/dashboard" className="flex items-center overflow-hidden">
          <Image
            src="/aurora-logo.png"
            alt="Aurora Growth"
            width={44}
            height={44}
            className="h-10 w-auto shrink-0"
          />
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/5 text-cyan-200 transition hover:bg-cyan-500/10"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="px-3 py-4">
        <Link
          href="/dashboard/upgrade"
          className={cn(
            "block rounded-3xl border p-4 transition-all duration-300 hover:scale-[1.01]",
            planTheme.card,
            planTheme.glow
          )}
        >
          <div className={cn("flex", collapsed ? "justify-center" : "justify-between gap-3")}>
            <div className={cn(collapsed && "hidden")}>
              <div className="text-3xl font-semibold text-white">{planTheme.label}</div>
              <div className="mt-1 text-sm text-white/70">{planTheme.subtitle}</div>
            </div>

            {!collapsed && (
              <span
                className={cn(
                  "h-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]",
                  planTheme.badge
                )}
              >
                {planActive ? "Active" : "Inactive"}
              </span>
            )}

            {collapsed && (
              <div
                className={cn(
                  "h-3.5 w-3.5 rounded-full",
                  planActive ? "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.8)]" : "bg-slate-500"
                )}
              />
            )}
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-2xl px-3 py-3 text-sm transition",
                  active
                    ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                    : "text-white/75 hover:bg-white/5 hover:text-white",
                  collapsed ? "justify-center" : "gap-3"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active ? "text-cyan-300" : "text-white/70")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/6 px-3 py-4">
        <div
          className={cn(
            "rounded-2xl border px-3 py-3",
            connectionTheme.wrapper,
            collapsed ? "flex justify-center" : "flex items-center gap-3"
          )}
          title={collapsed ? connectionTheme.label : undefined}
        >
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", connectionTheme.dot)} />
          {!collapsed && (
            <span className="text-sm font-medium">
              {connectionTheme.label}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "mt-3 w-full rounded-2xl border border-cyan-400/20 bg-[linear-gradient(90deg,rgba(6,182,212,0.12),rgba(59,130,246,0.10),rgba(217,70,239,0.10))] px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-[linear-gradient(90deg,rgba(6,182,212,0.18),rgba(59,130,246,0.14),rgba(217,70,239,0.14))] disabled:opacity-60",
            collapsed ? "flex items-center justify-center" : "flex items-center justify-center gap-2"
          )}
          title={collapsed ? "Log out" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{loggingOut ? "Logging out..." : "Log out"}</span>}
        </button>

        {!collapsed && (
          <div className="mt-4 border-t border-white/6 pt-4">
            <div className="truncate text-sm font-medium text-white">
              {userName || "Aurora member"}
            </div>
            <div className="truncate text-xs text-white/55">
              {userEmail || "member@aurora"}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
