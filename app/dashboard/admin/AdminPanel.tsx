"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SystemOverview from "./SystemOverview";
import ServerGauges from "./ServerGauges";

/* ────────────────────────────────────────
   Types
──────────────────────────────────────── */

type User = {
  id: string;
  email: string | null;
  first_name: string | null;
  full_name: string | null;
  plan_key: string | null;
  subscription_status: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  telegram_connected: boolean;
  trading212_connected: boolean;
  created_at: string | null;
  last_login_at: string | null;
};

type Tab = "overview" | "users" | "email" | "system";

/* ────────────────────────────────────────
   Helpers
──────────────────────────────────────── */

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtShortDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short" });
}

function planBadge(plan?: string | null) {
  const p = (plan || "").toLowerCase();
  if (p === "elite") return "bg-purple-500/15 border-purple-500/25 text-purple-300";
  if (p === "pro") return "bg-cyan-500/15 border-cyan-500/25 text-cyan-300";
  if (p === "core") return "bg-green-500/15 border-green-500/25 text-green-300";
  return "bg-white/5 border-white/10 text-white/30";
}

function statusDot(status?: string | null) {
  if (status === "active") return "bg-green-400";
  if (status === "trialing") return "bg-cyan-400";
  if (status === "past_due") return "bg-amber-400";
  return "bg-white/20";
}

/* ────────────────────────────────────────
   Quick Stats (server-rendered feel)
──────────────────────────────────────── */

function QuickStats({ users }: { users: User[] }) {
  const total = users.length;
  const active = users.filter((u) => u.subscription_status === "active").length;
  const telegram = users.filter((u) => u.telegram_connected).length;
  const t212 = users.filter((u) => u.trading212_connected).length;
  const suspended = users.filter((u) => u.is_suspended).length;
  const elite = users.filter((u) => u.plan_key === "elite").length;
  const pro = users.filter((u) => u.plan_key === "pro").length;
  const core = users.filter((u) => u.plan_key === "core").length;

  const cards = [
    { label: "Total Users", value: total, color: "text-white" },
    { label: "Active Subs", value: active, color: "text-green-400" },
    { label: "Elite", value: elite, color: "text-purple-400" },
    { label: "Pro", value: pro, color: "text-cyan-400" },
    { label: "Core", value: core, color: "text-green-400" },
    { label: "Telegram", value: telegram, color: "text-blue-400" },
    { label: "T212", value: t212, color: "text-fuchsia-400" },
    { label: "Suspended", value: suspended, color: suspended > 0 ? "text-red-400" : "text-white/20" },
  ];

  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl bg-white/[0.03] border border-white/8 p-3 text-center">
          <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          <p className="text-white/30 text-[10px] mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────
   User Management Tab
──────────────────────────────────────── */

function UsersTab({
  users,
  onAction,
  actionLoading,
}: {
  users: User[];
  onAction: (action: string, userId: string, extra?: Record<string, string>) => Promise<void>;
  actionLoading: string | null;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended" | "no_plan">("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [planSelect, setPlanSelect] = useState<Record<string, string>>({});

  const filtered = users.filter((u) => {
    if (filter === "active") return u.subscription_status === "active";
    if (filter === "suspended") return u.is_suspended;
    if (filter === "no_plan") return !u.plan_key || u.subscription_status !== "active";
    return true;
  }).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/40"
        />
        <div className="flex gap-1.5">
          {(["all", "active", "suspended", "no_plan"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                filter === f
                  ? "bg-cyan-400/20 border border-cyan-400/30 text-cyan-400"
                  : "text-white/30 hover:text-white/60 bg-white/5 border border-white/10"
              }`}
            >
              {f === "all" ? `All (${users.length})` : f === "no_plan" ? "No Plan" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick password reset by email */}
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="Send password reset to email..."
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/40"
        />
        <button
          onClick={async () => {
            if (!resetEmail.trim()) return;
            await onAction("reset_password", "", { email: resetEmail.trim() });
            setResetEmail("");
          }}
          disabled={actionLoading === "reset"}
          className="px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 disabled:opacity-50 whitespace-nowrap"
        >
          Send Reset Link
        </button>
      </div>

      {/* User table */}
      <div className="rounded-2xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.03] text-[10px] uppercase tracking-wider text-white/30">
                <th className="px-3 py-2.5 text-left">User</th>
                <th className="px-3 py-2.5 text-left">Plan</th>
                <th className="px-3 py-2.5 text-left">Status</th>
                <th className="px-3 py-2.5 text-left">Connected</th>
                <th className="px-3 py-2.5 text-left">Joined</th>
                <th className="px-3 py-2.5 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-white/30">
                    No users match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    className={`transition-colors ${
                      user.is_suspended
                        ? "bg-red-500/[0.05]"
                        : expandedUser === user.id
                          ? "bg-white/[0.03]"
                          : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-white truncate max-w-[200px]">
                        {user.email || "—"}
                      </div>
                      <div className="text-white/30 text-xs">
                        {user.full_name || user.first_name || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${planBadge(user.plan_key)}`}>
                        {user.plan_key || "none"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${user.is_suspended ? "bg-red-400" : statusDot(user.subscription_status)}`} />
                        <span className={`text-xs ${user.is_suspended ? "text-red-400 font-bold" : "text-white/50"}`}>
                          {user.is_suspended ? "Suspended" : user.subscription_status || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        {user.telegram_connected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">TG</span>
                        )}
                        {user.trading212_connected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/20">T212</span>
                        )}
                        {!user.telegram_connected && !user.trading212_connected && (
                          <span className="text-white/15 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-white/30 text-xs whitespace-nowrap">
                      {fmtShortDate(user.created_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                          className="px-2 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10"
                        >
                          {expandedUser === user.id ? "Close" : "Manage"}
                        </button>
                      </div>
                      {expandedUser === user.id && (
                        <div className="mt-2 p-3 rounded-xl bg-white/[0.03] border border-white/8 space-y-2">
                          <p className="text-white/20 text-[10px] uppercase tracking-wider font-bold">
                            Actions for {user.email}
                          </p>

                          <button
                            onClick={() => onAction("reset_password", user.id, { email: user.email || "" })}
                            disabled={!!actionLoading}
                            className="w-full py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            Send Password Reset
                          </button>

                          {user.is_suspended ? (
                            <button
                              onClick={() => onAction("unsuspend", user.id)}
                              disabled={!!actionLoading}
                              className="w-full py-1.5 rounded-lg text-xs font-bold bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                            >
                              Unsuspend User
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (confirm(`Suspend ${user.email}? They will not be able to log in.`)) {
                                  onAction("suspend", user.id);
                                }
                              }}
                              disabled={!!actionLoading}
                              className="w-full py-1.5 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              Suspend User
                            </button>
                          )}

                          <div className="flex gap-1.5">
                            <select
                              value={planSelect[user.id] || ""}
                              onChange={(e) => setPlanSelect((p) => ({ ...p, [user.id]: e.target.value }))}
                              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-white outline-none"
                            >
                              <option value="">Set plan...</option>
                              <option value="core">Core</option>
                              <option value="pro">Pro</option>
                              <option value="elite">Elite</option>
                            </select>
                            <button
                              onClick={() => {
                                const plan = planSelect[user.id];
                                if (plan) onAction("set_plan", user.id, { plan });
                              }}
                              disabled={!planSelect[user.id] || !!actionLoading}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50"
                            >
                              Apply
                            </button>
                          </div>

                          <p className="text-white/15 text-[10px]">
                            Last login: {fmtDate(user.last_login_at)}
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────
   Email Tab
──────────────────────────────────────── */

function EmailTab() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/email/send-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim().replace(/,+$/, "").trim(),
          email: email.trim().toLowerCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setResult({ type: "error", message: data?.error?.message || data?.error || "Email failed to send." });
      } else {
        setResult({ type: "success", message: "Onboarding email sent successfully." });
        setFirstName("");
        setEmail("");
      }
    } catch {
      setResult({ type: "error", message: "Something went wrong." });
    }
    setLoading(false);
  }

  return (
    <div className="max-w-lg space-y-5">
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
        <h3 className="text-white font-bold text-sm mb-1">Send Welcome Email</h3>
        <p className="text-white/30 text-xs mb-4">
          Send the Aurora Growth Academy onboarding email to a prospect.
        </p>

        <form onSubmit={handleSend} className="space-y-3">
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/40"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/40"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-400 to-purple-500 text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Welcome Email"}
          </button>
        </form>

        {result && (
          <div
            className={`mt-3 p-3 rounded-xl text-sm ${
              result.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            {result.message}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
        <h3 className="text-white font-bold text-sm mb-1">Email Info</h3>
        <div className="text-white/40 text-xs space-y-1">
          <p>Template: Welcome to Aurora Growth Academy</p>
          <p>From: Aurora Growth &lt;onboarding@auroragrowth.co.uk&gt;</p>
          <p>Onboarding sequence: Days 1-7 auto-sent after signup</p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────
   Main Admin Panel
──────────────────────────────────────── */

export default function AdminPanel({ adminEmail }: { adminEmail: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {}
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleUserAction = useCallback(
    async (action: string, userId: string, extra?: Record<string, string>) => {
      setActionLoading(action);
      try {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, userId, ...extra }),
        });
        const data = await res.json();
        if (data.success) {
          showToast("success", data.message);
          loadUsers();
        } else {
          showToast("error", data.error || "Action failed");
        }
      } catch {
        showToast("error", "Action failed");
      }
      setActionLoading(null);
    },
    [loadUsers, showToast]
  );

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "📊" },
    { key: "users", label: "Users", icon: "👥" },
    { key: "email", label: "Email", icon: "✉️" },
    { key: "system", label: "System", icon: "⚙️" },
  ];

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl text-sm font-bold shadow-xl ${
            toast.type === "success"
              ? "bg-green-500/90 text-white"
              : "bg-red-500/90 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Control Centre</h1>
          <p className="text-white/30 text-sm mt-0.5">
            Signed in as {adminEmail}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white/50 hover:text-white hover:bg-white/10"
          >
            Dashboard
          </Link>
          <button
            onClick={loadUsers}
            disabled={usersLoading}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-50"
          >
            {usersLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Quick stats bar */}
      {users.length > 0 && <QuickStats users={users} />}

      {/* Tabs */}
      <div className="flex gap-1.5 mt-5 mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition ${
              tab === t.key
                ? "bg-cyan-400/15 border border-cyan-400/25 text-cyan-400"
                : "bg-white/[0.03] border border-white/8 text-white/30 hover:text-white/60 hover:bg-white/5"
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Server gauges */}
          <ServerGauges />

          {/* Recent signups */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <h3 className="text-white font-bold text-sm mb-3">Recent Signups</h3>
            <div className="space-y-2">
              {users.slice(0, 8).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${u.is_suspended ? "bg-red-400" : statusDot(u.subscription_status)}`} />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {u.email || "—"}
                      </p>
                      <p className="text-white/25 text-xs">
                        {u.full_name || u.first_name || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${planBadge(u.plan_key)}`}>
                      {u.plan_key || "—"}
                    </span>
                    <span className="text-white/20 text-xs">{fmtShortDate(u.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => setTab("users")}
              className="p-4 rounded-2xl border border-white/8 bg-white/[0.03] text-left hover:bg-white/[0.05] transition"
            >
              <p className="text-lg mb-1">👥</p>
              <p className="text-white font-bold text-sm">Manage Users</p>
              <p className="text-white/30 text-xs mt-0.5">Reset passwords, suspend, change plans</p>
            </button>
            <button
              onClick={() => setTab("email")}
              className="p-4 rounded-2xl border border-white/8 bg-white/[0.03] text-left hover:bg-white/[0.05] transition"
            >
              <p className="text-lg mb-1">✉️</p>
              <p className="text-white font-bold text-sm">Send Email</p>
              <p className="text-white/30 text-xs mt-0.5">Send welcome/onboarding emails</p>
            </button>
            <button
              onClick={() => setTab("system")}
              className="p-4 rounded-2xl border border-white/8 bg-white/[0.03] text-left hover:bg-white/[0.05] transition"
            >
              <p className="text-lg mb-1">⚙️</p>
              <p className="text-white font-bold text-sm">System</p>
              <p className="text-white/30 text-xs mt-0.5">Backups, scanner, logs</p>
            </button>
          </div>
        </div>
      )}

      {tab === "users" && (
        <UsersTab
          users={users}
          onAction={handleUserAction}
          actionLoading={actionLoading}
        />
      )}

      {tab === "email" && <EmailTab />}

      {tab === "system" && <SystemOverview />}
    </>
  );
}
