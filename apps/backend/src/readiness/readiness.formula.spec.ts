import {
  annualizedVolatility,
  bandForScore,
  scoreReadiness,
  type ReadinessAssessment,
  type ReadinessInputs,
} from './readiness.formula';

function baseInputs(overrides: Partial<ReadinessInputs> = {}): ReadinessInputs {
  return {
    emergencyFundBand: '6+',
    monthlyIncome: 60000,
    monthlyExpenses: 40000,
    totalDebt: 0,
    holdings: [
      { symbol: 'RELIANCE.NS', currentValue: 50000 },
      { symbol: 'TCS.NS', currentValue: 50000 },
      { symbol: 'HDFCBANK.NS', currentValue: 50000 },
      { symbol: 'INFY.NS', currentValue: 50000 },
    ],
    holdingVolatilities: [
      { symbol: 'RELIANCE.NS', volatility: 0.15, currentValue: 50000 },
      { symbol: 'TCS.NS', volatility: 0.15, currentValue: 50000 },
      { symbol: 'HDFCBANK.NS', volatility: 0.15, currentValue: 50000 },
      { symbol: 'INFY.NS', volatility: 0.15, currentValue: 50000 },
    ],
    ...overrides,
  };
}

function assessed(inputs: ReadinessInputs): ReadinessAssessment {
  const result = scoreReadiness(inputs);
  if (!result.available) throw new Error('expected an available assessment');
  return result;
}

describe('annualizedVolatility', () => {
  it('is zero for flat prices', () => {
    expect(annualizedVolatility(Array.from({ length: 30 }, () => 100))).toBe(0);
  });

  it('is zero for perfectly steady growth', () => {
    const closes: number[] = [];
    for (let i = 0; i < 30; i++) closes.push(100 * 1.01 ** i);
    expect(annualizedVolatility(closes)).toBeCloseTo(0, 10);
  });

  it('matches a hand-computed alternating series', () => {
    const closes: number[] = [];
    for (let i = 0; i < 40; i++) closes.push(i % 2 === 0 ? 100 : 110);
    // Daily log returns alternate ±ln(1.1); stddev × √252 = 1.5323.
    expect(annualizedVolatility(closes)).toBeCloseTo(1.5323, 3);
  });

  it('returns null with too little history', () => {
    expect(
      annualizedVolatility(Array.from({ length: 29 }, () => 100)),
    ).toBeNull();
  });

  it('returns null for non-positive closes', () => {
    const closes = Array.from({ length: 30 }, () => 100);
    closes[10] = 0;
    expect(annualizedVolatility(closes)).toBeNull();
  });
});

describe('bandForScore', () => {
  it.each([
    [0, 'Not ready'],
    [39, 'Not ready'],
    [40, 'Building'],
    [69, 'Building'],
    [70, 'Ready'],
    [100, 'Ready'],
  ])('scores %d as %s', (score, band) => {
    expect(bandForScore(score)).toBe(band);
  });
});

describe('scoreReadiness', () => {
  it('is reproducible: same inputs always give the same assessment', () => {
    const inputs = baseInputs();
    expect(scoreReadiness(inputs)).toEqual(scoreReadiness(inputs));
    expect(scoreReadiness(baseInputs())).toEqual(scoreReadiness(inputs));
  });

  it('scores a healthy user 99 (Ready)', () => {
    const result = assessed(baseInputs());
    expect(result.score).toBe(99);
    expect(result.band).toBe('Ready');
    expect(result.maxScore).toBe(100);
    expect(result.scale).toBe(100);
    // Four equal holdings: largest weight 25% → 15 × 0.75/0.80 = 14.1.
    const concentration = result.factors.find(
      (factor) => factor.metric === 'largestHoldingWeightPercent',
    );
    expect(concentration?.points).toBe(14.1);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].factor).toBe('Portfolio concentration');
  });

  it('scores a perfect user 100 with no suggestions', () => {
    const holdings = [
      'RELIANCE.NS',
      'TCS.NS',
      'HDFCBANK.NS',
      'INFY.NS',
      'ITC.NS',
    ].map((symbol) => ({ symbol, currentValue: 40000 }));
    const result = assessed(
      baseInputs({
        monthlyExpenses: 30000,
        holdings,
        holdingVolatilities: holdings.map((holding) => ({
          ...holding,
          volatility: 0.1,
        })),
      }),
    );
    expect(result.score).toBe(100);
    expect(result.band).toBe('Ready');
    expect(result.suggestions).toEqual([]);
  });

  it('scores a struggling user 0 (Not ready)', () => {
    const result = assessed(
      baseInputs({
        emergencyFundBand: '0',
        monthlyIncome: 40000,
        monthlyExpenses: 42000,
        totalDebt: 480000,
        holdings: [{ symbol: 'RELIANCE.NS', currentValue: 100000 }],
        holdingVolatilities: [
          { symbol: 'RELIANCE.NS', volatility: 0.6, currentValue: 100000 },
        ],
      }),
    );
    expect(result.score).toBe(0);
    expect(result.band).toBe('Not ready');
    expect(result.factors.every((factor) => factor.points === 0)).toBe(true);
  });

  it('scores a mid user 71 with the factors auditable', () => {
    const result = assessed(
      baseInputs({
        emergencyFundBand: '3-6',
        monthlyIncome: 50000,
        monthlyExpenses: 40000,
        totalDebt: 120000,
        holdings: [
          { symbol: 'RELIANCE.NS', currentValue: 50000 },
          { symbol: 'TCS.NS', currentValue: 50000 },
        ],
        holdingVolatilities: [
          { symbol: 'RELIANCE.NS', volatility: 0.3, currentValue: 50000 },
          { symbol: 'TCS.NS', volatility: 0.3, currentValue: 50000 },
        ],
      }),
    );
    // Emergency 4.5/6 × 25 = 18.8; debt 20 × 0.8 = 16; surplus
    // 25 × (0.20/0.30) = 16.7; concentration 15 × 0.625 = 9.4;
    // volatility 15 × (0.30/0.45) = 10. Total 70.9 → 71.
    const points = Object.fromEntries(
      result.factors.map((factor) => [factor.metric, factor.points]),
    );
    expect(points).toEqual({
      emergencyFundMonths: 18.8,
      debtToIncomeRatio: 16,
      surplusRatePercent: 16.7,
      largestHoldingWeightPercent: 9.4,
      volatilityPercent: 10,
    });
    expect(result.score).toBe(71);
    expect(result.band).toBe('Ready');
  });

  it('rescales over available factors when there are no holdings', () => {
    const result = assessed(
      baseInputs({
        monthlyExpenses: 30000,
        holdings: [],
        holdingVolatilities: [],
      }),
    );
    expect(result.maxScore).toBe(70);
    expect(result.score).toBe(100);
    const concentration = result.factors.find(
      (factor) => factor.metric === 'largestHoldingWeightPercent',
    );
    const volatility = result.factors.find(
      (factor) => factor.metric === 'volatilityPercent',
    );
    expect(concentration?.available).toBe(false);
    expect(volatility?.available).toBe(false);
    expect(result.context.totalPortfolioValue).toBe(0);
  });

  it('handles zero income without dividing by zero', () => {
    const result = assessed(
      baseInputs({
        emergencyFundBand: '1-3',
        monthlyIncome: 0,
        monthlyExpenses: 0,
        totalDebt: 0,
        holdings: [],
        holdingVolatilities: [],
      }),
    );
    // Only the emergency factor is measurable: 8.3 of 25 → 33.
    expect(result.maxScore).toBe(25);
    expect(result.score).toBe(33);
    expect(result.band).toBe('Not ready');
    expect(result.context.surplusRatePercent).toBeNull();
    expect(result.context.debtToIncomeRatio).toBeNull();
  });

  it('is unavailable when nothing can be measured', () => {
    const result = scoreReadiness(
      baseInputs({
        emergencyFundBand: null,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        totalDebt: 0,
        holdings: [],
        holdingVolatilities: [],
      }),
    );
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.missing).toHaveLength(5);
    }
  });

  it('treats a missing debt total as no debt', () => {
    const result = assessed(baseInputs({ totalDebt: 0 }));
    const debt = result.factors.find(
      (factor) => factor.metric === 'debtToIncomeRatio',
    );
    expect(debt?.points).toBe(20);
  });

  it('caps debt-to-income at zero points for debt above one year of income', () => {
    const result = assessed(
      baseInputs({ totalDebt: 2000000, monthlyIncome: 60000 }),
    );
    const debt = result.factors.find(
      (factor) => factor.metric === 'debtToIncomeRatio',
    );
    expect(debt?.points).toBe(0);
  });

  it('scores negative surplus as zero, never negative', () => {
    const result = assessed(
      baseInputs({ monthlyIncome: 50000, monthlyExpenses: 80000 }),
    );
    const surplus = result.factors.find(
      (factor) => factor.metric === 'surplusRatePercent',
    );
    expect(surplus?.points).toBe(0);
    expect(surplus?.surplus).toBe(-30000);
  });

  it('sorts suggestions by points gained and caps at three', () => {
    const result = assessed(
      baseInputs({
        emergencyFundBand: '3-6',
        monthlyIncome: 50000,
        monthlyExpenses: 40000,
        totalDebt: 120000,
        holdings: [
          { symbol: 'RELIANCE.NS', currentValue: 50000 },
          { symbol: 'TCS.NS', currentValue: 50000 },
        ],
        holdingVolatilities: [
          { symbol: 'RELIANCE.NS', volatility: 0.3, currentValue: 50000 },
          { symbol: 'TCS.NS', volatility: 0.3, currentValue: 50000 },
        ],
      }),
    );
    // Gains: surplus 8.3, emergency 6.2, concentration 5.6, volatility
    // 5, debt 4 — top 3 in that order.
    expect(result.suggestions.map((s) => s.factor)).toEqual([
      'Monthly surplus',
      'Emergency fund',
      'Portfolio concentration',
    ]);
    expect(result.suggestions[0].targetSurplus).toBe(15000);
    expect(result.suggestions[0].targetRatePercent).toBe(30);
    expect(result.suggestions[1].targetMonths).toBe(6);
    expect(result.suggestions[2].targetWeightPercent).toBe(20);
  });

  it('value-weights volatility by holding value', () => {
    const result = assessed(
      baseInputs({
        holdings: [
          { symbol: 'CALM.NS', currentValue: 90000 },
          { symbol: 'WILD.NS', currentValue: 10000 },
        ],
        holdingVolatilities: [
          { symbol: 'CALM.NS', volatility: 0.1, currentValue: 90000 },
          { symbol: 'WILD.NS', volatility: 0.6, currentValue: 10000 },
        ],
      }),
    );
    // Weighted vol = 0.9 × 0.10 + 0.1 × 0.60 = 0.15 → full marks.
    expect(result.context.volatilityPercent).toBe(15);
    const volatility = result.factors.find(
      (factor) => factor.metric === 'volatilityPercent',
    );
    expect(volatility?.points).toBe(15);
  });
});
