import { forwardApiRequest } from "../../../../lib/api-server";
import {
  guestJson,
  guestScreen,
  isGuestRequest,
} from "../../../../lib/guest";

// Screening fetches quotes and history for up to 20 symbols; the first
// run against an uncached universe needs more than the 15s default.
function forwardScreen(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. Served
  // only when GUEST_LOGIN_ENABLED=true (checked in isGuestRequest).
  // A ScreenResponse fixture, not the canned AI reply: the market
  // page validates isScreenResponse before rendering this snapshot.
  if (isGuestRequest(request)) return guestJson(guestScreen());
  return forwardApiRequest(request, "/api/rag/screen", 60000);
}

export { forwardScreen as GET, forwardScreen as POST };
