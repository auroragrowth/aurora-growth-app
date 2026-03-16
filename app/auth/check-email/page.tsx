import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(10,132,255,0.20),_transparent_35%),linear-gradient(180deg,#020817_0%,#06142b_35%,#0b2457_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-10">
        <div className="w-full rounded-[36px] border border-cyan-400/15 bg-white/[0.04] p-10 text-center shadow-[0_0_80px_rgba(37,99,235,0.18)]">
          <p className="text-xs uppercase tracking-[0.38em] text-cyan-300/85">
            Check your email
          </p>

          <h1 className="mt-4 text-4xl font-semibold text-white">
            Confirm your Aurora account
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">
            We have sent you a confirmation email. Open it and click the verification
            link. Once confirmed, you can return to the login page and sign in.
          </p>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-slate-950/35 p-6 text-left">
            <div className="space-y-3 text-sm text-slate-300">
              <p>1. Open your inbox</p>
              <p>2. Find the Aurora confirmation email</p>
              <p>3. Click the confirmation link</p>
              <p>4. Log in and choose your plan</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"
            >
              Go to login
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Back to sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
