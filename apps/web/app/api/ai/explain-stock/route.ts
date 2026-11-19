import { forwardApiRequest } from "../../../../lib/api-server";

// The reasoning model needs room for its chain of thought: 120s, matching
// the chat route.
export function POST(request: Request) {
  return forwardApiRequest(request, "/api/ai/explain-stock", 120000);
}
