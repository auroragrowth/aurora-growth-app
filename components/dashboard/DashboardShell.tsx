"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ScanSearch,
  Star,
  BriefcaseBusiness,
  Calculator,
  LineChart,
  Activity,
  Link2,
  CreditCard,
  User,
  LogOut,
  Menu,
  ChevronDown,
} from "lucide-react";

type DashboardShellProps = {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  lastLogin?: string | null;
  joinDate?: string | null;
  planName?: string;
  brokerStatus?: string;
  brokerConnected?: boolean;
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
  { label: "Calculator", href: "/dashboard/investments/calculator", icon: Calculator },
  { label: "Chart", href: "/dashboard/chart", icon: LineChart },
  { label: "Investments", href: "/dashboard/investments", icon: BriefcaseBusiness },
  { label: "Volatility Compass", href: "/dashboard/volatility", icon: Activity },
  { label: "Connections", href: "/dashboard/connections", icon: Link2 },
  { label: "Upgrade Plan", href: "/dashboard/upgrade", icon: CreditCard },
  { label: "Account", href: "/dashboard/account", icon: User },
];

function formatLastLogin(value?: string | null) {
  if (!value) return "No login data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No login data";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replace(",", " at ");
}

function getInitials(name: string, email: string) {
  const source = name?.trim() || email?.trim() || "U";
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 1).toUpperCase();
}

function getFirstName(name: string, email: string) {
  const clean = name?.trim();
  if (clean) return clean.split(" ")[0];
  const mail = email?.split("@")[0] || "User";
  return mail.charAt(0).toUpperCase() + mail.slice(1);
}

function getPageTitle(pathname: string) {
  if (pathname === "/dashboard") return "Dashboard";
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
  userName,
  userEmail,
  lastLogin,
  joinDate,
  planName = "Aurora Free",
  brokerStatus: initialBrokerStatus = "Disconnected",
  brokerConnected: initialBrokerConnected = false,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const [brokerStatus, setBrokerStatus] = useState(initialBrokerStatus);
  const [brokerConnected, setBrokerConnected] = useState(initialBrokerConnected);

  const refreshBrokerStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/connections/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const isConnected = !!data.trading212?.is_connected;
      setBrokerConnected(isConnected);
      setBrokerStatus(isConnected ? "Connected" : "Disconnected");
    } catch {
      // keep current status on error
    }
  }, []);

  useEffect(() => {
    refreshBrokerStatus();
  }, [pathname, refreshBrokerStatus]);

  useEffect(() => {
    const handler = () => refreshBrokerStatus();
    window.addEventListener("aurora:broker-connected", handler);
    return () => window.removeEventListener("aurora:broker-connected", handler);
  }, [refreshBrokerStatus]);

  const firstName = useMemo(() => getFirstName(userName, userEmail), [userName, userEmail]);
  const initials = useMemo(() => getInitials(userName, userEmail), [userName, userEmail]);
  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);

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
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
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
            <div className="mx-auto flex h-[76px] w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Open sidebar"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/85 transition hover:bg-white/10 lg:hidden"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-[18px] w-[18px]" />
                </button>

                <div>
                  <div className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-[1.28rem] font-semibold tracking-tight text-transparent sm:text-[1.45rem]">
                    {pageTitle}
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/42">
                    Aurora platform workspace
                  </div>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                {joinDate && (
                  <div className="hidden rounded-full border border-violet-300/18 bg-violet-400/10 px-3 py-2 text-xs font-medium text-violet-100 2xl:flex items-center gap-1.5">
                    🚀 Aurora User since {new Date(joinDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                  </div>
                )}

                <div className={`hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium xl:flex ${
                  brokerConnected
                    ? "border-emerald-300/18 bg-emerald-400/10 text-emerald-100"
                    : "border-rose-300/18 bg-rose-400/10 text-rose-100"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${
                    brokerConnected
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                      : "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]"
                  }`} />
                  {brokerStatus}
                </div>

                <div className="hidden rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs font-medium text-white/88 lg:block">
                  {planName}
                </div>

                <div ref={profileRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((v) => !v)}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 pr-3 transition hover:bg-white/10"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(61,209,255,.24),rgba(112,91,255,.20))] text-sm font-semibold text-white ring-1 ring-white/10 shadow-[0_0_20px_rgba(87,211,243,0.12)]">
                      {initials}
                    </div>

                    <div className="hidden text-left md:block">
                      <div className="text-sm font-semibold text-white">{firstName}</div>
                      <div className="text-[11px] text-white/50">
                        Last login: {formatLastLogin(lastLogin)}
                      </div>
                    </div>

                    <ChevronDown className="h-4 w-4 text-white/55" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-[calc(100%+10px)] w-[250px] rounded-3xl border border-cyan-300/10 bg-[#091425]/95 p-3 shadow-2xl backdrop-blur-xl">
                      <div className="mb-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                        <div className="text-sm font-semibold text-white">{userName || firstName}</div>
                        <div className="truncate text-xs text-white/45">{userEmail}</div>
                      </div>

                      <div className="space-y-1.5">
                        <Link
                          href="/dashboard/account"
                          className="block rounded-2xl px-3 py-2.5 text-sm text-white/78 transition hover:bg-white/6 hover:text-white"
                        >
                          Account
                        </Link>

                        <Link
                          href="/dashboard/upgrade"
                          className="block rounded-2xl px-3 py-2.5 text-sm text-white/78 transition hover:bg-white/6 hover:text-white"
                        >
                          Upgrade Plan
                        </Link>

                        <form action="/auth/signout" method="post">
                          <button
                            type="submit"
                            className="block w-full rounded-2xl px-3 py-2.5 text-left text-sm text-red-200 transition hover:bg-red-400/10 hover:text-red-100"
                          >
                            Log out
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
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
