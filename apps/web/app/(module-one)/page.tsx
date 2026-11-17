import LandingPage from "./landing-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "FinVerse | A monthly plan for your money",
    description:
      "Plan budgets in INR, record spending, track bill due dates, and set savings goals.",
    url: "/",
    siteName: "FinVerse",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "FinVerse | Personal budgeting in INR",
    description:
      "Your monthly plan, spending records, and upcoming bills in one place.",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
