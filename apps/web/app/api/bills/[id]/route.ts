import { forwardApiRequest } from "../../../../lib/api-server";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return forwardApiRequest(request, `/api/bills/${encodeURIComponent(id)}`);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return forwardApiRequest(request, `/api/bills/${encodeURIComponent(id)}`);
}
