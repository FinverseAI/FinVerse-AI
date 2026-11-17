import { forwardApiRequest } from "../../../../../../lib/api-server";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; contributionId: string }> },
) {
  const { id, contributionId } = await context.params;
  return forwardApiRequest(
    request,
    `/api/goals/${encodeURIComponent(id)}/contributions/${encodeURIComponent(contributionId)}`,
  );
}
