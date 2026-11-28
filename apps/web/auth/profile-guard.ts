import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./server";
import { ProfileApiError } from "../lib/profile";
import { getServerProfile } from "../lib/profile-server";
import { cache } from "react";

const getSession = cache(async () => {
  const incoming = await headers();
  try {
    return await auth.api.getSession({
      headers: incoming,
      query: { disableCookieCache: true },
    });
  } catch {
    throw new ProfileApiError("Sign-in is temporarily unavailable.", 503);
  }
});

export async function guardProfile(
  destination: "dashboard" | "market" | "onboarding" | "auth",
) {
  const session = await getSession();
  if (!session) {
    if (destination === "auth") return null;
    redirect("/auth/login");
  }

  let data;
  try {
    data = await getServerProfile();
  } catch (error) {
    if (error instanceof ProfileApiError && error.status === 401) {
      if (destination === "auth") return null;
      redirect("/auth/login");
    }
    throw error;
  }
  if (destination === "auth")
    redirect(data.onboarding_completed ? "/dashboard" : "/onboarding");
  if (
    (destination === "dashboard" || destination === "market") &&
    !data.onboarding_completed
  )
    redirect("/onboarding");
  if (destination === "onboarding" && data.onboarding_completed)
    redirect("/dashboard");
  return { user: session.user, data };
}
