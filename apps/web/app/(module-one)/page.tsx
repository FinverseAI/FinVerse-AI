import LandingPage from "./landing-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "FinVerse | Personal finance and stock intelligence",
    description:
      "Budget in rupees, research Indian stocks, and ask FinVerse AI for explanations backed by your records and market data.",
    url: "/",
    siteName: "FinVerse",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "FinVerse | Personal finance and stock intelligence",
    description:
      "Manage your money, research Indian stocks, and ask FinVerse AI what’s behind the numbers.",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
