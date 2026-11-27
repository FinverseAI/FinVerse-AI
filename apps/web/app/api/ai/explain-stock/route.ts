import { forwardApiRequest } from "../../../../lib/api-server";
import {
  guestAiChatResponse,
  guestJson,
  isGuestRequest,
} from "../../../../lib/guest";

// The reasoning model needs room for its chain of thought: 120s, matching
// the chat route.
export function POST(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. A guest
  // has no real holdings, so there is nothing to explain: answer with
  // a short canned demo reply instead of reaching the backend.
  if (isGuestRequest(request))
    return guestJson(
      guestAiChatResponse(
        "Stock explanations aren't available in the guest demo — there are no real holdings to explain. Sign in with Google to explain one of your stocks.",
      ),
    );
  return forwardApiRequest(request, "/api/ai/explain-stock", 120000);
}
