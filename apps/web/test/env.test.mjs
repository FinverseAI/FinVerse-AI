import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

await register("./tsx-loader.mjs", import.meta.url);

const { backendApiUrl, backendUrl, webOrigin } = await import("../lib/env.ts");

const originalEnv = { ...process.env };

function setEnv(vars) {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("webOrigin returns the configured auth origin without its path", () => {
  setEnv({ BETTER_AUTH_URL: "https://app.example.com/some/path" });
  assert.equal(webOrigin(), "https://app.example.com");
  setEnv(originalEnv);
});

test("webOrigin falls back to localhost outside production", () => {
  setEnv({ BETTER_AUTH_URL: undefined, NODE_ENV: "test" });
  assert.equal(webOrigin(), "http://localhost:3000");
  setEnv(originalEnv);
});

test("backendApiUrl keeps a path-less base and appends the API path", () => {
  setEnv({ BACKEND_URL: "https://api.example.com" });
  assert.equal(
    backendApiUrl("/api/profile").href,
    "https://api.example.com/api/profile",
  );
  setEnv(originalEnv);
});

test("backendApiUrl keeps the Netlify function path instead of discarding it", () => {
  setEnv({ BACKEND_URL: "https://app.example.com/.netlify/functions/api" });
  assert.equal(
    backendApiUrl("/api/profile").href,
    "https://app.example.com/.netlify/functions/api/api/profile",
  );
  setEnv(originalEnv);
});

test("backendApiUrl tolerates a trailing slash and a path without a leading slash", () => {
  setEnv({ BACKEND_URL: "https://api.example.com/base/" });
  assert.equal(
    backendApiUrl("api/profile").href,
    "https://api.example.com/base/api/profile",
  );
  setEnv(originalEnv);
});

test("backendUrl falls back to localhost outside production", () => {
  setEnv({ BACKEND_URL: undefined, NODE_ENV: "test" });
  assert.equal(backendUrl().href, "http://localhost:3001/");
  setEnv(originalEnv);
});

test("a non-HTTP URL or one with credentials is rejected", () => {
  setEnv({ BACKEND_URL: "ftp://api.example.com" });
  assert.throws(() => backendUrl(), /must be an HTTP\(S\) URL/);
  setEnv({ BACKEND_URL: "https://user:pass@api.example.com" });
  assert.throws(() => backendUrl(), /without credentials/);
  setEnv({ BACKEND_URL: "not a url" });
  assert.throws(() => backendUrl(), /must be a valid HTTP\(S\) URL/);
  setEnv(originalEnv);
});

test("production requires both URLs and HTTPS for the web origin", () => {
  setEnv({ NODE_ENV: "production", BETTER_AUTH_URL: undefined });
  assert.throws(() => webOrigin(), /BETTER_AUTH_URL is required/);
  setEnv({ BETTER_AUTH_URL: "http://app.example.com" });
  assert.throws(() => webOrigin(), /must use HTTPS in production/);
  setEnv({ NODE_ENV: "production", BACKEND_URL: undefined });
  assert.throws(() => backendUrl(), /BACKEND_URL is required/);
  setEnv(originalEnv);
});
