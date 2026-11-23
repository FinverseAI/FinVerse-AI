import "server-only";
import { backendApiUrl, webOrigin } from "./env";
import { readRequestBody, RequestBodyError } from "./request-body";

function sameOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
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
  // A deployment whose BETTER_AUTH_URL points at another host (for
  // example a second hosting provider) would reject its own browser's
  // requests. A request whose Origin matches the URL it was sent to is
  // same-origin by definition, so accept that too — a foreign origin is
  // still rejected, and a missing origin never matches.
  const acceptedOrigins = new Set(
    [origin, sameOrigin(request.url)].filter(
      (value): value is string => typeof value === "string",
    ),
  );
  if (mutating && !acceptedOrigins.has(request.headers.get("origin") ?? "")) {
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
    const response = await fetch(backendApiUrl(path), {
      method: request.method,
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        origin: request.headers.get("origin") ?? "",
        "Content-Type": "application/json",
      },
      body:
        mutating && request.method !== "DELETE"
          ? await readRequestBody(request)
          : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]),
    });
    if (response.status >= 500) {
      return Response.json(
        {
          message:
            "Your records could not be saved or loaded. Please try again.",
        },
        { status: 503, headers },
      );
    }
    // A null-body status (204, 304) cannot carry a body — re-wrapping one
    // with response.text() throws and would surface as a bogus 503.
    if (response.status === 204 || response.status === 304) {
      return new Response(null, { status: response.status, headers });
    }
    return new Response(await response.text(), {
      status: response.status,
      headers,
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
