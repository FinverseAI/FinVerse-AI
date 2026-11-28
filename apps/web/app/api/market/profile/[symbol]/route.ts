import { forwardApiRequest } from "../../../../../lib/api-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await context.params;
  return forwardApiRequest(
    request,
    `/api/market/profile/${encodeURIComponent(symbol)}`,
  );
}
