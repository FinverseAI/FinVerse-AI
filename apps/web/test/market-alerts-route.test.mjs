import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

await register("./tsx-loader.mjs", import.meta.url);

// The proxy reads these per request, so the test controls both ends: the
// configured web origin (BETTER_AUTH_URL) and the backend base, including
// the Netlify function path the backend lives under in production.
process.env.BETTER_AUTH_URL = "https://app.example.com";
process.env.BACKEND_URL = "https://app.example.com/.netlify/functions/api";

const { GET } = await import("../app/api/market/alerts/route.ts");

const { DELETE } = await import("../app/api/market/alerts/[id]/route.ts");

const originalFetch = globalThis.fetch;

test("GET /api/market/alerts exists and forwards to the backend alerts endpoint", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify([{ id: "a1" }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const response = await GET(
      new Request("https://app.example.com/api/market/alerts", {
        headers: { cookie: "session=abc" },
      }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{ id: "a1" }]);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "https://app.example.com/.netlify/functions/api/api/market/alerts",
    );
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.cookie, "session=abc");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("DELETE /api/market/alerts/:id forwards to the backend dismiss endpoint (B26)", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ dismissed: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const response = await DELETE(
      new Request("https://app.example.com/api/market/alerts/watch-1", {
        method: "DELETE",
        headers: {
          cookie: "session=abc",
          origin: "https://app.example.com",
        },
      }),
      { params: Promise.resolve({ id: "watch-1" }) },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { dismissed: true });
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "https://app.example.com/.netlify/functions/api/api/market/alerts/watch-1",
    );
    assert.equal(calls[0].init.method, "DELETE");
    assert.equal(calls[0].init.headers.cookie, "session=abc");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
