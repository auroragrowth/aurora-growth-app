"use client";

import { useState } from "react";

export default function EmailSendPage() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/email/send-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: firstName.trim().replace(/,+$/, '').trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        setResult({
          type: "error",
          message:
            data?.error?.message ||
            data?.error ||
            "Email failed to send.",
        });
        return;
      }

      setResult({
        type: "success",
        message: "Onboarding email sent successfully.",
      });

      setFirstName("");
      setEmail("");
    } catch (error) {
      setResult({
        type: "error",
        message: "Something went wrong while sending the email.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(36,215,238,0.12),transparent_20%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_20%),linear-gradient(180deg,#020617_0%,#04101f_35%,#020617_100%)] px-4 py-6 text-white">
      <div className="mx-auto max-w-xl">
        <div className="mb-5 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
          <div className="mb-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">
            Aurora admin
          </div>
          <h1 className="text-3xl font-semibold leading-tight">
            Send Aurora welcome email
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Use this page on your phone to send the onboarding email to anyone
            who has shown interest.
          </p>
        </div>

        <form
          onSubmit={handleSend}
          className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="firstName"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                First name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Paul"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-full bg-[linear-gradient(90deg,#24d7ee,#8b5cf6)] px-5 py-4 text-base font-bold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send welcome email"}
            </button>
          </div>

          {result && (
            <div
              className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${
                result.type === "success"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-rose-400/30 bg-rose-400/10 text-rose-200"
              }`}
            >
              {result.message}
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm leading-6 text-slate-300">
            Sends: <span className="font-medium text-white">Welcome to Aurora Growth Academy</span>
            <br />
            From the: <span className="font-medium text-white">Aurora Growth Academy Onboarding Team</span>
          </div>
        </form>
      </div>
    </main>
  );
}
