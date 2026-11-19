import { BadRequestException } from '@nestjs/common';
import {
  normalizeSymbol,
  validateHolding,
  validateRange,
  validateSearchQuery,
  validateWatchlistItem,
} from './market.validation';

describe('market validation', () => {
  it.each([
    ['reliance.ns', 'RELIANCE.NS'],
    ['  ^nsei ', '^NSEI'],
    ['BRK-B', 'BRK-B'],
    ['USDINR=X', 'USDINR=X'],
    ['RELIANCE.NS', 'RELIANCE.NS'],
  ])('normalizes symbols %p to %p', (input, expected) => {
    expect(normalizeSymbol(input)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    'RELIANCE NS',
    'RELIANCE/NS',
    'A'.repeat(21),
    123,
    null,
    undefined,
    {},
  ])('rejects invalid symbols %p', (input) => {
    expect(() => normalizeSymbol(input)).toThrow(BadRequestException);
  });

  it.each(['1mo', '3mo', '6mo', '1y', '5y'])(
    'accepts history range %s',
    (range) => {
      expect(validateRange(range)).toBe(range);
    },
  );

  it.each(['1d', '2y', '', 42, null, undefined, {}])(
    'defaults unknown history ranges %p to 1y',
    (range) => {
      expect(validateRange(range)).toBe('1y');
    },
  );

  it('trims search queries', () => {
    expect(validateSearchQuery('  reliance  ')).toBe('reliance');
  });

  it.each(['', '   ', 'a'.repeat(101), 42, null, undefined])(
    'rejects invalid search queries %p',
    (query) => {
      expect(() => validateSearchQuery(query)).toThrow(BadRequestException);
    },
  );

  it('validates and normalizes a holding', () => {
    expect(
      validateHolding({
        symbol: 'reliance.ns',
        name: ' Reliance Industries ',
        sector: 'Energy',
        quantity: 10,
        buyPrice: '2450.5',
        buyDate: '2026-01-15',
      }),
    ).toEqual({
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries',
      sector: 'Energy',
      quantity: '10.0000',
      buy_price: '2450.50',
      buy_date: new Date('2026-01-15T00:00:00Z'),
    });
  });

  it('accepts fractional quantities and omits optional holding fields', () => {
    const result = validateHolding({
      symbol: 'TCS.NS',
      quantity: 0.5,
      buyPrice: 4000,
      buyDate: '2026-11-01',
    });
    expect(result.quantity).toBe('0.5000');
    expect(result.name).toBeNull();
    expect(result.sector).toBeNull();
  });

  it.each([
    [
      {
        symbol: 'BAD SYMBOL',
        quantity: 1,
        buyPrice: 100,
        buyDate: '2026-01-01',
      },
    ],
    [{ symbol: 'TCS.NS', quantity: 0, buyPrice: 100, buyDate: '2026-01-01' }],
    [{ symbol: 'TCS.NS', quantity: -1, buyPrice: 100, buyDate: '2026-01-01' }],
    [
      {
        symbol: 'TCS.NS',
        quantity: 1.12345,
        buyPrice: 100,
        buyDate: '2026-01-01',
      },
    ],
    [{ symbol: 'TCS.NS', quantity: 1, buyPrice: 0, buyDate: '2026-01-01' }],
    [{ symbol: 'TCS.NS', quantity: 1, buyPrice: -5, buyDate: '2026-01-01' }],
    [
      {
        symbol: 'TCS.NS',
        quantity: 1,
        buyPrice: 100.123,
        buyDate: '2026-01-01',
      },
    ],
    [{ symbol: 'TCS.NS', quantity: 1, buyPrice: 100, buyDate: '2026-02-30' }],
    [{ symbol: 'TCS.NS', quantity: 1, buyPrice: 100, buyDate: '15-01-2026' }],
    [{ symbol: 'TCS.NS', quantity: 1, buyPrice: 100, buyDate: '9999-12-31' }],
    [
      {
        symbol: 'TCS.NS',
        quantity: 1,
        buyPrice: 100,
        buyDate: '2026-01-01',
        name: 'x'.repeat(121),
      },
    ],
    [
      {
        symbol: 'TCS.NS',
        quantity: 1,
        buyPrice: 100,
        buyDate: '2026-01-01',
        sector: 'x'.repeat(81),
      },
    ],
    [{ symbol: 'TCS.NS', quantity: 1, buyPrice: 100 }],
    [{ symbol: 'TCS.NS', buyPrice: 100, buyDate: '2026-01-01' }],
    [null],
    ['not an object'],
  ])('rejects invalid holdings %p', (input) => {
    expect(() => validateHolding(input)).toThrow(BadRequestException);
  });

  it('validates a watchlist item', () => {
    expect(
      validateWatchlistItem({ symbol: 'infosys.ns', name: 'Infosys' }),
    ).toEqual({ symbol: 'INFOSYS.NS', name: 'Infosys' });
    expect(validateWatchlistItem({ symbol: 'TCS.NS' }).name).toBeNull();
  });

  it.each([
    [{ symbol: 'BAD SYMBOL' }],
    [{ symbol: 'TCS.NS', name: 'x'.repeat(121) }],
    [{ name: 'No symbol' }],
    [null],
  ])('rejects invalid watchlist items %p', (input) => {
    expect(() => validateWatchlistItem(input)).toThrow(BadRequestException);
  });
});
