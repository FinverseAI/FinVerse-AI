import assert from "node:assert/strict";
import test from "node:test";
import { cagr, cagrFromDates, xirr } from "../lib/portfolio.ts";

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(
    typeof actual === "number" && Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test("cagr matches the synopsis formula", () => {
  // (12100 / 10000) ^ (1/2) − 1 = 0.10 exactly.
  closeTo(cagr(10000, 12100, 2), 0.1, 1e-12);
  // Excel RRI example: (25000 / 10000) ^ (1/5) − 1 ≈ 0.2011.
  closeTo(cagr(10000, 25000, 5), 0.2011, 0.0001);
  // A total loss is −100%.
  assert.equal(cagr(10000, 0, 3), -1);
});

test("cagr returns null for inputs with no defined rate", () => {
  assert.equal(cagr(0, 10000, 2), null);
  assert.equal(cagr(-100, 10000, 2), null);
  assert.equal(cagr(10000, -100, 2), null);
  assert.equal(cagr(10000, 12100, 0), null);
  assert.equal(cagr(10000, 12100, -1), null);
  assert.equal(cagr(Number.NaN, 10000, 2), null);
});

test("cagrFromDates measures years in 365-day years", () => {
  // Exactly two 365-day years: 10000 → 12100 is 10%.
  closeTo(cagrFromDates(10000, 12100, "2024-01-01", "2026-01-01"), 0.1, 0.001);
  assert.equal(cagrFromDates(10000, 12100, "2026-01-01", "2024-01-01"), null);
  assert.equal(cagrFromDates(10000, 12100, "2026-01-01", "2026-01-01"), null);
  assert.equal(cagrFromDates(10000, 12100, "not-a-date", "2026-01-01"), null);
});

test("xirr matches Microsoft's documented Excel example: 37.34%", () => {
  // Microsoft Support, XIRR function: −10000 on 1 Jan 2008, then 2750
  // (1 Mar 08), 4250 (30 Oct 08), 3250 (15 Feb 09), 2750 (1 Apr 09).
  // Excel returns 0.373362535.
  const result = xirr([
    { amount: -10000, date: "2008-01-01" },
    { amount: 2750, date: "2008-03-01" },
    { amount: 4250, date: "2008-10-30" },
    { amount: 3250, date: "2009-02-15" },
    { amount: 2750, date: "2009-04-01" },
  ]);
  closeTo(result, 0.373362535, 0.0001);
});

test("xirr is exact for a single one-year round trip", () => {
  // −10000 on 2021-01-01, +11000 exactly 365 days later: 10%.
  closeTo(
    xirr([
      { amount: -10000, date: "2021-01-01" },
      { amount: 11000, date: "2022-01-01" },
    ]),
    0.1,
    1e-9,
  );
  // A leap-year span prices the extra day: 366 days for the same 10%.
  closeTo(
    xirr([
      { amount: -10000, date: "2020-01-01" },
      { amount: 11000, date: "2021-01-01" },
    ]),
    Math.pow(1.1, 365 / 366) - 1,
    1e-9,
  );
});

test("xirr accepts Date objects and unsorted flows", () => {
  const result = xirr([
    { amount: 11000, date: new Date("2022-01-01T00:00:00Z") },
    { amount: -10000, date: new Date("2021-01-01T00:00:00Z") },
  ]);
  closeTo(result, 0.1, 1e-9);
});

test("xirr returns null when no rate exists", () => {
  assert.equal(xirr([]), null);
  assert.equal(xirr([{ amount: -1000, date: "2021-01-01" }]), null);
  // All flows on one side of zero: no sign change, no IRR.
  assert.equal(
    xirr([
      { amount: -1000, date: "2021-01-01" },
      { amount: -2000, date: "2022-01-01" },
    ]),
    null,
  );
  assert.equal(
    xirr([
      { amount: 1000, date: "2021-01-01" },
      { amount: 2000, date: "2022-01-01" },
    ]),
    null,
  );
  // A zero flow or a bad date invalidates the schedule.
  assert.equal(
    xirr([
      { amount: -1000, date: "2021-01-01" },
      { amount: 0, date: "2022-01-01" },
    ]),
    null,
  );
  assert.equal(
    xirr([
      { amount: -1000, date: "2021-01-01" },
      { amount: 1100, date: "not-a-date" },
    ]),
    null,
  );
});
