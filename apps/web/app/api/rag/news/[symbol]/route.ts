import { forwardApiRequest } from "../../../../../lib/api-server";
import {
  guestJson,
  guestNews,
  isGuestRequest,
} from "../../../../../lib/guest";

export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await context.params;
  // TEMPORARY dev-only guest demo — remove before shipping. Served
  // only when GUEST_LOGIN_ENABLED=true (checked in isGuestRequest).
  // A NewsResponse fixture, not the canned AI reply: this route's
  // client validates isNewsResponse before rendering.
  if (isGuestRequest(request)) return guestJson(guestNews(symbol));
  return forwardApiRequest(
    request,
    `/api/rag/news/${encodeURIComponent(symbol)}`,
  );
}
