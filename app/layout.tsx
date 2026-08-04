import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "polyflow-language.vercel.app"}`),
  title: "LinguaThread · How Language Is Built",
  description: "A contemplative language practice built through language stacking, structure, and meaningful use.",
  openGraph: {
    title: "LinguaThread · How Language Is Built",
    description: "A contemplative language practice built through language stacking, structure, and meaningful use.",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "LinguaThread · How Language Is Built" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinguaThread · How Language Is Built",
    description: "A contemplative language practice built through language stacking, structure, and meaningful use.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1412" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
