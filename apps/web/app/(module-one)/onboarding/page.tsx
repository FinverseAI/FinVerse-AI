import type { Metadata } from "next";
import { guardProfile } from "../../../auth/profile-guard";
import OnboardingForm from "./onboarding-form";

export const metadata: Metadata = {
  title: "Set up your budget",
  description:
    "Set your monthly income, payday, spending limits and savings goals.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await guardProfile("onboarding");
  return (
    <main className="dashboard onboarding-shell min-h-screen px-4 py-6 text-dash-text md:px-[var(--workspace-content-gutter)] md:py-8">
      <OnboardingForm initialName={session?.user.name ?? ""} />
    </main>
  );
}
