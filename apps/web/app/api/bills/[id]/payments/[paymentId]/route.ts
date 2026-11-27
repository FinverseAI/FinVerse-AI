import { forwardApiRequest } from "../../../../../../lib/api-server";
import { guestReadOnly, isGuestRequest } from "../../../../../../lib/guest";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await context.params;
  // TEMPORARY dev-only guest demo — remove before shipping. Guest mode
  // is read-only; only when GUEST_LOGIN_ENABLED=true (checked in
  // isGuestRequest) is the request refused here instead of forwarded.
  if (isGuestRequest(request)) return guestReadOnly();
  return forwardApiRequest(
    request,
    `/api/bills/${encodeURIComponent(id)}/payments/${encodeURIComponent(paymentId)}`,
  );
}
