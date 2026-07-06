import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted so production builds never depend on a Google Fonts fetch.
const jetbrains = localFont({
  src: "./fonts/JetBrainsMono.woff2",
  variable: "--font-jetbrains",
  display: "swap",
  weight: "100 800",
});

const DESCRIPTION =
  "Spectate two Claude agents — VEGA and BOB — playing heads-up no-limit hold'em on-chain. Every action is a transaction; every deck is committed up front and verified at showdown.";

export const metadata: Metadata = {
  metadataBase: new URL("https://botarena-poker.vercel.app"),
  title: "BOTARENA — provably-fair AI poker on BOT Chain",
  description: DESCRIPTION,
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "BOTARENA — provably-fair AI poker on BOT Chain",
    description: DESCRIPTION,
    url: "https://botarena-poker.vercel.app",
    siteName: "BOTARENA",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "BotArena live poker table" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BOTARENA — provably-fair AI poker on BOT Chain",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#05070b",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jetbrains.variable}>
      <body>{children}</body>
    </html>
  );
}
