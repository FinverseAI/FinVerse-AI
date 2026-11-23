import assert from "node:assert/strict";
import test from "node:test";
import {
  ProfileApiError,
  cents,
  fetchProfile,
  profileInput,
  profileTotals,
  readProfileResponse,
} from "../lib/profile.ts";

const profile = {
  payday: 1,
  budget_split: { rent: 30, groceries: 15, food: 10, transport: 10, bills: 5 },
  employment_type: "salaried",
  monthly_income: "85000.00",
  other_monthly_income: "5000.00",
  fixed_expenses: "30000.00",
  variable_expenses: "20000.00",
  existing_debt_total: "0.00",
  current_savings: "150000.00",
  monthly_savings_target: "20000.00",
  investment_experience: "beginner",
  risk_tolerance: "medium",
  already_investing: true,
  invested_amount: "50000.00",
  emergency_fund_months: "3-6",
};

const goals = [
  {
    id: "goal-1",
    name: "Emergency fund",
    target_amount: "300000.00",
    target_date: "2027-06-30",
    priority: "high",
    saved_amount: "150000.00",
  },
  {
    name: "New laptop",
    target_amount: "120000.00",
    target_date: "2027-03-31",
    priority: "medium",
  },
];

const response = {
  profile: {
    ...profile,
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-20T00:00:00.000Z",
  },
  goals,
  onboarding_completed: true,
};

test("cents converts exact-paise strings without float drift", () => {
  assert.equal(cents("123.45"), 12345);
  assert.equal(cents("100"), 10000);
  assert.equal(cents("0.5"), 50);
  assert.equal(cents("0.07"), 7);
  assert.equal(cents("0.00"), 0);
  assert.equal(cents(null), 0);
});

test("profileTotals adds other income and derives the surplus", () => {
  const totals = profileTotals(profile);
  assert.equal(totals.income, 90000);
  assert.equal(totals.expenses, 50000);
  assert.equal(totals.target, 20000);
  assert.equal(totals.savings, 150000);
  assert.equal(totals.surplus, 20000);
});

test("profileTotals treats a missing other income as zero", () => {
  const totals = profileTotals({ ...profile, other_monthly_income: null });
  assert.equal(totals.income, 85000);
  assert.equal(totals.surplus, 15000);
});

test("profileInput keeps goal ids so saves update in place", () => {
  const input = profileInput(response);
  assert.equal(input.monthly_income, "85000.00");
  assert.equal(input.goals[0].id, "goal-1");
  assert.equal(input.goals[1].id, undefined);
  assert.equal("saved_amount" in input.goals[0], false);
});

test("profileInput throws when there is no profile to edit", () => {
  assert.throws(
    () =>
      profileInput({ profile: null, goals: [], onboarding_completed: false }),
    /Financial profile is missing/,
  );
});

test("profileInput omits null payday and budget split", () => {
  const input = profileInput({
    ...response,
    profile: { ...response.profile, payday: null, budget_split: null },
  });
  assert.equal("payday" in input, false);
  assert.equal("budget_split" in input, false);
});

test("readProfileResponse returns a well-formed profile", async () => {
  const data = await readProfileResponse(
    new Response(JSON.stringify(response), { status: 200 }),
  );
  assert.equal(data.onboarding_completed, true);
  assert.equal(data.goals.length, 2);
});

test("readProfileResponse surfaces the server message and field errors", async () => {
  await assert.rejects(
    readProfileResponse(
      new Response(
        JSON.stringify({
          message: "Monthly income is required.",
          errors: { monthly_income: "Monthly income is required." },
        }),
        { status: 400 },
      ),
    ),
    (error) => {
      assert.ok(error instanceof ProfileApiError);
      assert.equal(error.message, "Monthly income is required.");
      assert.equal(error.status, 400);
      assert.equal(error.fields.monthly_income, "Monthly income is required.");
      return true;
    },
  );
});

test("readProfileResponse rejects invalid JSON and incomplete shapes", async () => {
  await assert.rejects(
    readProfileResponse(new Response("not json", { status: 200 })),
    /invalid response/,
  );
  await assert.rejects(
    readProfileResponse(
      new Response(JSON.stringify({ goals: [] }), { status: 200 }),
    ),
    /incomplete profile/,
  );
  await assert.rejects(
    readProfileResponse(
      new Response(
        JSON.stringify({
          profile: null,
          goals: [],
          onboarding_completed: true,
        }),
        { status: 200 },
      ),
    ),
    /incomplete profile/,
  );
});

test("fetchProfile posts onboarding to /api/onboarding and updates to /api/profile", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, method: init.method });
    return new Response(JSON.stringify(response), { status: 200 });
  };
  try {
    const input = profileInput(response);
    await fetchProfile("POST", input);
    await fetchProfile("PUT", input);
    await fetchProfile("GET");
    assert.deepEqual(calls, [
      { url: "/api/onboarding", method: "POST" },
      { url: "/api/profile", method: "PUT" },
      { url: "/api/profile", method: "GET" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchProfile reports an unreachable server as a 503", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  try {
    await assert.rejects(fetchProfile("GET"), (error) => {
      assert.ok(error instanceof ProfileApiError);
      assert.equal(error.status, 503);
      assert.match(error.message, /Could not reach the server/);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
