import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Provider from "@/providers/providers";
import { Toaster } from "sonner";
import { DM_Sans, Great_Vibes, Noto_Sans_Ethiopic } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  authors: [{ name: "Bingo Devs", url: "https://bingo.example.com" }],
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${dmSans.variable} ${notoEthiopic.variable} ${_greatVibes.variable} `}
    >
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={` font-dm-sans font-mono  antialiased flex flex-col justify-start items-center text-foreground`}
      >
        <Provider locale={locale} messages={messages}>
          <Toaster position="top-center" richColors closeButton theme="dark" />
          <div className="relative w-full    min-h-screen overflow-hidden max-h-screen  flex flex-col  bg-background ">
            <div className={`   w-full flex flex-col flex-1   justify-start  `}>
              {children}
            </div>
          </div>
        </Provider>
      </body>
    </html>
  );
}
