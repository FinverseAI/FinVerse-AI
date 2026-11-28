import { forwardApiRequest } from "../../../../lib/api-server";

// LLM calls take far longer than a database read: the backend allows 30s
// per model call and the guardrail can retry once, so the forwarder gets
// a 120s budget to match the other explain routes.
export function POST(request: Request) {
  return forwardApiRequest(request, "/api/ai/explain-readiness", 120000);
}
