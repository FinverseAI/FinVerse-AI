import type { Metadata } from "next";
import AuthForm from "../../../../auth/auth-form";
import { guardProfile } from "../../../../auth/profile-guard";
import { googleAuthEnabled } from "../../../../auth/server";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
  description: "Log in to FinVerse with Google.",
};

export default async function LoginRoute() {
  await guardProfile("auth");
  return <AuthForm mode="login" googleAuthEnabled={googleAuthEnabled} />;
}
