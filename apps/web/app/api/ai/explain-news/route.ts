import { forwardApiRequest } from "../../../../lib/api-server";
import {
  guestAiChatResponse,
  guestJson,
  isGuestRequest,
} from "../../../../lib/guest";

// The reasoning model needs room for its chain of thought: 120s, matching
// the chat and explain-stock routes.
export function POST(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. No model
  // runs for a guest and there is no live news to explain: answer with
  // a short canned demo reply instead of reaching the backend.
  if (isGuestRequest(request))
    return guestJson(
      guestAiChatResponse(
        "News explanations aren't available in the guest demo — there is no live news to explain. Sign in with Google to ask FinVerse AI about a stock's news.",
      ),
    );
  return forwardApiRequest(request, "/api/ai/explain-news", 120000);
}
