/**
 * Technical indicators computed from closing prices. Pure functions with no
 * I/O, so they are unit-tested against hand-computed and published reference
 * values (see test/indicators.test.mjs).
 *
 * Every function returns an array aligned with its input: entries before the
 * indicator can be computed are `null`, so index `i` of the result always
 * describes the same bar as index `i` of the input.
 */

export interface IndicatorBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

function checkPeriod(period: number) {
  if (!Number.isInteger(period) || period < 1) {
    throw new RangeError("The period must be a positive integer.");
  }
}

function checkCloses(closes: number[]) {
  for (const close of closes) {
    if (typeof close !== "number" || !Number.isFinite(close)) {
      throw new TypeError("Closes must be finite numbers.");
    }
  }
}

/** Simple moving average: the mean of the last `period` closes. */
export function sma(closes: number[], period: number): (number | null)[] {
  checkPeriod(period);
  checkCloses(closes);
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period) return result;
  let window = 0;
  for (let i = 0; i < closes.length; i++) {
    // The loop bounds prove every index below in range; `!` marks that.
    window += closes[i]!;
    if (i >= period) window -= closes[i - period]!;
    if (i >= period - 1) result[i] = window / period;
  }
  return result;
}

/**
 * Exponential moving average with smoothing factor k = 2 / (period + 1),
 * seeded with the simple average of the first `period` closes (the standard
 * convention used by most charting platforms).
 */
export function ema(closes: number[], period: number): (number | null)[] {
  checkPeriod(period);
  checkCloses(closes);
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period) return result;
  const k = 2 / (period + 1);
  let previous = 0;
  for (let i = 0; i < period; i++) previous += closes[i]!;
  previous /= period;
  result[period - 1] = previous;
  for (let i = period; i < closes.length; i++) {
    previous = closes[i]! * k + previous * (1 - k);
    result[i] = previous;
  }
  return result;
}

/**
 * Wilder's Relative Strength Index. The first value is the plain average of
 * gains and losses over the first `period` changes; later values use
 * Wilder's smoothing: average = (previous average × (period − 1) + current
 * gain or loss) / period. A flat market (no gains and no losses) reads 50;
 * a market with gains and no losses reads 100.
 */
export function rsi(closes: number[], period = 14): (number | null)[] {
  checkPeriod(period);
  checkCloses(closes);
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return result;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i]! - closes[i - 1]!;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  let averageGain = 0;
  let averageLoss = 0;
  for (let i = 0; i < period; i++) {
    averageGain += gains[i]!;
    averageLoss += losses[i]!;
  }
  averageGain /= period;
  averageLoss /= period;
  const value = () => {
    if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
    return 100 - 100 / (1 + averageGain / averageLoss);
  };
  result[period] = value();
  for (let i = period; i < gains.length; i++) {
    averageGain = (averageGain * (period - 1) + gains[i]!) / period;
    averageLoss = (averageLoss * (period - 1) + losses[i]!) / period;
    result[i + 1] = value();
  }
  return result;
}

export interface MacdPoint {
  macd: number;
  signal: number;
  histogram: number;
}

/**
 * Moving Average Convergence Divergence. The MACD line is EMA(fast) minus
 * EMA(slow); the signal line is the EMA(signal) of the MACD line, seeded
 * with the simple average of its first `signal` values. Rows are `null`
 * until all three values exist.
 */
export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): (MacdPoint | null)[] {
  checkPeriod(fast);
  checkPeriod(slow);
  checkPeriod(signalPeriod);
  checkCloses(closes);
  const result: (MacdPoint | null)[] = new Array(closes.length).fill(null);
  if (fast >= slow) {
    throw new RangeError(
      "The fast period must be shorter than the slow period.",
    );
  }
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const line: number[] = [];
  const lineIndex: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const fast = fastEma[i];
    const slow = slowEma[i];
    if (typeof fast === "number" && typeof slow === "number") {
      line.push(fast - slow);
      lineIndex.push(i);
    }
  }
  if (line.length < signalPeriod) return result;
  const k = 2 / (signalPeriod + 1);
  let signal = 0;
  for (let i = 0; i < signalPeriod; i++) signal += line[i]!;
  signal /= signalPeriod;
  const seedIndex = lineIndex[signalPeriod - 1]!;
  const seedValue = line[signalPeriod - 1]!;
  result[seedIndex] = {
    macd: seedValue,
    signal,
    histogram: seedValue - signal,
  };
  for (let i = signalPeriod; i < line.length; i++) {
    const value = line[i]!;
    signal = value * k + signal * (1 - k);
    result[lineIndex[i]!] = {
      macd: value,
      signal,
      histogram: value - signal,
    };
  }
  return result;
}
