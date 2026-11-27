import { forwardApiRequest } from "../../../../lib/api-server";
import {
  guestAiChatResponse,
  guestJson,
  isGuestRequest,
} from "../../../../lib/guest";

// LLM calls take far longer than a database read: the backend allows 30s
// per model call and the tool loop can make several, so the forwarder
// gets a 120s budget to match.
export function POST(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. No model
  // runs for a guest: the chat answers with a short canned demo reply
  // (the backend's fallback shape) instead of reaching the backend.
  if (isGuestRequest(request))
    return guestJson(
      guestAiChatResponse(
        "Demo reply: your demo budget has ₹90,000 coming in and ₹72,250 planned out each month, leaving a ₹17,750 surplus, and your readiness score is 84 out of 100. Sign in with Google to ask FinVerse AI about your real money.",
      ),
    );
  return forwardApiRequest(request, "/api/ai/chat", 120000);
}
