import { forwardApiRequest } from "../../../../../lib/api-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await context.params;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "1y";
  return forwardApiRequest(
    request,
    `/api/market/history/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`,
  );
}
