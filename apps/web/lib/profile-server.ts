import "server-only";
import { headers } from "next/headers";
import { readProfileResponse, ProfileApiError } from "./profile";
import { backendApiUrl } from "./env";

export async function getServerProfile() {
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
