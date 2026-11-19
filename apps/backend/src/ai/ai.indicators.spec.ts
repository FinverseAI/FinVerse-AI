import { ema, macd, rsi, sma } from './indicators';

/**
 * The port must behave byte-identically to apps/web/lib/indicators.ts:
 * every case here mirrors the web test suite's reference values, so a
 * drift in either copy is caught by its own suite.
 */
describe('ai indicators (web-lib port)', () => {
  describe('sma', () => {
    it('averages the last N closes and aligns with nulls', () => {
      expect(sma([10, 11, 12, 13, 14], 3)).toEqual([null, null, 11, 12, 13]);
      expect(sma([5, 5, 5, 5], 1)).toEqual([5, 5, 5, 5]);
      expect(sma([10, 11], 3)).toEqual([null, null]);
      expect(sma([], 3)).toEqual([]);
    });
  });

  describe('ema', () => {
    it('seeds with the SMA and smooths with k = 2 / (n + 1)', () => {
      expect(ema([10, 11, 12, 13, 14], 3)).toEqual([null, null, 11, 12, 13]);
      const values = ema([10, 12, 11, 13], 2);
      expect(values[1]).toBeCloseTo(11, 9);
      expect(values[2]).toBeCloseTo(11, 9);
      expect(values[3]).toBeCloseTo(37 / 3, 9);
    });
  });

  describe('rsi', () => {
    it('matches the Investopedia example: 55.55', () => {
      const closes = [100];
      for (let i = 0; i < 7; i++) {
        closes.push(closes[closes.length - 1] + 1);
        closes.push(closes[closes.length - 1] - 0.8);
      }
      const values = rsi(closes, 14);
      expect(values.slice(0, 14).every((v) => v === null)).toBe(true);
      expect(values[14]).toBeCloseTo(55.555555, 2);
    });

    it('applies Wilder smoothing after the first value', () => {
      expect(rsi([10, 11, 10, 11, 10], 2)).toEqual([null, null, 50, 75, 37.5]);
    });

    it('handles one-sided and flat markets', () => {
      expect(rsi([10, 11, 12, 13], 2)).toEqual([null, null, 100, 100]);
      expect(rsi([13, 12, 11, 10], 2)).toEqual([null, null, 0, 0]);
      expect(rsi([10, 10, 10, 10], 2)).toEqual([null, null, 50, 50]);
    });

    it('needs period + 1 closes for its first value', () => {
      expect(rsi([10, 11, 12], 3)).toEqual([null, null, null]);
      expect(rsi([10, 11, 12, 13], 3).length).toBe(4);
    });
  });

  describe('macd', () => {
    it('matches hand-computed exact fractions', () => {
      const values = macd([10, 12, 11, 13, 12, 14], 2, 3, 2);
      expect(values.slice(0, 3)).toEqual([null, null, null]);
      expect(values[3]?.macd).toBeCloseTo(1 / 3, 9);
      expect(values[3]?.signal).toBeCloseTo(1 / 6, 9);
      expect(values[3]?.histogram).toBeCloseTo(1 / 6, 9);
      expect(values[4]?.macd).toBeCloseTo(1 / 9, 9);
      expect(values[4]?.signal).toBeCloseTo(7 / 54, 9);
      expect(values[4]?.histogram).toBeCloseTo(-1 / 54, 9);
      expect(values[5]?.macd).toBeCloseTo(10 / 27, 9);
      expect(values[5]?.signal).toBeCloseTo(47 / 162, 9);
      expect(values[5]?.histogram).toBeCloseTo(13 / 162, 9);
    });

    it('on a straight line is constant with a zero histogram', () => {
      const values = macd([10, 11, 12, 13, 14, 15], 2, 3, 2);
      for (const point of values.slice(3)) {
        expect(point?.macd).toBeCloseTo(0.5, 9);
        expect(point?.signal).toBeCloseTo(0.5, 9);
        expect(point?.histogram).toBeCloseTo(0, 9);
      }
    });
  });

  it('rejects invalid periods and non-finite input', () => {
    expect(() => sma([1, 2], 0)).toThrow(RangeError);
    expect(() => sma([1, 2], 1.5)).toThrow(RangeError);
    expect(() => ema([1, NaN], 2)).toThrow(TypeError);
    expect(() => rsi([1, Infinity], 2)).toThrow(TypeError);
    expect(() => macd([1, 2, 3], 26, 12, 9)).toThrow(RangeError);
  });
});
