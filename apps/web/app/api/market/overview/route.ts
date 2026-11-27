import { forwardApiRequest } from "../../../../lib/api-server";
import {
  guestJson,
  guestMarketOverview,
  isGuestRequest,
} from "../../../../lib/guest";

export function GET(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. Served
  // only when GUEST_LOGIN_ENABLED=true (checked in isGuestRequest).
  if (isGuestRequest(request)) return guestJson(guestMarketOverview());
  return forwardApiRequest(request, "/api/market/overview");
}
