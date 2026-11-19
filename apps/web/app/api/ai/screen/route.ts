import { forwardApiRequest } from "../../../../lib/api-server";

// Two model rounds (translate the criteria, then summarise the screen)
// plus the deterministic screen itself: 120s, matching the other AI routes.
export function POST(request: Request) {
  return forwardApiRequest(request, "/api/ai/screen", 120000);
}
