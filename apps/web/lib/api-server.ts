import "server-only";
import { backendApiUrl, webOrigin } from "./env";
import { readRequestBody, RequestBodyError } from "./request-body";

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
