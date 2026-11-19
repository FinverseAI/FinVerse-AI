import { aggregateSentiment, scoreSentiment } from './rag.sentiment';

describe('scoreSentiment', () => {
  it('scores an all-positive headline +1 and names the words', () => {
    const result = scoreSentiment(
      'Profit surges to record high as growth beats estimates',
    );
    expect(result.score).toBe(1);
    expect(result.label).toBe('positive');
    expect(result.matchedPositive).toEqual(
      expect.arrayContaining(['profit', 'surges', 'record', 'growth', 'beats']),
    );
    expect(result.matchedNegative).toEqual([]);
  });

  it('scores an all-negative headline -1', () => {
    const result = scoreSentiment(
      'Shares plunge after loss widens and debt defaults loom',
    );
    expect(result.score).toBe(-1);
    expect(result.label).toBe('negative');
    expect(result.matchedNegative).toEqual(
      expect.arrayContaining(['plunge', 'loss', 'debt', 'defaults']),
    );
  });

  it('scores a headline with no lexicon words as neutral 0', () => {
    const result = scoreSentiment('Company announces quarterly results call');
    expect(result).toEqual({
      score: 0,
      label: 'neutral',
      matchedPositive: [],
      matchedNegative: [],
    });
  });

  it('balances mixed headlines by the word counts', () => {
    // 3 positive (profit, growth, beats) vs 1 negative (fall) → 0.5.
    const result = scoreSentiment(
      'Profit and growth beats estimates even as shares fall',
    );
    expect(result.score).toBe(0.5);
    expect(result.label).toBe('positive');
    // 1 positive vs 1 negative → 0, neutral.
    const even = scoreSentiment('Profit rises but shares fall on weak outlook');
    expect(even.score).toBeCloseTo(0);
    expect(even.label).toBe('neutral');
  });

  it('matches whole words only and ignores case', () => {
    // "profitable" contains "profit" but is not the word "profit".
    const result = scoreSentiment('A profitable quarter, PROFIT reported');
    expect(result.matchedPositive).toEqual(['profit']);
    expect(result.score).toBe(1);
  });

  it('is deterministic', () => {
    const headline = 'Strong rally as profit beats estimates';
    expect(scoreSentiment(headline)).toEqual(scoreSentiment(headline));
  });
});

describe('aggregateSentiment', () => {
  it('averages scores and counts the split', () => {
    const result = aggregateSentiment([
      scoreSentiment('Profit surges to a record'),
      scoreSentiment('Shares plunge on heavy losses'),
      scoreSentiment('Company announces quarterly results call'),
    ]);
    expect(result).toEqual({
      score: 0,
      label: 'neutral',
      positive: 1,
      negative: 1,
      neutral: 1,
    });
  });

  it('returns neutral 0 for no articles', () => {
    expect(aggregateSentiment([])).toEqual({
      score: 0,
      label: 'neutral',
      positive: 0,
      negative: 0,
      neutral: 0,
    });
  });

  it('labels a clearly positive set positive', () => {
    const result = aggregateSentiment([
      scoreSentiment('Profit surges'),
      scoreSentiment('Growth beats estimates'),
      scoreSentiment('Strong rally continues'),
    ]);
    expect(result.score).toBe(1);
    expect(result.label).toBe('positive');
    expect(result.positive).toBe(3);
  });
});
