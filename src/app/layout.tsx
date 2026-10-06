import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const lemonMilk = localFont({
  src: "../../public/asset/fonts/LEMONMILK-Medium.otf",
  variable: "--font-lemon-milk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://touchlineai.site"),
  title: {
    default: "Touchline AI | FPL Assistant & Live Matchday Tracker",
    template: "%s | Touchline AI",
  },
  description:
    "Advanced Fantasy Premier League companion app featuring live matchday rank deltas, Top 10k EO badges, transfer planner, and mini-league tracking.",
  keywords: [
    "FPL",
    "Fantasy Premier League",
    "LiveFPL",
    "FPL Planner",
    "Top 10k EO",
    "Touchline AI",
  ],
  openGraph: {
    title: "Touchline AI | Smarter FPL Matchday & Transfer Planner",
    description:
      "Track live rank deltas, mini-league differentials, and model-driven transfer plans in real-time.",
    url: "https://touchlineai.site",
    siteName: "Touchline AI",
    images: [
      {
        url: "/asset/image/TAI_preview.jpg",
        width: 1200,
        height: 630,
        alt: "Touchline AI - FPL Assistant & Live Matchday Tracker",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Touchline AI | FPL Assistant",
    description:
      "Track live rank deltas and plan FPL transfers with real-time stats.",
    images: ["/asset/image/TAI_preview.jpg"],
  },
  appleWebApp: {
    capable: true,
    title: "Touchline AI",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/asset/image/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/asset/image/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/asset/image/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/asset/image/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "android-chrome-192x192", url: "/icon-192x192.png" },
      { rel: "android-chrome-512x512", url: "/icon-512x512.png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#070908",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/asset/image/favicon.ico" sizes="any" />
        <link rel="icon" href="/asset/image/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/asset/image/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/asset/image/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/asset/image/site.webmanifest" />
      </head>
      <body className={`${lemonMilk.variable} bg-[#070908] text-[#F1F3EF] min-h-screen antialiased selection:bg-[#16C784]/20 selection:text-[#16C784] flex justify-center`}>
        <main className="w-full max-w-4xl mx-auto flex flex-col min-h-screen h-screen overflow-hidden bg-[#070908] relative border-x border-[#1E2421]">
          {children}
        </main>
      </body>
    </html>
  );
}
