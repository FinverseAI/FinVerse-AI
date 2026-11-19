import assert from "node:assert/strict";
import test from "node:test";
import {
  efficientFrontier,
  logReturns,
  maxSharpeWeights,
  minVarianceWeights,
  returnsStats,
  sharpeRatio,
  solveLinearSystem,
} from "../lib/optimization.ts";

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(
    typeof actual === "number" && Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

// Two-asset case with a closed-form answer. Returns:
//   A: [0.10, 0.20, 0.15] → mean 0.15, sample variance 0.0025
//   B: [0.06, 0.04, 0.08] → mean 0.06, sample variance 0.0004
// Covariance: −0.0005. With rf = 0 the tangency weights are 2/7 and 5/7,
// the portfolio mean is 0.0857, volatility 0.014286, Sharpe exactly 6.
const seriesA = [0.1, 0.2, 0.15];
const seriesB = [0.06, 0.04, 0.08];
const means = [0.15, 0.06];
const covariance = [
  [0.0025, -0.0005],
  [-0.0005, 0.0004],
];

test("logReturns takes natural log price ratios", () => {
  const values = logReturns([100, 110, 121]);
  closeTo(values[0], Math.log(1.1));
  closeTo(values[1], Math.log(1.1));
  assert.throws(() => logReturns([100, 0]), RangeError);
  assert.throws(() => logReturns([100, -5]), RangeError);
});

test("returnsStats computes annualised sample means and covariance", () => {
  const stats = returnsStats([seriesA, seriesB], 1);
  closeTo(stats.means[0], 0.15, 1e-12);
  closeTo(stats.means[1], 0.06, 1e-12);
  closeTo(stats.covariance[0][0], 0.0025, 1e-12);
  closeTo(stats.covariance[1][1], 0.0004, 1e-12);
  closeTo(stats.covariance[0][1], -0.0005, 1e-12);
  closeTo(stats.covariance[1][0], -0.0005, 1e-12);
  // Annualisation scales means by 252 and covariance by 252.
  const annual = returnsStats([seriesA, seriesB], 252);
  closeTo(annual.means[0], 0.15 * 252, 1e-9);
  closeTo(annual.covariance[0][0], 0.0025 * 252, 1e-9);
});

test("returnsStats returns null for unusable series", () => {
  assert.equal(returnsStats([], 1), null);
  assert.equal(returnsStats([[0.1]], 1), null);
  assert.equal(returnsStats([[0.1, 0.2], [0.1]], 1), null);
  assert.equal(returnsStats([[0.1, NaN]], 1), null);
  assert.equal(returnsStats([[0.1, 0.2]], 0), null);
});

test("sharpeRatio is excess return per unit of risk", () => {
  closeTo(sharpeRatio(0.12, 0.2, 0.02), 0.5, 1e-12);
  assert.equal(sharpeRatio(0.12, 0, 0.02), null);
});

test("solveLinearSystem solves and reports singular systems", () => {
  assert.deepEqual(
    solveLinearSystem(
      [
        [2, 1],
        [1, 3],
      ],
      [5, 10],
    ).map((v) => Math.round(v * 1e9) / 1e9),
    [1, 3],
  );
  assert.equal(
    solveLinearSystem(
      [
        [1, 2],
        [2, 4],
      ],
      [1, 2],
    ),
    null,
  );
});

test("maxSharpeWeights matches the closed-form two-asset solution", () => {
  const result = maxSharpeWeights(means, covariance, 0);
  assert.notEqual(result, null);
  closeTo(result.weights[0], 2 / 7, 1e-9);
  closeTo(result.weights[1], 5 / 7, 1e-9);
  closeTo(result.weights[0] + result.weights[1], 1, 1e-12);
  closeTo(result.expectedReturn, 0.0857142857, 1e-9);
  closeTo(result.volatility, 0.0142857143, 1e-9);
  closeTo(result.sharpe, 6, 1e-9);
  // The tangency Sharpe beats either asset alone (both are 3.0).
  assert.ok(result.sharpe > sharpeRatio(0.15, 0.05, 0));
  assert.ok(result.sharpe > sharpeRatio(0.06, 0.02, 0));
});

test("maxSharpeWeights accounts for the risk-free rate", () => {
  // rf = 0.03: excess means 0.12 and 0.03 → weights 7/22 and 15/22.
  const result = maxSharpeWeights(means, covariance, 0.03);
  assert.notEqual(result, null);
  closeTo(result.weights[0], 7 / 22, 1e-9);
  closeTo(result.weights[1], 15 / 22, 1e-9);
});

test("maxSharpeWeights is long-only and returns null without excess return", () => {
  // A dominates B so strongly the unconstrained solution shorts B.
  const result = maxSharpeWeights(
    [0.3, 0.01],
    [
      [0.01, 0.009],
      [0.009, 0.01],
    ],
    0,
  );
  assert.notEqual(result, null);
  assert.ok(result.weights.every((w) => w >= 0));
  closeTo(result.weights[0] + result.weights[1], 1, 1e-12);
  // No asset beats the risk-free rate: nothing to allocate to.
  assert.equal(maxSharpeWeights([0.01, 0.02], covariance, 0.05), null);
  // A singular covariance matrix yields null, not a fabricated answer.
  assert.equal(
    maxSharpeWeights(
      [0.1, 0.1],
      [
        [0.01, 0.01],
        [0.01, 0.01],
      ],
      0,
    ),
    null,
  );
});

test("maxSharpeWeights handles a single asset", () => {
  const result = maxSharpeWeights([0.1], [[0.04]], 0.02);
  assert.notEqual(result, null);
  assert.deepEqual(result.weights, [1]);
  closeTo(result.sharpe, 0.4, 1e-12);
  assert.equal(maxSharpeWeights([0.01], [[0.04]], 0.02), null);
});

test("minVarianceWeights beats each asset on volatility", () => {
  const result = minVarianceWeights(means, covariance, 0);
  assert.notEqual(result, null);
  closeTo(result.weights[0] + result.weights[1], 1, 1e-12);
  assert.ok(result.weights.every((w) => w >= 0));
  // Min-variance volatility is below either asset's own volatility.
  assert.ok(result.volatility < 0.05);
  assert.ok(result.volatility < 0.02);
});

test("efficientFrontier returns a valid risk-return curve", () => {
  const frontier = efficientFrontier(means, covariance, 0, 6);
  assert.equal(frontier.length, 6);
  for (const point of frontier) {
    closeTo(
      point.weights.reduce((a, b) => a + b, 0),
      1,
      1e-9,
    );
    assert.ok(point.weights.every((w) => w >= -1e-12));
    assert.ok(point.volatility >= 0);
  }
  // Sorted by rising volatility; on the efficient (upper) branch, returns
  // rise with volatility.
  for (let i = 1; i < frontier.length; i++) {
    assert.ok(frontier[i].volatility >= frontier[i - 1].volatility - 1e-12);
    assert.ok(
      frontier[i].expectedReturn >= frontier[i - 1].expectedReturn - 1e-12,
    );
  }
  // The frontier starts at the minimum-variance portfolio.
  const minVar = minVarianceWeights(means, covariance, 0);
  closeTo(frontier[0].volatility, minVar.volatility, 1e-9);
  closeTo(frontier[0].expectedReturn, minVar.expectedReturn, 1e-9);
});
