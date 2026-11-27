import { forwardApiRequest } from "../../../../lib/api-server";
import {
  guestJson,
  guestMarketSearch,
  isGuestRequest,
} from "../../../../lib/guest";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  // TEMPORARY dev-only guest demo — remove before shipping. Served
  // only when GUEST_LOGIN_ENABLED=true (checked in isGuestRequest).
  if (isGuestRequest(request)) return guestJson(guestMarketSearch(q));
  return forwardApiRequest(
    request,
    `/api/market/search?q=${encodeURIComponent(q)}`,
  );
}
