import assert from "node:assert/strict";
import test from "node:test";
import {
  activityRequest,
  ActivityApiError,
} from "../app/(module-one)/dashboard/use-activity.ts";

test("activity errors handle malformed and empty server responses without crashing", async (context) => {
  context.mock.method(
    globalThis,
    "fetch",
    async () => new Response("upstream unavailable", { status: 502 }),
  );
  await assert.rejects(activityRequest("/api/bills"), /invalid response/);
  globalThis.fetch = async () => Response.json(null, { status: 503 });
  await assert.rejects(
    activityRequest("/api/bills"),
    (error) => error instanceof ActivityApiError && error.status === 503,
  );
});

test("activity errors retain HTTP status for already-removed records", async (context) => {
  context.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: "Not found" }, { status: 404 }),
  );
  await assert.rejects(
    activityRequest("/api/bills/gone", { method: "DELETE" }),
    (error) => error.status === 404,
  );
});
