import { forwardApiRequest } from "../../../../lib/api-server";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return forwardApiRequest(
    request,
    `/api/watchlist/${encodeURIComponent(id)}`,
  );
}
