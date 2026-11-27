import { forwardApiRequest } from "../../../../../lib/api-server";
import {
  guestBillPayments,
  guestJson,
  guestReadOnly,
  isGuestRequest,
} from "../../../../../lib/guest";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  // TEMPORARY dev-only guest demo — remove before shipping. Served
  // only when GUEST_LOGIN_ENABLED=true (checked in isGuestRequest).
  if (isGuestRequest(request)) return guestJson(guestBillPayments(id));
  return forwardApiRequest(
    request,
    `/api/bills/${encodeURIComponent(id)}/payments`,
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  // TEMPORARY dev-only guest demo — remove before shipping. Guest mode
  // is read-only; only when GUEST_LOGIN_ENABLED=true (checked in
  // isGuestRequest) is the request refused here instead of forwarded.
  if (isGuestRequest(request)) return guestReadOnly();
  return forwardApiRequest(
    request,
    `/api/bills/${encodeURIComponent(id)}/payments`,
  );
}
