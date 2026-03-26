"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (!password) {
    return { label: "", width: "0%", barClass: "bg-white/10", textClass: "text-slate-400" };
  }

  if (score <= 2) {
    return { label: "Weak", width: "33%", barClass: "bg-red-400", textClass: "text-red-300" };
  }

  if (score <= 4) {
    return { label: "Medium", width: "66%", barClass: "bg-amber-400", textClass: "text-amber-300" };
  }

  return { label: "Strong", width: "100%", barClass: "bg-emerald-400", textClass: "text-emerald-300" };
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!agree) {
      setError("Please agree to the Terms & Conditions and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || window.location.origin;

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: {
            full_name: fullName,
            phone: phone || undefined,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Store phone in profiles via a server action would be ideal, but
      // Supabase's auth trigger will handle profile creation from user_metadata.
      // Redirect to check-email page.
      router.push("/auth/check-email");
    } catch (err) {
      setError("Something went wrong creating your account.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || window.location.origin;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
      }
    } catch (err) {
      setError("Unable to start Google sign up.");
      console.error(err);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_24%),linear-gradient(180deg,#020617_0%,#03122b_45%,#071b46_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-16">
        <div className="grid w-full max-w-5xl gap-8 md:grid-cols-2">
          {/* Left panel */}
          <div className="rounded-[32px] border border-cyan-400/20 bg-white/[0.04] p-10 shadow-[0_0_80px_rgba(37,99,235,0.18)] backdrop-blur-xl">
            <div className="mb-8">
              <Image
                src="/aurora-logo.png"
                alt="Aurora Growth"
                width={190}
                height={52}
                priority
                className="h-auto w-auto"
              />
            </div>

            <p className="text-xs uppercase tracking-[0.38em] text-cyan-300/85">
              Aurora Growth
            </p>

            <h1 className="mt-6 text-5xl font-semibold leading-tight text-white">
              Build your account
              <br />
              and choose your
              <br />
              Aurora plan
            </h1>

            <p className="mt-8 max-w-xl text-lg leading-8 text-slate-300">
              Create your account, confirm your email, then select the
              membership level that fits your Aurora workflow.
            </p>

            <div className="mt-10 space-y-4">
              {[
                "Create your Aurora account",
                "Confirm your email securely",
                "Log in and choose Core, Pro, or Elite",
                "See your plan and renewal details inside the dashboard",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-4 rounded-full border border-white/8 bg-slate-950/40 px-5 py-4 text-slate-200"
                >
                  <span className="h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.85)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — form */}
          <div className="rounded-[32px] border border-cyan-400/20 bg-white/[0.04] p-10 shadow-[0_0_80px_rgba(37,99,235,0.18)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.38em] text-cyan-300/85">
              Sign up
            </p>

            <h2 className="mt-4 text-3xl font-semibold text-white">
              Create your Aurora account
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-300">
              After signup we will send you a confirmation link.
            </p>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={googleLoading}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-4 text-base font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.651 32.657 29.24 36 24 36c-6.627 0-12-5.373-12-12S17.373 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.009 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.682 0-14.347 4.337-17.694 10.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.191-5.238C29.143 35.091 26.715 36 24 36c-5.219 0-9.617-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.793 2.237-2.231 4.166-4.085 5.571l.003-.002 6.191 5.238C36.971 38.48 44 33 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              {googleLoading ? "Connecting Google..." : "Sign up with Google"}
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-sm text-slate-400">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label className="mb-3 block text-sm font-medium text-white">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="John Smith"
                  className="w-full rounded-full border border-white/10 bg-slate-950/50 px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-white">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-full border border-white/10 bg-slate-950/50 px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-white">
                  Phone{" "}
                  <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44 7700 000000"
                  className="w-full rounded-full border border-white/10 bg-slate-950/50 px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-white">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a secure password"
                  className="w-full rounded-full border border-white/10 bg-slate-950/50 px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                />

                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.barClass}`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className={passwordStrength.textClass}>
                      {passwordStrength.label
                        ? `Password strength: ${passwordStrength.label}`
                        : "Password strength"}
                    </span>
                    <span className="text-slate-500">8+ chars, mixed case, number, symbol</span>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-slate-950/40 px-4 py-4 text-slate-300">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                />
                <span className="leading-7">
                  I have read and agree to the{" "}
                  <Link href="/terms" className="text-white underline underline-offset-4">
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-white underline underline-offset-4">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#3b82f6_50%,#d946ef_100%)] px-6 py-4 text-lg font-medium text-white shadow-[0_12px_40px_rgba(59,130,246,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="text-white transition hover:text-cyan-300">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
