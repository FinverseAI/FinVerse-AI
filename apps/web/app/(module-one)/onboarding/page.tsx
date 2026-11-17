import type { Metadata } from "next";
import { guardProfile } from "../../../auth/profile-guard";
import OnboardingForm from "./onboarding-form";

export const metadata: Metadata = {
  title: "Set up your budget",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await guardProfile("onboarding");
  return (
    <main className="dashboard onboarding-shell min-h-screen px-4 py-6 text-dash-text sm:px-8 sm:py-12">
      <OnboardingForm initialName={session?.user.name ?? ""} />
    </main>
  );
}
