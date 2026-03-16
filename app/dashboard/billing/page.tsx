"use client"

import Link from "next/link"

export default function BillingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="max-w-xl text-center p-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        
        <h1 className="text-3xl font-semibold mb-4">
          🎉 Subscription successful
        </h1>

        <p className="text-white/70 mb-8">
          Your Aurora membership is now active.
        </p>

        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium"
        >
          Go to Dashboard
        </Link>

      </div>
    </div>
  )
}
