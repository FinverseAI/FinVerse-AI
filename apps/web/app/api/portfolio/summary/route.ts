import { forwardApiRequest } from "../../../../lib/api-server";
import {
  guestJson,
  guestPortfolioSummary,
  isGuestRequest,
} from "../../../../lib/guest";

export function GET(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. Served
  // only when GUEST_LOGIN_ENABLED=true (checked in isGuestRequest).
  if (isGuestRequest(request)) return guestJson(guestPortfolioSummary());
  return forwardApiRequest(request, "/api/portfolio/summary");
}
