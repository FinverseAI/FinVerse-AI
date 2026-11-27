import { forwardApiRequest } from "../../../../../lib/api-server";
import {
  guestJson,
  guestMarketHistory,
  isGuestRequest,
} from "../../../../../lib/guest";

export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await context.params;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "1y";
  // TEMPORARY dev-only guest demo — remove before shipping. Served
  // only when GUEST_LOGIN_ENABLED=true (checked in isGuestRequest).
  if (isGuestRequest(request))
    return guestJson(guestMarketHistory(symbol, range));
  return forwardApiRequest(
    request,
    `/api/market/history/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`,
  );
}
