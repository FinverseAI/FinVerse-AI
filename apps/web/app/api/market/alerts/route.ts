import { forwardApiRequest } from "../../../../lib/api-server";
import { guestAlerts, guestJson, isGuestRequest } from "../../../../lib/guest";

export function GET(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. Served
  // only when GUEST_LOGIN_ENABLED=true (checked in isGuestRequest).
  if (isGuestRequest(request)) return guestJson(guestAlerts());
  return forwardApiRequest(request, "/api/market/alerts");
}
