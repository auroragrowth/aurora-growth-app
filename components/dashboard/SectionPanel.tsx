import { ReactNode } from "react";

export default function SectionPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[30px] border border-cyan-400/12 bg-[linear-gradient(180deg,rgba(4,14,28,0.76),rgba(5,15,31,0.56))] shadow-[0_20px_80px_rgba(0,0,0,0.18)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(61,187,255,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(110,92,255,0.08),transparent_24%)]" />
      <div className="relative">{children}</div>
    </section>
  );
}
