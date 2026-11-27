import { forwardApiRequest } from "../../../../lib/api-server";
import { guestJson, isGuestRequest } from "../../../../lib/guest";

export function POST(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. The
  // dashboard auto-runs auto-pay on load; a guest has nothing to pay,
  // so answer "nothing paid" instead of forwarding to the backend.
  // Only when GUEST_LOGIN_ENABLED=true (checked in isGuestRequest).
  if (isGuestRequest(request)) return guestJson({ paid: [] });
  return forwardApiRequest(request, "/api/bills/auto-pay");
}
