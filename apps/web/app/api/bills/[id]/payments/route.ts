import { forwardApiRequest } from "../../../../../lib/api-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
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
  return forwardApiRequest(
    request,
    `/api/bills/${encodeURIComponent(id)}/payments`,
  );
}
