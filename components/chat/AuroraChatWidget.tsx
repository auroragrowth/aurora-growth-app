"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Minus, Send, Sparkles } from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────── */

type Message = {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
};

/* ─── Constants ───────────────────────────────────────────────── */

const SUGGESTED_QUESTIONS = [
  "How does the investment ladder work?",
  "What does the Aurora score mean?",
  "How do I set up Telegram alerts?",
  "How do I read the scanner results?",
  "What is the reference price?",
];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ─── Component ───────────────────────────────────────────────── */

export default function AuroraChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => generateId());
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opening
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            sessionId,
            history,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(
            res.status === 429
              ? "Aurora Assistant is resting. Please try again in a few minutes."
              : data.error || "Something went wrong."
          );
          return;
        }

        const assistantMsg: Message = {
          id: generateId(),
          role: "model",
          content: data.response || data.message || "Sorry, I could not generate a response.",
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setError("Failed to connect. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, sessionId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (q: string) => {
    sendMessage(q);
  };

  /* ── Closed bubble ─────────────────────────────────────────── */
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group fixed bottom-6 right-[14px] z-[9980] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 shadow-[0_8px_30px_rgba(34,211,238,0.25)] transition-all hover:scale-110 hover:shadow-[0_8px_40px_rgba(34,211,238,0.4)]"
        title="Ask Aurora anything"
      >
        <Sparkles className="h-6 w-6 text-white" />

        {/* Tooltip */}
        <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-[rgba(8,20,42,0.95)] px-3 py-1.5 text-xs font-medium text-white/80 opacity-0 shadow-lg transition group-hover:opacity-100">
          Ask Aurora anything
        </span>
      </button>
    );
  }

  /* ── Minimized bar ─────────────────────────────────────────── */
  if (minimized) {
    return (
      <div className="fixed bottom-6 right-[14px] z-[9980] flex items-center gap-2 rounded-full border border-cyan-400/20 bg-[rgba(8,20,42,0.95)] px-4 py-2 shadow-[0_15px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <Sparkles className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-medium text-white/80">Aurora Assistant</span>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="ml-2 rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white/70"
          title="Expand"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setMinimized(false); }}
          className="rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white/70"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  /* ── Open panel ────────────────────────────────────────────── */
  return (
    <div
      className="fixed bottom-6 right-[14px] z-[9980] flex w-[380px] flex-col overflow-hidden rounded-2xl border border-cyan-400/20 shadow-[0_25px_70px_rgba(0,0,0,0.5),0_0_40px_rgba(34,211,238,0.06)] backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{
        height: "520px",
        background: "linear-gradient(135deg, rgba(8,20,42,0.98) 0%, rgba(12,28,56,0.98) 100%)",
      }}
    >
      {/* Gradient border top */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-violet-400/20">
            <Sparkles className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{"\u2726"} Aurora Assistant</div>
            <div className="text-[10px] text-white/40">Ask me anything about Aurora</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/35 transition hover:bg-white/10 hover:text-white/60"
            title="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setMinimized(false); }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/35 transition hover:bg-white/10 hover:text-white/60"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Welcome message */}
        {messages.length === 0 && !loading && (
          <div className="space-y-3">
            <div className="rounded-xl bg-white/[0.04] border border-white/6 px-3.5 py-3">
              <p className="text-sm text-white/70">
                Hi! I&apos;m your Aurora Assistant. I can help you understand the platform, explain features, or guide you through getting started.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest text-white/25 px-1">
                Suggested questions
              </div>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSuggestion(q)}
                  className="block w-full rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-left text-xs text-white/60 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.04] hover:text-white/80"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/15 border border-cyan-400/15 text-white/90"
                  : "bg-white/[0.04] border border-white/6 text-white/75"
              }`}
            >
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-white/[0.04] border border-white/6 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400/60" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400/60" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400/60" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-3.5 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-white/8 px-3 py-3"
      >
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Aurora anything..."
            maxLength={1000}
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/30 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-950 transition hover:brightness-110 disabled:opacity-30"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Simple markdown-ish renderer ────────────────────────────── */

function MessageContent({ content }: { content: string }) {
  if (!content) return null;
  // Split into paragraphs, render bold (**text**) and line breaks
  const paragraphs = content.split("\n\n");

  return (
    <div className="space-y-2">
      {paragraphs.map((para, i) => {
        const lines = para.split("\n");
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string) {
  // Handle **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white/90">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
