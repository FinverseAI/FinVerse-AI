import { forwardApiRequest } from "../../../../lib/api-server";
import {
  guestAiChatResponse,
  guestJson,
  isGuestRequest,
} from "../../../../lib/guest";

// Two model rounds (translate the criteria, then summarise the screen)
// plus the deterministic screen itself: 120s, matching the other AI routes.
export function POST(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. No model
  // runs for a guest: answer with a short canned demo reply instead of
  // reaching the backend. (The screener itself still works off the
  // demo snapshot from /api/rag/screen — only the natural-language
  // query is stubbed here.)
  if (isGuestRequest(request))
    return guestJson(
      guestAiChatResponse(
        "Stock screening by question isn't available in the guest demo — it needs your real holdings and watchlist. Sign in with Google to screen stocks with FinVerse AI.",
      ),
    );
  return forwardApiRequest(request, "/api/ai/screen", 120000);
}
