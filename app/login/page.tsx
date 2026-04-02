"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(searchParams.get("error") || "");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Always go through post-login to check plan / onboarding state
      router.push("/auth/post-login");
    } catch (err) {
      console.error(err);
      setError("Something went wrong logging in.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || "https://app.auroragrowth.co.uk";

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setError("Unable to complete Google login");
      setGoogleLoading(false);
    } catch (err) {
      console.error(err);
      setError("Unable to complete Google login");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_24%),linear-gradient(180deg,#020617_0%,#03122b_45%,#071b46_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-16">
        <div className="grid w-full max-w-5xl gap-8 md:grid-cols-2">
          <div className="rounded-[32px] border border-cyan-400/20 bg-white/[0.04] p-10 shadow-[0_0_80px_rgba(37,99,235,0.18)] backdrop-blur-xl">
            <div className="mb-6">
              <Image
                src="/aurora-logo.png"
                alt="Aurora Growth"
                width={190}
                height={48}
                priority
                className="h-auto w-auto"
              />
            </div>

            <p className="text-xs uppercase tracking-[0.38em] text-cyan-300/85">
              Aurora Growth
            </p>

            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white md:text-5xl">
              Welcome back to Aurora
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Sign in to continue to your dashboard. New users without a plan
              will be taken to plan selection after login.
            </p>
          </div>

          <div className="rounded-[32px] border border-cyan-400/20 bg-white/[0.04] p-10 shadow-[0_0_80px_rgba(37,99,235,0.18)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.38em] text-cyan-300/85">
              Log in
            </p>

            <h2 className="mt-4 text-3xl font-semibold text-white">
              Sign in to your account
            </h2>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-4 text-base font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.653 32.657 29.23 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.682 0-14.347 4.337-17.694 10.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.144 35.091 26.671 36 24 36c-5.209 0-9.617-3.321-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              {googleLoading ? "Connecting to Google..." : "Continue with Google"}
            </button>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-sm text-slate-400">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-full border border-white/10 bg-[#06122b] px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full rounded-full border border-white/10 bg-[#06122b] px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-4 text-lg font-medium text-white shadow-[0_12px_40px_rgba(59,130,246,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Log in"}
              </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <Link
                href="/forgot-password"
                className="text-white/40 text-sm hover:text-white/60 transition-colors"
              >
                Forgot password?
              </Link>

              <p className="text-white/40 text-sm">
                Need an account?{' '}
                <Link href="/signup" className="text-cyan-400 hover:underline">
                  Sign up
                </Link>
              </p>

              <p className="text-white/20 text-xs">
                Aurora Growth v1.3.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
