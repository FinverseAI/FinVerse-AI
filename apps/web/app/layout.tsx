import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { webOrigin } from "../lib/env";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(webOrigin()),
  title: {
    default: "FinVerse | Personal finance and stock intelligence",
    template: "%s | FinVerse",
  },
  description:
    "Budget in rupees, research Indian stocks, and ask FinVerse AI for explanations backed by your records and market data.",
};

export const viewport: Viewport = { themeColor: "#141518" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
