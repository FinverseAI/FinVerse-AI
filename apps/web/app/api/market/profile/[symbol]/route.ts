import { forwardApiRequest } from "../../../../../lib/api-server";
import {
  guestJson,
  guestMarketProfile,
  isGuestRequest,
} from "../../../../../lib/guest";

export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await context.params;
  // TEMPORARY dev-only guest demo — remove before shipping. Served
  // only when GUEST_LOGIN_ENABLED=true (checked in isGuestRequest).
  if (isGuestRequest(request)) return guestJson(guestMarketProfile(symbol));
  return forwardApiRequest(
    request,
    `/api/market/profile/${encodeURIComponent(symbol)}`,
  );
}
