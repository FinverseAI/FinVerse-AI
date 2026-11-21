import assert from "node:assert/strict";
import test from "node:test";
import { isReadinessAssessment, isReadinessResult } from "../lib/readiness.ts";

const validAssessment = {
  available: true,
  score: 71,
  band: "Ready",
  scale: 100,
  maxScore: 100,
  factors: [
    {
      name: "Emergency fund",
      metric: "emergencyFundMonths",
      points: 18.8,
      maxPoints: 25,
      available: true,
      detail: "Your emergency fund covers 3-6 months of expenses.",
      months: 4.5,
      monthsLabel: "3-6 months",
    },
    {
      name: "Debt-to-income",
      metric: "debtToIncomeRatio",
      points: 16,
      maxPoints: 20,
      available: true,
      detail: "Total debt of ₹1,20,000.",
      debtToIncomeRatio: 0.2,
      totalDebt: 120000,
      annualIncome: 600000,
    },
    {
      name: "Monthly surplus",
      metric: "surplusRatePercent",
      points: 16.7,
      maxPoints: 25,
      available: true,
      detail: "Monthly surplus of ₹10,000.",
      surplus: 10000,
      surplusRatePercent: 20,
    },
    {
      name: "Portfolio concentration",
      metric: "largestHoldingWeightPercent",
      points: 9.4,
      maxPoints: 15,
      available: true,
      detail: "Your largest holding is 50% of your portfolio.",
      largestHoldingSymbol: "RELIANCE.NS",
      largestHoldingWeightPercent: 50,
    },
    {
      name: "Portfolio volatility",
      metric: "volatilityPercent",
      points: 10,
      maxPoints: 15,
      available: true,
      detail: "Annualized volatility is 30%.",
      volatilityPercent: 30,
      holdingsWithHistory: 2,
    },
  ],
  suggestions: [
    {
      factor: "Monthly surplus",
      action:
        "Raising your monthly surplus to ₹15,000 (30% of income) would add 8.3 points.",
      pointsGain: 8.3,
      targetSurplus: 15000,
      targetRatePercent: 30,
    },
  ],
  context: {
    monthlyIncome: 50000,
    monthlySurplus: 10000,
    surplusRatePercent: 20,
    totalDebt: 120000,
    debtToIncomeRatio: 0.2,
    totalPortfolioValue: 100000,
    holdingsCount: 2,
    pricedHoldingsCount: 2,
    largestHolding: { symbol: "RELIANCE.NS", weightPercent: 50 },
    volatilityPercent: 30,
  },
  stale: false,
  asOf: "2026-11-21T10:00:00.000Z",
};

test("isReadinessAssessment accepts a complete assessment", () => {
  assert.equal(isReadinessAssessment(validAssessment), true);
  assert.equal(isReadinessResult(validAssessment), true);
});

test("isReadinessResult accepts the honest unavailable shape", () => {
  assert.equal(
    isReadinessResult({
      available: false,
      reason: "Complete your financial profile to see your score.",
      missing: ["financial profile"],
    }),
    true,
  );
});

test("isReadinessAssessment rejects a missing or mistyped field", () => {
  assert.equal(isReadinessAssessment(null), false);
  assert.equal(isReadinessAssessment({}), false);
  assert.equal(
    isReadinessAssessment({ ...validAssessment, score: "71" }),
    false,
  );
  assert.equal(
    isReadinessAssessment({ ...validAssessment, band: "Excellent" }),
    false,
  );
  assert.equal(
    isReadinessAssessment({ ...validAssessment, factors: [] }),
    true,
  );
  assert.equal(
    isReadinessAssessment({
      ...validAssessment,
      factors: [{ name: "Emergency fund" }],
    }),
    false,
  );
  assert.equal(
    isReadinessAssessment({
      ...validAssessment,
      suggestions: [{ factor: "Monthly surplus" }],
    }),
    false,
  );
});

test("isReadinessResult rejects a malformed unavailable shape", () => {
  assert.equal(isReadinessResult({ available: false }), false);
  assert.equal(
    isReadinessResult({ available: false, reason: "x", missing: "profile" }),
    false,
  );
});

test("the fixture's factors reconcile with its score", () => {
  // Earned points over available weight, rescaled to 100 — the same
  // arithmetic the backend formula documents.
  const earned = validAssessment.factors.reduce(
    (sum, factor) => sum + factor.points,
    0,
  );
  const maxScore = validAssessment.factors.reduce(
    (sum, factor) => sum + factor.maxPoints,
    0,
  );
  assert.equal(maxScore, validAssessment.maxScore);
  assert.equal(Math.round((earned / maxScore) * 100), validAssessment.score);
});
