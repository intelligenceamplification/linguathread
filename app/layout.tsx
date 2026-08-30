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
