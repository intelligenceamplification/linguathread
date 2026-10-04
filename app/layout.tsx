import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://linguathread.vercel.app"),
  title: "LinguaThread · How Language Is Built",
  description: "A contemplative language practice built through language stacking, structure, and meaningful use.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "LinguaThread · How Language Is Built",
    description: "A contemplative language practice built through language stacking, structure, and meaningful use.",
    images: [{ url: "/brand/v3/social-preview.png", width: 1200, height: 630, alt: "LinguaThread · 語 · 말 · tiếng · How Language Is Built" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinguaThread · How Language Is Built",
    description: "A contemplative language practice built through language stacking, structure, and meaningful use.",
    images: ["/brand/v3/social-preview.png"],
  },
  icons: {
    icon: "/favicon.svg?v=3",
    shortcut: "/favicon.svg?v=3",
    apple: "/brand/v3/icon-light-192.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1114" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.className} ${geist.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
