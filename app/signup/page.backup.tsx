"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!acceptedTerms) {
      setError("Please confirm you have read and agree to the Terms & Conditions and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: fullName,
            accepted_terms: true,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      const newUserId = data.user?.id;

      if (newUserId) {
        await supabase.from("profiles").upsert(
          {
            id: newUserId,
            email,
            full_name: fullName,
            role: "member",
            accepted_terms_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }

      router.push("/auth/check-email");
    } catch {
      setError("Something went wrong while creating your account.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(10,132,255,0.20),_transparent_35%),linear-gradient(180deg,#020817_0%,#06142b_35%,#0b2457_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden rounded-[36px] border border-cyan-400/15 bg-white/[0.04] p-10 shadow-[0_0_80px_rgba(37,99,235,0.18)] lg:block">
            <p className="text-xs uppercase tracking-[0.38em] text-cyan-300/85">
              Aurora Growth
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-tight text-white">
              Build your account and choose your Aurora plan
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Create your account, confirm your email, then select the membership
              level that fits your Aurora workflow.
            </p>

            <div className="mt-10 space-y-4">
              {[
                "Create your Aurora account",
                "Confirm your email securely",
                "Log in and choose Core, Pro, or Elite",
                "See your plan and renewal details inside the dashboard",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  <span className="text-sm text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] border border-cyan-400/15 bg-white/[0.04] p-8 shadow-[0_0_80px_rgba(37,99,235,0.18)] sm:p-10">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/85">
                Sign up
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Create your Aurora account
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                After signup, we will send you an email confirmation link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="Paul Rudland"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="Create a secure password"
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950/50"
                />
                <span className="text-sm leading-6 text-slate-300">
                  I have read and agree to the{" "}
                  <Link href="/terms" className="text-cyan-300 hover:text-cyan-200">
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-cyan-300 hover:text-cyan-200">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              {error && (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#06b6d4_0%,#3b82f6_50%,#d946ef_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(59,130,246,0.35)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-cyan-300 hover:text-cyan-200">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
