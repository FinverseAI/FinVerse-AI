import { forwardApiRequest } from "../../../../lib/api-server";
import {
  guestAiChatResponse,
  guestJson,
  isGuestRequest,
} from "../../../../lib/guest";

// LLM calls take far longer than a database read: the backend allows 30s
// per model call and the guardrail can retry once, so the forwarder gets
// a 120s budget to match the other explain routes.
export function POST(request: Request) {
  // TEMPORARY dev-only guest demo — remove before shipping. Answer
  // with a short canned demo reply instead of reaching the backend.
  // (The readiness card only calls this when the AI status reports
  // configured, which the guest status stub does not — this is here
  // so the endpoint itself is consistent in guest mode.)
  if (isGuestRequest(request))
    return guestJson(
      guestAiChatResponse(
        "Demo note: your readiness score is 84 out of 100 (Ready), from your demo income, surplus and emergency fund. Sign in with Google to get explanations for your real score.",
      ),
    );
  return forwardApiRequest(request, "/api/ai/explain-readiness", 120000);
}
