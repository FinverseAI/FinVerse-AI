import { forwardApiRequest } from "../../../../lib/api-server";

// Screening fetches quotes and history for up to 20 symbols; the first
// run against an uncached universe needs more than the 15s default.
export function POST(request: Request) {
  return forwardApiRequest(request, "/api/rag/screen", 60000);
}
