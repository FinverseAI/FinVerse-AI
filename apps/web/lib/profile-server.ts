import "server-only";
import { headers } from "next/headers";
import { readProfileResponse } from "./profile";

export async function getServerProfile() {
  const incoming = await headers();
  const response = await fetch(
    new URL("/api/profile", process.env.BACKEND_URL ?? "http://localhost:3001"),
    {
      headers: { cookie: incoming.get("cookie") ?? "" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  return readProfileResponse(response);
}

export async function forwardProfileRequest(
  request: Request,
  path: "/api/profile" | "/api/onboarding",
) {
  const responseHeaders = { "Cache-Control": "private, no-store" };
  const origin = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000")
    .origin;
  if (request.method !== "GET" && request.headers.get("origin") !== origin) {
    return Response.json(
      { message: "This request must originate from FinVerse." },
      { status: 403, headers: responseHeaders },
    );
  }
  if (
    request.method !== "GET" &&
    !request.headers.get("content-type")?.startsWith("application/json")
  ) {
    return Response.json(
      { message: "Send the profile as JSON." },
      { status: 415, headers: responseHeaders },
    );
  }
  try {
    const response = await fetch(
      new URL(path, process.env.BACKEND_URL ?? "http://localhost:3001"),
      {
        method: request.method,
        headers: {
          cookie: request.headers.get("cookie") ?? "",
          origin: request.headers.get("origin") ?? "",
          "Content-Type": "application/json",
        },
        body: request.method === "GET" ? undefined : await request.text(),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    return new Response(await response.text(), {
      status: response.status,
      headers: { ...responseHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return Response.json(
      {
        message:
          "The financial profile service is unavailable. Please try again.",
      },
      { status: 503, headers: responseHeaders },
    );
  }
}
