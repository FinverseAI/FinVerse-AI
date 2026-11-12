import type { Metadata } from "next";
import { guardProfile } from "../../../auth/profile-guard";
import Main from "../main";

export const metadata: Metadata = {
  title: "Dashboard | Personal Finance",
  description: "Your balance, spending, budgets, and savings at a glance.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const result = await guardProfile("dashboard");
  return (
    <Main screen="dashboard" user={result!.user} profileData={result!.data} />
  );
}
