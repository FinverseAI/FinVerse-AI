import type { Metadata } from "next";
import AuthForm from "../../../../auth/auth-form";
import { guardProfile } from "../../../../auth/profile-guard";
import { googleAuthEnabled } from "../../../../auth/server";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
  description: "Create your FinVerse account with Google.",
};

export default async function SignUpRoute() {
  await guardProfile("auth");
  return <AuthForm mode="sign-up" googleAuthEnabled={googleAuthEnabled} />;
}
