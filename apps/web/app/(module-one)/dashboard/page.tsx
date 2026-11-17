import type { Metadata } from "next";
import { guardProfile } from "../../../auth/profile-guard";
import Dashboard from "./dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
  description: "Your balance, spending, budgets, and savings at a glance.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const result = await guardProfile("dashboard");
  return <Dashboard user={result!.user} profileData={result!.data} />;
}
