import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./server";
import { ProfileApiError } from "../lib/profile";
import { getServerProfile } from "../lib/profile-server";
import { getGuestSession, guestProfileResponse } from "../lib/guest";
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
  // TEMPORARY dev-only guest login bypass — remove before shipping.
  // The real session is checked FIRST: a stale guest cookie must never
  // shadow a real Google session (and a guest cannot reach /auth/login
  // to recover from that). Only when there is no real session does the
  // guest session apply. In local guest mode there is no backend/DB,
  // so the real-session lookup may throw — any error falls through to
  // the guest check below, and guest mode keeps working with dummy
  // env. getGuestSession() returns null unless GUEST_LOGIN_ENABLED=
  // true, so the bypass is impossible when the gate is off. The demo
  // profile is always onboarding-completed.
  let session: Awaited<ReturnType<typeof getSession>> | null = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }
  if (session) {
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
  const guest = await getGuestSession();
  if (guest) {
    const data = guestProfileResponse();
    if (destination === "auth")
      redirect(data.onboarding_completed ? "/dashboard" : "/onboarding");
    if (destination === "onboarding") redirect("/dashboard");
    return { user: guest, data };
  }
  if (destination === "auth") return null;
  redirect("/auth/login");
}
