import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "sonner";
import {
  DM_Sans,
  Great_Vibes,
  Noto_Sans_Ethiopic,
  Geist,
} from "next/font/google";
import MaintenanceScreen from "@/components/maintenance-screen";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/bottom-nav";
import Provider from "@/providers/providers";
import { getLocale, getMessages } from "next-intl/server";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-dm-sans",
  display: "swap",
});

const notoEthiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ethiopic",
  display: "swap",
});

const _greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-great-vibes",
});

export const metadata: Metadata = {
  title: "Mella Bingo ",
  description: "Created with bingo lovers in mind.",
  authors: [{ name: "Bingo Devs", url: "https://bingo.example.com" }],
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const maintenanceMode = false;

  let locale = "en";

  let messages: Awaited<ReturnType<typeof getMessages>> | null = null;

  if (!maintenanceMode) {
    const [resolvedLocale, resolvedMessages] = await Promise.all([
      getLocale(),
      getMessages(),
    ]);
    locale = resolvedLocale;
    messages = resolvedMessages;
  }

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        dmSans.variable,
        notoEthiopic.variable,
        _greatVibes.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={` font-dm-sans font-mono bg-black  antialiased flex flex-col justify-start items-center text-foreground`}
      >
        <Provider locale={locale} messages={messages!}>
          {maintenanceMode ? (
            <MaintenanceScreen />
          ) : (
            <main className="">
              <Toaster
                position="top-center"
                richColors
                closeButton
                theme="dark"
              />
              <div className="relative min-w-screen sm:min-w-100 p-2 w-full max-w-110! min-h-screen overflow-hidden max-h-screen flex flex-col bg-background shadow-2xl">
                <div className="w-full flex flex-col flex-1 justify-start overflow-y-auto pb-32">
                  {children}
                </div>
                <BottomNav />
              </div>
            </main>
          )}
        </Provider>
      </body>
    </html>
  );
}
