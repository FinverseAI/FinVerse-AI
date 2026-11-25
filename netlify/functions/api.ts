import serverless from "serverless-http";
import type { Handler } from "@netlify/functions";
import { createApp } from "../../apps/backend/dist/app.factory";

/**
 * FinVerse backend as a Netlify Function.
 * The Nest app boots once per cold start and is reused across warm
 * invocations. Netlify invokes this at /.netlify/functions/api/*, so the
 * function prefix is stripped before the request reaches Nest, whose
 * controllers live under /api/*.
 *
 * Platform limits (B49): a sync Netlify function is capped at 10s on
 * Free / 26s max on Pro — no timeout above 26s is attainable here, so
 * the 110s backend LLM budget can never complete on this host. The
 * mitigations in this file only keep cold starts cheap and failures
 * legible; the deployment decision (long-lived Render backend vs
 * background functions + polling) is still open — see the fix-pass
 * report. The user's earlier 110s approval is moot on Netlify.
 */
const FUNCTION_PREFIX = "/.netlify/functions/api";

let cachedHandler: Handler | undefined;
// Memoised in-flight boot (B53): without this, N concurrent cold-start
// invocations each ran a full createApp() (Nest boot + Prisma) against
// the same 10s budget.
let inflightHandler: Promise<Handler> | undefined;

async function getHandler(): Promise<Handler> {
  if (cachedHandler) return cachedHandler;
  if (!inflightHandler) {
    inflightHandler = (async () => {
      const app = await createApp();
      await app.init();
      const expressApp = app.getHttpAdapter().getInstance();
      cachedHandler = serverless(expressApp) as unknown as Handler;
      return cachedHandler;
    })();
    // A failed boot must not poison the memo: drop the rejected promise
    // so the next invocation retries instead of rethrowing forever.
    inflightHandler.catch(() => {
      inflightHandler = undefined;
    });
  }
  return inflightHandler;
}

export const handler: Handler = async (event, context) => {
  try {
    const strippedEvent = {
      ...event,
      path: event.path.startsWith(FUNCTION_PREFIX)
        ? event.path.slice(FUNCTION_PREFIX.length) || "/"
        : event.path,
    };
    const handle = await getHandler();
    return handle(strippedEvent, context);
  } catch (error) {
    // A boot failure used to escape as a bare platform 502. Return a
    // JSON 503 instead, so the client can say "service unavailable"
    // rather than failing with an opaque platform error.
    console.error("FinVerse backend failed to start:", error);
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "The account service is unavailable. Please try again.",
        status: 503,
      }),
    };
  }
};
