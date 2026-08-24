import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Touchline AI | FPL Assistant & Captaincy Advisor",
  description:
    "Next-generation Fantasy Premier League AI companion with live pitch tracker, deep RAG statistical models, and captaincy simulations.",
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
      { rel: "android-chrome-192x192", url: "/asset/image/android-chrome-192x192.png" },
      { rel: "android-chrome-512x512", url: "/asset/image/android-chrome-512x512.png" },
    ],
  },
  manifest: "/asset/image/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
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
      <body className="bg-black text-neutral-100 min-h-screen antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        <main className="min-h-screen flex flex-col items-center justify-start bg-black">
          <div className="w-full max-w-md min-h-screen bg-black border-x border-white/[0.04] shadow-2xl relative flex flex-col">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
