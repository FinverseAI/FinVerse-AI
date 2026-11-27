import "server-only";
import { headers } from "next/headers";
import { readProfileResponse, ProfileApiError } from "./profile";
import { backendApiUrl } from "./env";
import { getGuestSession, guestProfileResponse } from "./guest";

export async function getServerProfile() {
  // TEMPORARY dev-only guest demo — remove before shipping. A guest
  // session is only trusted when GUEST_LOGIN_ENABLED=true (checked
  // inside getGuestSession), so with the gate off this never fires.
  if (await getGuestSession()) return guestProfileResponse();
  let response: Response;
  try {
    const incoming = await headers();
    response = await fetch(backendApiUrl("/api/profile"), {
      headers: { cookie: incoming.get("cookie") ?? "" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    // A network failure (backend down, DNS) is a service outage, not a
    // caller bug: surface it as a 503 ProfileApiError so the guard
    // renders the service-unavailable state instead of letting a raw
    // fetch exception reach the generic error page.
    throw new ProfileApiError(
      "The account service is unavailable. Please try again.",
      503,
    );
  }
  return readProfileResponse(response);
}
