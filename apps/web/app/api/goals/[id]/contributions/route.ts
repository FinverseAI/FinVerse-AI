import { forwardApiRequest } from "../../../../../lib/api-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return forwardApiRequest(
    request,
    `/api/goals/${encodeURIComponent(id)}/contributions`,
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return forwardApiRequest(
    request,
    `/api/goals/${encodeURIComponent(id)}/contributions`,
  );
}
