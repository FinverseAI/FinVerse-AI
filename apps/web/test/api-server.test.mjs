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
    return response;
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

test("a POST from the request's own origin is forwarded even when the configured origin differs", async () => {
  // Regression test for the live Netlify deploy, whose BETTER_AUTH_URL
  // points at the Render host: a browser on the Netlify host sends its
  // own origin, which is same-origin by definition and must be accepted.
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
    assert.equal(response.status, 201);
    assert.equal(calls.length, 1);
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

test("a backend 5xx becomes a 503 with a friendly message", async () => {
  stubFetch(jsonResponse({ message: "boom" }, 500));
  try {
    const response = await forwardApiRequest(
      new Request("https://app.example.com/api/profile"),
      "/api/profile",
    );
    assert.equal(response.status, 503);
    assert.equal(
      (await response.json()).message,
      "Your records could not be saved or loaded. Please try again.",
    );
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
