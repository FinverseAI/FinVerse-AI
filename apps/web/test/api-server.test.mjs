import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

await register("./tsx-loader.mjs", import.meta.url);

// The proxy reads these per request, so the test controls both ends: the
// configured web origin (BETTER_AUTH_URL) and the backend base, including
// the Netlify function path the backend lives under in production.
process.env.BETTER_AUTH_URL = "https://app.example.com";
process.env.BACKEND_URL = "https://app.example.com/.netlify/functions/api";

const { forwardApiRequest } = await import("../lib/api-server.ts");

const originalFetch = globalThis.fetch;

function stubFetch(response) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (response instanceof Error) throw response;
    // A Response body can only be read once, so a factory builds a
    // fresh one per call when a test forwards more than once.
    return typeof response === "function" ? response() : response;
  };
  return calls;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function postRequest(origin, body = { amount: 100 }) {
  return new Request("https://app.example.com/api/transactions", {
    method: "POST",
    headers: {
      ...(origin ? { origin } : {}),
      "Content-Type": "application/json",
      cookie: "session=abc",
    },
    body: JSON.stringify(body),
  });
}

test("a GET forwards the session cookie and returns the backend body verbatim", async () => {
  const calls = stubFetch(jsonResponse([{ id: "t1" }]));
  try {
    const response = await forwardApiRequest(
      new Request("https://app.example.com/api/transactions", {
        headers: { cookie: "session=abc" },
      }),
      "/api/transactions",
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{ id: "t1" }]);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "https://app.example.com/.netlify/functions/api/api/transactions",
    );
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.cookie, "session=abc");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a GET needs no Origin header", async () => {
  stubFetch(jsonResponse({ ok: true }));
  try {
    const response = await forwardApiRequest(
      new Request("https://app.example.com/api/profile"),
      "/api/profile",
    );
    assert.equal(response.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a POST from the configured web origin is forwarded", async () => {
  const calls = stubFetch(jsonResponse({ id: "t1" }, 201));
  try {
    const response = await forwardApiRequest(
      postRequest("https://app.example.com"),
      "/api/transactions",
    );
    assert.equal(response.status, 201);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.body, JSON.stringify({ amount: 100 }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a POST from the request's own origin is rejected when the configured origin differs", async () => {
  // B62: the old fallback accepted any origin matching the URL the
  // request was sent to, but the backend guard rejects every non-GET
  // whose Origin differs from BETTER_AUTH_URL — so the fallback only
  // produced 403s at the backend. Only the configured web origin is
  // accepted now, and the forwarder rewrites Origin to it.
  const calls = stubFetch(jsonResponse({ id: "t1" }, 201));
  try {
    const response = await forwardApiRequest(
      new Request("https://other-host.example.com/api/transactions", {
        method: "POST",
        headers: {
          origin: "https://other-host.example.com",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: 100 }),
      }),
      "/api/transactions",
    );
    assert.equal(response.status, 403);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the server-to-server fetch carries the configured web origin, not the browser's", async () => {
  const calls = stubFetch(jsonResponse({ id: "t1" }, 201));
  try {
    const response = await forwardApiRequest(
      postRequest("https://app.example.com"),
      "/api/transactions",
    );
    assert.equal(response.status, 201);
    assert.equal(calls[0].init.headers.origin, "https://app.example.com");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a POST from a foreign origin is rejected before any backend call", async () => {
  const calls = stubFetch(jsonResponse({ id: "t1" }, 201));
  try {
    const response = await forwardApiRequest(
      postRequest("https://evil.example.com"),
      "/api/transactions",
    );
    assert.equal(response.status, 403);
    assert.equal(
      (await response.json()).message,
      "This request must originate from FinVerse.",
    );
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a POST with no Origin header is rejected", async () => {
  const calls = stubFetch(jsonResponse({ id: "t1" }, 201));
  try {
    const response = await forwardApiRequest(
      postRequest(null),
      "/api/transactions",
    );
    assert.equal(response.status, 403);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a POST with a non-JSON content type is rejected with 415", async () => {
  const calls = stubFetch(jsonResponse({ id: "t1" }, 201));
  try {
    const response = await forwardApiRequest(
      new Request("https://app.example.com/api/transactions", {
        method: "POST",
        headers: {
          origin: "https://app.example.com",
          "Content-Type": "text/plain",
        },
        body: "amount=100",
      }),
      "/api/transactions",
    );
    assert.equal(response.status, 415);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a DELETE skips the content-type check but still checks the origin", async () => {
  const calls = stubFetch(new Response(null, { status: 204 }));
  try {
    const allowed = await forwardApiRequest(
      new Request("https://app.example.com/api/transactions/t1", {
        method: "DELETE",
        headers: { origin: "https://app.example.com" },
      }),
      "/api/transactions/t1",
    );
    assert.equal(allowed.status, 204);
    assert.equal(calls.length, 1);
    const rejected = await forwardApiRequest(
      new Request("https://app.example.com/api/transactions/t1", {
        method: "DELETE",
        headers: { origin: "https://evil.example.com" },
      }),
      "/api/transactions/t1",
    );
    assert.equal(rejected.status, 403);
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a backend 5xx passes its status and message through", async () => {
  // B51: the old flattening turned every backend >=500 into one generic
  // 503, so a market "no price available" 503 and a database 500 were
  // indistinguishable. The backend's own status and message now pass
  // through (sanitised).
  stubFetch(jsonResponse({ message: "No price available." }, 503));
  try {
    const response = await forwardApiRequest(
      new Request("https://app.example.com/api/profile"),
      "/api/profile",
    );
    assert.equal(response.status, 503);
    assert.equal((await response.json()).message, "No price available.");
  } finally {
    globalThis.fetch = originalFetch;
  }
  stubFetch(jsonResponse({ message: "boom" }, 500));
  try {
    const response = await forwardApiRequest(
      new Request("https://app.example.com/api/profile"),
      "/api/profile",
    );
    assert.equal(response.status, 500);
    assert.equal((await response.json()).message, "boom");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a backend 5xx with an unparseable body falls back to a generic 503", async () => {
  stubFetch(new Response("<html>bad gateway</html>", { status: 502 }));
  try {
    const response = await forwardApiRequest(
      new Request("https://app.example.com/api/profile"),
      "/api/profile",
    );
    assert.equal(response.status, 503);
    assert.equal(
      (await response.json()).message,
      "Something went wrong on our side. Please try again.",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Retry-After and Set-Cookie pass through from the backend", async () => {
  const backendHeaders = new Headers({
    "Content-Type": "application/json",
    "Retry-After": "120",
  });
  backendHeaders.append("Set-Cookie", "session=rotated; Path=/; HttpOnly");
  backendHeaders.append("Set-Cookie", "other=1; Path=/");
  stubFetch(
    new Response(JSON.stringify({ message: "Slow down." }), {
      status: 429,
      headers: backendHeaders,
    }),
  );
  try {
    const response = await forwardApiRequest(
      new Request("https://app.example.com/api/ai/chat"),
      "/api/ai/chat",
    );
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "120");
    assert.deepEqual(response.headers.getSetCookie(), [
      "session=rotated; Path=/; HttpOnly",
      "other=1; Path=/",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a POST create carries a fresh idempotency key; a client key is forwarded unchanged", async () => {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const calls = stubFetch(() => jsonResponse({ id: "t1" }, 201));
  try {
    const first = await forwardApiRequest(
      postRequest("https://app.example.com"),
      "/api/transactions",
    );
    assert.equal(first.status, 201);
    assert.match(calls[0].init.headers["X-Idempotency-Key"], uuid);
    const second = await forwardApiRequest(
      postRequest("https://app.example.com"),
      "/api/transactions",
    );
    assert.equal(second.status, 201);
    assert.match(calls[1].init.headers["X-Idempotency-Key"], uuid);
    assert.notEqual(
      calls[0].init.headers["X-Idempotency-Key"],
      calls[1].init.headers["X-Idempotency-Key"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  const keyed = stubFetch(jsonResponse({ id: "t1" }, 201));
  try {
    const request = postRequest("https://app.example.com");
    request.headers.set("x-idempotency-key", "client-key-123");
    const response = await forwardApiRequest(request, "/api/transactions");
    assert.equal(response.status, 201);
    assert.equal(keyed[0].init.headers["X-Idempotency-Key"], "client-key-123");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("no idempotency key is added to GETs or non-create POSTs", async () => {
  const calls = stubFetch(() => jsonResponse({ ok: true }));
  try {
    await forwardApiRequest(
      new Request("https://app.example.com/api/profile"),
      "/api/profile",
    );
    assert.equal("X-Idempotency-Key" in calls[0].init.headers, false);
    await forwardApiRequest(
      postRequest("https://app.example.com", { today: "2026-11-26" }),
      "/api/bills/auto-pay",
    );
    assert.equal("X-Idempotency-Key" in calls[1].init.headers, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a backend 4xx passes through untouched", async () => {
  stubFetch(jsonResponse({ message: "Please log in to continue." }, 401));
  try {
    const response = await forwardApiRequest(
      new Request("https://app.example.com/api/profile"),
      "/api/profile",
    );
    assert.equal(response.status, 401);
    assert.equal((await response.json()).message, "Please log in to continue.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("an unreachable backend becomes a 503", async () => {
  stubFetch(new TypeError("fetch failed"));
  try {
    const response = await forwardApiRequest(
      new Request("https://app.example.com/api/profile"),
      "/api/profile",
    );
    assert.equal(response.status, 503);
    assert.equal(
      (await response.json()).message,
      "The account service is unavailable. Please try again.",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a body over 64 KB is rejected with 413", async () => {
  const calls = stubFetch(jsonResponse({ id: "t1" }, 201));
  try {
    const response = await forwardApiRequest(
      postRequest("https://app.example.com", {
        note: "x".repeat(70 * 1024),
      }),
      "/api/transactions",
    );
    assert.equal(response.status, 413);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
