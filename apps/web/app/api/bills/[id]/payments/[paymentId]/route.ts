import { forwardApiRequest } from "../../../../../../lib/api-server";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await context.params;
  return forwardApiRequest(
    request,
    `/api/bills/${encodeURIComponent(id)}/payments/${encodeURIComponent(paymentId)}`,
  );
}
