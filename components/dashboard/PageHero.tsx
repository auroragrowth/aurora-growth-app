import { ReactNode } from "react";

export default function PageHero({
  eyebrow = "Aurora Growth",
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(5,16,31,0.78),rgba(5,16,31,0.55))] px-6 py-7 md:px-8 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(85,185,255,0.16),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(123,92,255,0.10),transparent_28%)]" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 text-xs uppercase tracking-[0.35em] text-cyan-300/85">
            {eyebrow}
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            <span className="bg-[linear-gradient(90deg,#78e9ff_0%,#75b7ff_45%,#b985ff_100%)] bg-clip-text text-transparent">
              {title}
            </span>
          </h1>

          {description ? (
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300/90 md:text-lg">
              {description}
            </p>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </section>
  );
}
