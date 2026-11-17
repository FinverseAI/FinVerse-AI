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
    default: "FinVerse | Monthly budgets, spending and bills in INR",
    template: "%s | FinVerse",
  },
  description:
    "Plan your monthly budget in rupees, record expenses, track bill due dates, and set savings goals. A personal finance workspace for everyday money decisions.",
};

export const viewport: Viewport = { themeColor: "#131d2b" };

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
