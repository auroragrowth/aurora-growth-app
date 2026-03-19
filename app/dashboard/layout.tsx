"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { PortfolioProvider } from "@/components/providers/PortfolioProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortfolioProvider>
      <DashboardShell userName="paulrudland">
        {children}
      </DashboardShell>
    </PortfolioProvider>
  );
}
