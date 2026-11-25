import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

await register("./tsx-loader.mjs", import.meta.url);

process.env.BETTER_AUTH_URL = "https://app.example.com";
process.env.BACKEND_URL = "http://localhost:3001";

const { getServerProfile } = await import("../lib/profile-server.ts");
const { ProfileApiError } = await import("../lib/profile.ts");

test("getServerProfile turns a failed backend read into a 503 ProfileApiError, not a raw exception", async () => {
  // In this harness next/headers is stubbed to throw, which exercises
  // the same try/catch that wraps the backend fetch: in production a
  // fetch throw (backend down, DNS) takes the identical path. Before
  // the fix the raw exception escaped and the guard rendered the
  // generic error page; now the guard sees a 503 and renders the
  // service-unavailable state.
  await assert.rejects(
    getServerProfile(),
    (error) => error instanceof ProfileApiError && error.status === 503,
  );
});
