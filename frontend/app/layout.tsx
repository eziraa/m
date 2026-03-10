import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Mella Bingo Mini App",
  description: "Telegram Mini App for Mella Bingo",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="app-body bg-[#020815]">{children}</body>
    </html>
  );
}
