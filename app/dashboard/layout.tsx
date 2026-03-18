import type { ReactNode } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardShell
      title="Investments"
      subtitle="Aurora platform workspace"
      userName="paulrudland"
    >
      {children}
    </DashboardShell>
  );
}
