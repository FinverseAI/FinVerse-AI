import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./server";
import { ProfileApiError } from "../lib/profile";
import { getServerProfile } from "../lib/profile-server";
import { cache } from "react";

const getSession = cache(async () =>
  auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  }),
);

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
    // A 503 from getServerProfile (backend unreachable — B57) is
    // rethrown on purpose: the route's error boundary renders
    // ProfileError, which shows the service-unavailable state for it
    // instead of a login redirect or the generic error page.
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
