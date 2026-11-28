import { forwardApiRequest } from "../../../../lib/api-server";

// One model call, but the model can take a while to start — and the
// backend's local-extractor fallback only runs if the forwarder waits
// long enough for the single model call to finish. The forwarder budget
// is set from the ~100s total backend deadline (B60), not from one call:
// 120s, matching the other AI routes.
export function POST(request: Request) {
  return forwardApiRequest(request, "/api/ai/extract-expense", 120000);
}
