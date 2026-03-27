import "./globals.css";
import type { Metadata } from "next";
import { WatchlistProvider } from "@/components/watchlist/WatchlistProvider";
import AuroraToastHost from "@/components/ui/aurora-toast-host";

export const metadata: Metadata = {
  title: "Aurora Growth",
  description: "Aurora Growth Platform",
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
        <WatchlistProvider>{children}<AuroraToastHost />
        </WatchlistProvider>
      </body>
    </html>
  );
}