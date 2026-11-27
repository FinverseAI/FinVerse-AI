import { forwardApiRequest } from "../../../../lib/api-server";
import { guestReadOnly, isGuestRequest } from "../../../../lib/guest";

// One model call, but the model can take a while to start — and the
// backend's local-extractor fallback only runs if the forwarder waits
// long enough for the single model call to finish. The forwarder budget
// is set from the ~100s total backend deadline (B60), not from one call:
// 120s, matching the other AI routes.
export function POST(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. Guest mode
  // is read-only; only when GUEST_LOGIN_ENABLED=true (checked in
  // isGuestRequest) is the request refused here instead of forwarded.
  if (isGuestRequest(request)) return guestReadOnly();
  return forwardApiRequest(request, "/api/ai/extract-expense", 120000);
}
