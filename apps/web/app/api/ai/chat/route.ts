import { forwardApiRequest } from "../../../../lib/api-server";

// LLM calls take far longer than a database read: the backend allows 30s
// per model call and the tool loop can make several, so the forwarder
// gets a 120s budget to match.
export function POST(request: Request) {
  return forwardApiRequest(request, "/api/ai/chat", 120000);
}
