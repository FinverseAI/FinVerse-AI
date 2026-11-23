import { MarketService } from '../market/market.service';
import { PortfolioService } from '../market/portfolio.service';
import { ProfileService } from '../profile/profile.service';
import { ReadinessService } from './readiness.service';
import type { ReadinessAssessment } from './readiness.formula';

function profileData(overrides: Record<string, unknown> = {}) {
  return {
    profile: {
      user_id: 'owner',
      employment_type: 'salaried',
      monthly_income: 60000,
      other_monthly_income: null,
      fixed_expenses: 25000,
      variable_expenses: 15000,
      existing_debt_total: null,
      current_savings: 100000,
      monthly_savings_target: 10000,
      investment_experience: 'beginner',
      risk_tolerance: 'moderate',
      already_investing: true,
      invested_amount: null,
      emergency_fund_months: '6+',
      onboarding_completed: true,
      payday: null,
      budget_split: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    },
    goals: [],
    onboarding_completed: true,
  };
}

function holding(
  symbol: string,
  currentValue: number | null,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `holding-${symbol}`,
    symbol,
    name: symbol,
    sector: 'Energy',
    quantity: 10,
    buyPrice: 100,
    buyDate: '2026-01-05',
    currentPrice: currentValue === null ? null : 100,
    currentValue,
    investedValue: 1000,
    gainLoss: null,
    gainLossPercent: null,
    fetchedAt: '2026-11-21T10:00:00.000Z',
    stale: false,
    priced: currentValue !== null,
    ...overrides,
  };
}

function summary(holdings: ReturnType<typeof holding>[]) {
  return {
    holdings,
    totals: {
      totalValue: holdings.reduce(
        (sum, item) => sum + (item.currentValue ?? 0),
        0,
      ),
      totalInvested: 4000,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
    },
    sectors: [],
    unavailable: [],
    asOf: '2026-11-21T10:00:00.000Z',
    stale: false,
  };
}

function historyBars(closes: number[]) {
  return {
    symbol: 'RELIANCE.NS',
    range: '3mo',
    bars: closes.map((close, index) => ({
      date: `2026-09-${String(index + 1).padStart(2, '0')}`,
      open: close,
      high: close,
      low: close,
      close,
      volume: 1000,
    })),
    fetchedAt: '2026-11-21T10:00:00.000Z',
    stale: false,
  };
}

describe('ReadinessService', () => {
  const profileGet = jest.fn();
  const portfolioSummary = jest.fn();
  const marketHistory = jest.fn();
  const service = new ReadinessService(
    { get: profileGet } as unknown as ProfileService,
    { portfolioSummary } as unknown as PortfolioService,
    { history: marketHistory } as unknown as MarketService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    profileGet.mockResolvedValue(profileData());
    portfolioSummary.mockResolvedValue(
      summary([holding('RELIANCE.NS', 50000), holding('TCS.NS', 50000)]),
    );
    marketHistory.mockResolvedValue(
      historyBars(Array.from({ length: 40 }, () => 100)),
    );
  });

  function assessed(result: unknown): ReadinessAssessment {
    if (
      typeof result !== 'object' ||
      result === null ||
      (result as { available: boolean }).available !== true
    ) {
      throw new Error('expected an available assessment');
    }
    return result as ReadinessAssessment;
  }

  it('assesses a healthy user from profile + portfolio + history', async () => {
    const result = assessed(await service.assess('owner'));
    // Emergency 25 + debt 20 + surplus 25 (rate 33%) + concentration
    // 9.4 (largest 50%) + volatility 15 (flat prices) = 94.4 → 94.
    expect(result.score).toBe(94);
    expect(result.band).toBe('Ready');
    expect(result.maxScore).toBe(100);
    expect(result.context.monthlyIncome).toBe(60000);
    expect(result.context.totalPortfolioValue).toBe(100000);
    expect(result.context.volatilityPercent).toBe(0);
    expect(marketHistory).toHaveBeenCalledTimes(2);
    expect(marketHistory).toHaveBeenCalledWith('RELIANCE.NS', '3mo');
  });

  it('is unavailable without a financial profile', async () => {
    profileGet.mockResolvedValue({
      profile: null,
      goals: [],
      onboarding_completed: false,
    });
    const result = await service.assess('owner');
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.missing).toEqual(['financial profile']);
    }
    expect(portfolioSummary).not.toHaveBeenCalled();
  });

  it('excludes unpriced holdings from concentration and volatility', async () => {
    portfolioSummary.mockResolvedValue(
      summary([holding('RELIANCE.NS', 50000), holding('TCS.NS', null)]),
    );
    const result = assessed(await service.assess('owner'));
    // One priced holding: concentration 0 (100% weight); volatility
    // from that holding alone (flat prices → 0% → 15 points).
    expect(result.context.pricedHoldingsCount).toBe(1);
    expect(result.context.holdingsCount).toBe(1);
    expect(marketHistory).toHaveBeenCalledTimes(1);
    const concentration = result.factors.find(
      (factor) => factor.metric === 'largestHoldingWeightPercent',
    );
    expect(concentration?.points).toBe(0);
  });

  it('excludes a holding whose history fails, keeping the others', async () => {
    marketHistory
      .mockResolvedValueOnce(historyBars(Array.from({ length: 40 }, () => 100)))
      .mockRejectedValueOnce(new Error('provider down'));
    const result = assessed(await service.assess('owner'));
    const volatility = result.factors.find(
      (factor) => factor.metric === 'volatilityPercent',
    );
    expect(volatility?.available).toBe(true);
    expect(volatility?.holdingsWithHistory).toBe(1);
  });

  it('marks volatility unavailable when no holding has enough history', async () => {
    marketHistory.mockResolvedValue(
      historyBars(Array.from({ length: 10 }, () => 100)),
    );
    const result = assessed(await service.assess('owner'));
    const volatility = result.factors.find(
      (factor) => factor.metric === 'volatilityPercent',
    );
    expect(volatility?.available).toBe(false);
    expect(result.maxScore).toBe(85);
  });

  it('propagates stale market data to the assessment', async () => {
    portfolioSummary.mockResolvedValue({
      ...summary([holding('RELIANCE.NS', 50000)]),
      stale: true,
    });
    const result = assessed(await service.assess('owner'));
    expect(result.stale).toBe(true);
    expect(result.asOf).toBe('2026-11-21T10:00:00.000Z');
  });

  it('includes other income and debt from the profile', async () => {
    profileGet.mockResolvedValue(
      profileData({
        other_monthly_income: 20000,
        existing_debt_total: 960000,
        emergency_fund_months: '3-6',
      }),
    );
    const result = assessed(await service.assess('owner'));
    // Income 80000, annual 960000, debt 960000 → dti 1.0 → 0 points.
    expect(result.context.monthlyIncome).toBe(80000);
    expect(result.context.debtToIncomeRatio).toBe(1);
    const debt = result.factors.find(
      (factor) => factor.metric === 'debtToIncomeRatio',
    );
    expect(debt?.points).toBe(0);
  });
});
