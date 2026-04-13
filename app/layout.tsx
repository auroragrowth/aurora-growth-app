import { ThemeProvider } from '@/components/theme/ThemeProvider'
import "./globals.css";
import type { Metadata } from "next";
import { WatchlistProvider } from "@/components/watchlist/WatchlistProvider";
import AuroraToastHost from "@/components/ui/aurora-toast-host";
import CookieBanner from "@/components/compliance/CookieBanner";

export const metadata: Metadata = {
  title: "Aurora Growth Academy",
  description: "Aurora Growth Academy Platform",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ThemeProvider>
          <WatchlistProvider>{children}<AuroraToastHost />
          <CookieBanner />
          </WatchlistProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}