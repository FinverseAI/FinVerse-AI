import {
  SCREEN_FILTERS_JSON_SCHEMA,
  SCREEN_FILTER_KEYS,
  ScreenFiltersSchema,
} from './rag.validation';

describe('ScreenFiltersSchema', () => {
  it('accepts an empty filter set', () => {
    expect(ScreenFiltersSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a full filter set', () => {
    const parsed = ScreenFiltersSchema.safeParse({
      symbols: ['reliance.ns', 'TCS.NS'],
      minPrice: 100,
      maxPrice: 5000,
      minMarketCapCr: 100000,
      minRsi: 30,
      maxRsi: 70,
      minPe: 5,
      maxPe: 40,
      minChange1mo: -5,
      maxChange1mo: 20,
      trend: 'above-sma20',
      sector: 'Energy',
      limit: 10,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.symbols).toEqual(['RELIANCE.NS', 'TCS.NS']);
      expect(parsed.data.limit).toBe(10);
    }
  });

  it('normalises symbols to upper case', () => {
    const parsed = ScreenFiltersSchema.safeParse({ symbols: ['infy.ns'] });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.symbols).toEqual(['INFY.NS']);
  });

  it('rejects an invalid symbol', () => {
    const parsed = ScreenFiltersSchema.safeParse({
      symbols: ['NOT A SYMBOL'],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects more than 20 symbols', () => {
    const parsed = ScreenFiltersSchema.safeParse({
      symbols: Array.from({ length: 21 }, (_, i) => `SYM${i}.NS`),
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a min above its max', () => {
    for (const filters of [
      { minPrice: 500, maxPrice: 100 },
      { minMarketCapCr: 500, maxMarketCapCr: 100 },
      { minRsi: 70, maxRsi: 30 },
      { minPe: 40, maxPe: 5 },
      { minChange1mo: 10, maxChange1mo: -10 },
    ]) {
      expect(ScreenFiltersSchema.safeParse(filters).success).toBe(false);
    }
  });

  it('rejects an out-of-range RSI', () => {
    expect(ScreenFiltersSchema.safeParse({ minRsi: -1 }).success).toBe(false);
    expect(ScreenFiltersSchema.safeParse({ maxRsi: 101 }).success).toBe(false);
  });

  it('rejects an unknown trend', () => {
    expect(ScreenFiltersSchema.safeParse({ trend: 'sideways' }).success).toBe(
      false,
    );
  });

  it('rejects a limit outside 1..50', () => {
    expect(ScreenFiltersSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(ScreenFiltersSchema.safeParse({ limit: 51 }).success).toBe(false);
  });

  it('keeps the NL tool JSON schema in sync with the Zod schema', () => {
    const properties = SCREEN_FILTERS_JSON_SCHEMA.properties as Record<
      string,
      unknown
    >;
    expect(Object.keys(properties).sort()).toEqual(
      [...SCREEN_FILTER_KEYS].sort(),
    );
    const trend = properties.trend as { enum: string[] };
    expect(trend.enum).toEqual([
      'above-sma20',
      'below-sma20',
      'above-sma50',
      'below-sma50',
      'golden-cross',
      'death-cross',
    ]);
  });
});
