import assert from "node:assert/strict";
import test from "node:test";
import { ema, macd, rsi, sma } from "../lib/indicators.ts";

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(
    typeof actual === "number" && Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test("sma averages the last N closes and aligns with nulls", () => {
  assert.deepEqual(sma([10, 11, 12, 13, 14], 3), [null, null, 11, 12, 13]);
  assert.deepEqual(sma([5, 5, 5, 5], 1), [5, 5, 5, 5]);
  assert.deepEqual(sma([10, 11], 3), [null, null]);
  assert.deepEqual(sma([], 3), []);
});

test("ema seeds with the SMA and smooths with k = 2 / (n + 1)", () => {
  // Seed SMA(10, 11, 12) = 11; k = 0.5; EMA(13) = 12; EMA(14) = 13.
  assert.deepEqual(ema([10, 11, 12, 13, 14], 3), [null, null, 11, 12, 13]);
  // EMA(2): k = 2/3; seed SMA(10, 12) = 11; EMA(11) = 11; EMA(13) = 37/3.
  const values = ema([10, 12, 11, 13], 2);
  closeTo(values[1], 11);
  closeTo(values[2], 11);
  closeTo(values[3], 37 / 3);
});

test("rsi matches the Investopedia example: 55.55", () => {
  // Investopedia: seven up days averaging a 1% gain and seven down days
  // averaging a 0.8% loss over 14 periods gives RSI 55.55. The same ratio
  // in absolute terms: seven +1 moves and seven −0.8 moves.
  const closes = [100];
  for (let i = 0; i < 7; i++) {
    closes.push(closes[closes.length - 1] + 1);
    closes.push(closes[closes.length - 1] - 0.8);
  }
  const values = rsi(closes, 14);
  assert.equal(
    values.slice(0, 14).every((v) => v === null),
    true,
  );
  closeTo(values[14], 55.555555, 0.01);
});

test("rsi applies Wilder smoothing after the first value", () => {
  // Hand-computed: changes +1, −1, +1, −1 with period 2.
  // First averages: gain 0.5, loss 0.5 → RSI 50.
  // Smooth with +1: gain 0.75, loss 0.25 → RS 3 → RSI 75.
  // Smooth with −1: gain 0.375, loss 0.625 → RS 0.6 → RSI 37.5.
  assert.deepEqual(rsi([10, 11, 10, 11, 10], 2), [null, null, 50, 75, 37.5]);
});

test("rsi handles one-sided and flat markets", () => {
  // All gains, no losses → 100; all losses, no gains → 0.
  assert.deepEqual(rsi([10, 11, 12, 13], 2), [null, null, 100, 100]);
  assert.deepEqual(rsi([13, 12, 11, 10], 2), [null, null, 0, 0]);
  // No moves at all → 50.
  assert.deepEqual(rsi([10, 10, 10, 10], 2), [null, null, 50, 50]);
});

test("rsi needs period + 1 closes for its first value", () => {
  assert.deepEqual(rsi([10, 11, 12], 3), [null, null, null]);
  assert.equal(rsi([10, 11, 12, 13], 3).length, 4);
});

test("macd matches hand-computed exact fractions", () => {
  // Closes [10, 12, 11, 13, 12, 14], fast 2, slow 3, signal 2.
  // MACD line: 0, 1/3, 1/9, 10/27. Signal: seed 1/6, then 7/54, 47/162.
  const values = macd([10, 12, 11, 13, 12, 14], 2, 3, 2);
  assert.deepEqual(values.slice(0, 3), [null, null, null]);
  // The first full row is the signal seed: MACD 1/3, signal 1/6.
  closeTo(values[3].macd, 1 / 3, 1e-9);
  closeTo(values[3].signal, 1 / 6, 1e-9);
  closeTo(values[3].histogram, 1 / 6, 1e-9);
  closeTo(values[4].macd, 1 / 9, 1e-9);
  closeTo(values[4].signal, 7 / 54, 1e-9);
  closeTo(values[4].histogram, -1 / 54, 1e-9);
  closeTo(values[5].macd, 10 / 27, 1e-9);
  closeTo(values[5].signal, 47 / 162, 1e-9);
  closeTo(values[5].histogram, 13 / 162, 1e-9);
});

test("macd on a straight line is constant with a zero histogram", () => {
  const values = macd([10, 11, 12, 13, 14, 15], 2, 3, 2);
  for (const point of values.slice(3)) {
    closeTo(point.macd, 0.5, 1e-9);
    closeTo(point.signal, 0.5, 1e-9);
    closeTo(point.histogram, 0, 1e-9);
  }
});

test("indicators reject invalid periods and non-finite input", () => {
  assert.throws(() => sma([1, 2], 0), RangeError);
  assert.throws(() => sma([1, 2], 1.5), RangeError);
  assert.throws(() => ema([1, NaN], 2), TypeError);
  assert.throws(() => rsi([1, Infinity], 2), TypeError);
  assert.throws(() => macd([1, 2, 3], 26, 12, 9), RangeError);
});
