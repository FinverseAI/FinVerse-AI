import { forwardApiRequest } from "../../../../lib/api-server";
import { guestAiStatus, guestJson, isGuestRequest } from "../../../../lib/guest";

export function GET(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. Served
  // only when GUEST_LOGIN_ENABLED=true (checked in isGuestRequest).
  if (isGuestRequest(request)) return guestJson(guestAiStatus());
  return forwardApiRequest(request, "/api/ai/status");
}
