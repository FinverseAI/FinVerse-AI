import type { Metadata } from "next";
import { guardProfile } from "../../../auth/profile-guard";
import OnboardingForm from "./onboarding-form";

export const metadata: Metadata = { title: "Financial onboarding | FinVerse" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await guardProfile("onboarding");
  return (
    <main className="dashboard onboarding-shell min-h-screen px-5 py-10 text-dash-text sm:py-16">
      <section className="dash-panel dash-highlight onboarding-card mx-auto max-w-2xl">
        <p className="dash-eyebrow text-dash-accent">FinVerse</p>
        <h1 className="mt-4 text-[clamp(28px,4vw,38px)] leading-tight font-medium tracking-[-0.04em]">
          Set up your financial profile
        </h1>
        <p className="mb-6 mt-2 text-sm text-dash-muted">
          Complete these four steps once. You can update your answers from the
          dashboard later.
        </p>
        <OnboardingForm />
      </section>
    </main>
  );
}
