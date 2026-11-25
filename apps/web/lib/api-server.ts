import "server-only";
import { backendApiUrl, webOrigin } from "./env";
import { readRequestBody, RequestBodyError } from "./request-body";

// Paths whose POST creates a record (B44). Each forwarded create carries
// a fresh X-Idempotency-Key so a transport retry cannot create the same
// record twice; a key the browser already sent is forwarded unchanged.
const IDEMPOTENCY_CREATE_PATHS = [
  /^\/api\/bills$/,
  /^\/api\/transactions$/,
  /^\/api\/bills\/[^/]+\/payments$/,
  /^\/api\/goals\/[^/]+\/contributions$/,
];

function isCreatePath(path: string): boolean {
  return IDEMPOTENCY_CREATE_PATHS.some((pattern) => pattern.test(path));
}

function sanitizeBackendMessage(message: string): string | null {
  const clean = message
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 500);
  return clean ? clean : null;
}

const GENERIC_5XX_MESSAGE =
  "Something went wrong on our side. Please try again.";

// Response headers the forwarder keeps: its own cache directive plus the
// allow-listed backend headers (B54). Retry-After lets the client say how
// long to wait after a 429; Set-Cookie lets a future backend session
// rotation reach the browser. Anything else from the backend is dropped.
function passthroughHeaders(response: Response): Headers {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Type": "application/json",
  });
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) headers.set("Retry-After", retryAfter);
  const setCookie =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : (() => {
          const single = response.headers.get("set-cookie");
          return single ? [single] : [];
        })();
  for (const cookie of setCookie) headers.append("Set-Cookie", cookie);
  return headers;
}

export async function forwardApiRequest(
  request: Request,
  path: string,
  timeoutMs = 15000,
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "Content-Type": "application/json",
  };
  const mutating = request.method !== "GET";
  const origin = webOrigin();
  // Only the configured web origin may mutate: the request the forwarder
  // sends to the backend is server-to-server, so its Origin is rewritten
  // to webOrigin() below (B62) — a browser origin that merely matches the
  // URL it was sent to is no longer accepted, because the backend guard
  // rejects any non-GET whose Origin differs from BETTER_AUTH_URL, and
  // the old fallback made every mutation 403 on such deployments.
  if (mutating && request.headers.get("origin") !== origin) {
    return Response.json(
      { message: "This request must originate from FinVerse." },
      { status: 403, headers },
    );
  }
  if (
    mutating &&
    request.method !== "DELETE" &&
    request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !==
      "application/json"
  ) {
    return Response.json(
      { message: "Send the record as JSON." },
      { status: 415, headers },
    );
  }
  try {
    const backendHeaders: Record<string, string> = {
      cookie: request.headers.get("cookie") ?? "",
      // Server-to-server: this is not a browser request anymore, so the
      // Origin is the configured web origin, not the browser's (B62).
      origin,
      "Content-Type": "application/json",
    };
    if (
      request.method === "POST" &&
      isCreatePath(path) &&
      !request.headers.get("x-idempotency-key")
    ) {
      backendHeaders["X-Idempotency-Key"] = crypto.randomUUID();
    } else {
      const incomingKey = request.headers.get("x-idempotency-key");
      if (incomingKey) backendHeaders["X-Idempotency-Key"] = incomingKey;
    }
    const response = await fetch(backendApiUrl(path), {
      method: request.method,
      headers: backendHeaders,
      body:
        mutating && request.method !== "DELETE"
          ? await readRequestBody(request)
          : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]),
    });
    if (response.status >= 500) {
      // Pass the backend's own status and message through (B51), so a
      // market "no price available" 503 and a database 500 stay
      // distinguishable. Only an unparseable body (or one with no usable
      // message) falls back to a generic 503.
      const body = await response.text();
      let message: string | null = null;
      try {
        const data = JSON.parse(body);
        if (typeof data?.message === "string") {
          message = sanitizeBackendMessage(data.message);
        }
      } catch {
        message = null;
      }
      if (message === null) {
        return Response.json(
          { message: GENERIC_5XX_MESSAGE },
          { status: 503, headers: passthroughHeaders(response) },
        );
      }
      return Response.json(
        { message },
        { status: response.status, headers: passthroughHeaders(response) },
      );
    }
    // A null-body status (204, 304) cannot carry a body — re-wrapping one
    // with response.text() throws and would surface as a bogus 503.
    if (response.status === 204 || response.status === 304) {
      return new Response(null, {
        status: response.status,
        headers: passthroughHeaders(response),
      });
    }
    return new Response(await response.text(), {
      status: response.status,
      headers: passthroughHeaders(response),
    });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return Response.json(
        { message: error.message },
        { status: 413, headers },
      );
    }
    return Response.json(
      { message: "The account service is unavailable. Please try again." },
      { status: 503, headers },
    );
  }
}
