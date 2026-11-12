import type { Metadata } from "next";
import SignUpPage from "../../../../auth/sign-up-page";
import { guardProfile } from "../../../../auth/profile-guard";

export const metadata: Metadata = {
  title: "Sign up | FinVerse",
  description: "Create your FinVerse account with Google.",
};

export default async function SignUpRoute() {
  await guardProfile("auth");
  return <SignUpPage />;
}
