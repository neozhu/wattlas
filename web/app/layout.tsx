import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Sans_Condensed,
} from "next/font/google";

import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-plex-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  applicationName: "Wattlas",
  title: "Wattlas | Global Energy Infrastructure Map",
  description:
    "Explore global energy demand, power generation, infrastructure projects and regional electricity opportunities on one monthly-refreshed interactive map.",
  openGraph: {
    title: "Wattlas | Global Energy Infrastructure Map",
    description:
      "Explore energy demand, generation capacity and infrastructure opportunities across countries and regions worldwide.",
    siteName: "Wattlas",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Wattlas | Global Energy Infrastructure Map",
    description:
      "Explore energy demand, generation capacity and infrastructure opportunities across countries and regions worldwide.",
  },
};

export const viewport: Viewport = {
  themeColor: "#167C68",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexCondensed.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
      {measurementId && <GoogleAnalytics gaId={measurementId} />}
    </html>
  );
}
