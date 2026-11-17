import assert from "node:assert/strict";
import test from "node:test";
import { readRequestBody, RequestBodyError } from "../lib/request-body.ts";

test("the proxy limits bodies even without a content-length header", async () => {
  const small = JSON.stringify({ name: "Monthly rent" });
  assert.equal(
    await readRequestBody(
      new Request("https://finance.example", { method: "POST", body: small }),
    ),
    small,
  );
  await assert.rejects(
    readRequestBody(
      new Request("https://finance.example", {
        method: "POST",
        body: "x".repeat(65537),
      }),
    ),
    RequestBodyError,
  );
});
