import { forwardApiRequest } from "../../../../lib/api-server";

// One model call, but the model can take a while to start; the
// forwarder gets a 60s budget to match.
export function POST(request: Request) {
  return forwardApiRequest(request, "/api/ai/extract-expense", 60000);
}
