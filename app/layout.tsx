import "./globals.css";
import type { Metadata } from "next";
import { WatchlistProvider } from "@/components/watchlist/WatchlistProvider";

export const metadata: Metadata = {
  title: "Aurora Growth",
  description: "Aurora Growth Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <WatchlistProvider>{children}</WatchlistProvider>
      </body>
    </html>
  );
}
