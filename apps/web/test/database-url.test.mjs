import assert from "node:assert/strict";
import test from "node:test";
import { databaseUrl } from "../lib/database-url.ts";

test("runtime connections use a bounded pool and preserve provider parameters", () => {
  const url = new URL(
    databaseUrl("postgresql://user:pass@db.example/finance?sslmode=require"),
  );
  assert.equal(url.searchParams.get("connection_limit"), "5");
  assert.equal(url.searchParams.get("pool_timeout"), "15");
  assert.equal(url.searchParams.get("connect_timeout"), "20");
  assert.equal(url.searchParams.get("sslmode"), "require");
  assert.equal(url.pathname, "/finance");
});

test("explicit pool settings are retained", () => {
  const url = new URL(
    databaseUrl(
      "postgresql://db.example/finance?connection_limit=2&pool_timeout=8",
    ),
  );
  assert.equal(url.searchParams.get("connection_limit"), "2");
  assert.equal(url.searchParams.get("pool_timeout"), "8");
  assert.equal(databaseUrl(undefined), undefined);
});
