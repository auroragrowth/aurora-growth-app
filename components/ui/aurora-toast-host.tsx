"use client";

import { useEffect, useState } from "react";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

function toneClasses(tone: ToastTone) {
  if (tone === "success") {
    return "border-emerald-400/30 bg-emerald-500/12 text-emerald-100";
  }
  if (tone === "error") {
    return "border-rose-400/30 bg-rose-500/12 text-rose-100";
  }
  return "border-cyan-400/30 bg-cyan-500/12 text-cyan-100";
}

export default function AuroraToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const custom = event as CustomEvent<ToastItem>;
      const detail = custom.detail;
      if (!detail?.id) return;

      setToasts((prev) => [...prev, detail]);

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== detail.id));
      }, 2800);
    }

    window.addEventListener("aurora:toast", onToast as EventListener);
    return () => {
      window.removeEventListener("aurora:toast", onToast as EventListener);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            "pointer-events-auto overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_16px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl",
            "animate-[auroraToastIn_240ms_ease-out]",
            toneClasses(toast.tone),
          ].join(" ")}
        >
          <div className="text-sm font-semibold tracking-wide">{toast.title}</div>
          {toast.description ? (
            <div className="mt-1 text-xs text-white/75">{toast.description}</div>
          ) : null}
        </div>
      ))}

      <style jsx global>{`
        @keyframes auroraToastIn {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
