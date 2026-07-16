import type { Metadata } from "next";
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
  metadataBase: new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "polyflow.vercel.app"}`),
  title: "PolyFlow · Language, made yours",
  description: "A contemplative language practice built on vocabulary, structure, and meaningful use.",
  openGraph: {
    title: "PolyFlow · Language, made yours",
    description: "A contemplative language practice built on vocabulary, structure, and meaningful use.",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "PolyFlow · Language, made yours" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PolyFlow · Language, made yours",
    description: "A contemplative language practice built on vocabulary, structure, and meaningful use.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
