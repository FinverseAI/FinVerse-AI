import { forwardApiRequest } from "../../../../lib/api-server";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  return forwardApiRequest(
    request,
    `/api/market/search?q=${encodeURIComponent(q)}`,
  );
}
