"use client";

import Link from "next/link";
import NextLevelHeader from "@/components/layout/NextLevelHeader";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ScanSearch,
  Star,
  BriefcaseBusiness,
  Calculator,
  Activity,
  CreditCard,
  User,
  LogOut,
  Menu,
} from "lucide-react";

type DashboardShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  userName?: string;
  userEmail?: string;
  lastLogin?: string | null;
  planName?: string;
  brokerStatus?: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Market Scanner", href: "/dashboard/market-scanner", icon: ScanSearch },
  { label: "Watchlist", href: "/dashboard/watchlist", icon: Star },
  { label: "Investments", href: "/dashboard/investments", icon: BriefcaseBusiness },
  { label: "Calculator", href: "/dashboard/investments/calculator", icon: Calculator },
  { label: "Volatility Compass", href: "/dashboard/volatility", icon: Activity },
  { label: "Upgrade Plan", href: "/dashboard/upgrade", icon: CreditCard },
  { label: "Account", href: "/dashboard/account", icon: User },
];

function getPageTitle(pathname: string) {
  if (pathname === "/dashboard") return "Investments";
  if (pathname.startsWith("/dashboard/market-scanner")) return "Market Scanner";
  if (pathname.startsWith("/dashboard/watchlist")) return "Watchlist";
  if (pathname.startsWith("/dashboard/investments/calculator")) return "Investment Calculator";
  if (pathname.startsWith("/dashboard/investments")) return "Investments";
  if (pathname.startsWith("/dashboard/volatility")) return "Volatility Compass";
  if (pathname.startsWith("/dashboard/upgrade")) return "Upgrade Plan";
  if (pathname.startsWith("/dashboard/account")) return "Account";
  if (pathname.startsWith("/dashboard/chart")) return "Chart";
  return "Aurora Platform";
}

export default function DashboardShell({
  children,
  title,
  subtitle,
  userName = "paulrudland",
}: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const pageTitle = useMemo(() => title || getPageTitle(pathname), [title, pathname]);

  useEffect(() => {
    const saved = window.localStorage.getItem("aurora-sidebar-collapsed");
    if (saved === null) {
      setCollapsed(true);
    } else {
      setCollapsed(saved === "1");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("aurora-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#040b18] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(31,110,255,0.18),_transparent_26%),radial-gradient(circle_at_75%_15%,_rgba(115,76,255,0.10),_transparent_18%),radial-gradient(circle_at_15%_85%,_rgba(0,201,255,0.08),_transparent_22%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#030b17_0%,#041122_36%,#071731_72%,#09142c_100%)] opacity-100" />

      <div className="relative flex min-h-screen">
        {mobileOpen && (
          <button
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <aside
          onMouseEnter={() => {
            if (window.innerWidth >= 1024) setCollapsed(false);
          }}
          onMouseLeave={() => {
            if (window.innerWidth >= 1024) setCollapsed(true);
          }}
          className={[
            "fixed inset-y-0 left-0 z-40 border-r border-cyan-300/10 bg-[linear-gradient(180deg,rgba(4,14,30,0.98),rgba(5,18,39,0.98))] backdrop-blur-xl transition-all duration-300",
            collapsed ? "w-[88px]" : "w-[220px]",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          ].join(" ")}
        >
          <div className="flex h-full flex-col">
            <div className="flex h-[76px] items-center justify-center border-b border-cyan-300/10 px-4">
              <Link href="/dashboard" className="flex items-center justify-center">
                <img
                  src="/aurora-logo.png"
                  alt="Aurora Growth"
                  className={collapsed ? "h-10 w-auto object-contain" : "h-11 w-auto object-contain"}
                />
              </Link>
            </div>

            <nav className="flex-1 px-3 py-4">
              <div className="space-y-1.5">
                {navItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/") ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={[
                        "group relative flex items-center overflow-hidden rounded-2xl px-3 py-3 text-sm transition-all duration-200",
                        collapsed ? "justify-center" : "gap-3",
                        active
                          ? "bg-[linear-gradient(90deg,rgba(88,110,255,0.18),rgba(55,191,255,0.08))] text-white ring-1 ring-cyan-300/14 shadow-[0_0_20px_rgba(52,150,255,0.10)]"
                          : "text-white/74 hover:bg-white/[0.045] hover:text-white",
                      ].join(" ")}
                    >
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-cyan-300 via-sky-400 to-violet-400 shadow-[0_0_14px_rgba(95,195,255,.55)]" />
                      )}

                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.035]">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>

                      {!collapsed && (
                        <span className={item.label === "Dashboard" ? "text-[1rem] font-semibold" : "truncate"}>
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-cyan-300/10 px-3 py-3">
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className={[
                    "flex w-full items-center rounded-2xl border border-red-400/18 bg-red-500/8 px-3 py-3 text-sm text-red-200 transition hover:bg-red-500/14 hover:text-red-100",
                    collapsed ? "justify-center" : "gap-3",
                  ].join(" ")}
                  title={collapsed ? "Log out" : undefined}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-300/16 bg-red-400/10">
                    <LogOut className="h-[18px] w-[18px]" />
                  </span>
                  {!collapsed && <span className="font-medium">Log out</span>}
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${collapsed ? "lg:pl-[88px]" : "lg:pl-[220px]"}`}>
          <header className="sticky top-0 z-20 border-b border-cyan-300/10 bg-[linear-gradient(180deg,rgba(6,18,38,0.94),rgba(7,18,35,0.92))] backdrop-blur-xl">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  aria-label="Open sidebar"
                  className="mt-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/85 transition hover:bg-white/10 lg:hidden"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-[18px] w-[18px]" />
                </button>

                <div className="min-w-0 flex-1">
                  <NextLevelHeader
                    title={pageTitle}
                    subtitle={subtitle || "Aurora platform workspace"}
                    userName={userName}
                  />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
