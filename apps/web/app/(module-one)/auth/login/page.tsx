import type { Metadata } from "next";
import LoginPage from "../../../../auth/login-page";
import { guardProfile } from "../../../../auth/profile-guard";

export const metadata: Metadata = {
  title: "Log in | FinVerse",
  description: "Log in to FinVerse with Google.",
};

export default async function LoginRoute() {
  await guardProfile("auth");
  return <LoginPage />;
}
