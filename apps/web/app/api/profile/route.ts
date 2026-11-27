import { forwardApiRequest } from "../../../lib/api-server";
import {
  guestJson,
  guestProfileResponse,
  guestReadOnly,
  isGuestRequest,
} from "../../../lib/guest";

export function GET(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. Served
  // only when GUEST_LOGIN_ENABLED=true (checked in isGuestRequest).
  if (isGuestRequest(request)) return guestJson(guestProfileResponse());
  return forwardApiRequest(request, "/api/profile");
}

export function PUT(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. Guest mode
  // is read-only; only when GUEST_LOGIN_ENABLED=true (checked in
  // isGuestRequest) is the request refused here instead of forwarded.
  if (isGuestRequest(request)) return guestReadOnly();
  return forwardApiRequest(request, "/api/profile");
}
