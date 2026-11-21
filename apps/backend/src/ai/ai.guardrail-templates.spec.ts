import {
  chunksFromRetrieved,
  verifyAnswer,
  type GuardrailContext,
} from './ai.guardrail';
import {
  scoreReadiness,
  type ReadinessAssessment,
} from '../readiness/readiness.formula';
import {
  chatTemplate,
  explainNewsTemplate,
  explainStockTemplate,
  readinessTemplate,
  screenTemplate,
  type TemplateAnswer,
} from './ai.guardrail-templates';
import type { AiAnswer } from './ai.validation';
import type { RetrievedChunk } from '../rag/rag.repository';
import type { ScreenResponse } from '../rag/rag.service';

/**
 * Template fallback answers (Phase 3): built only from verified
 * numbers, so the user never sees an unverified claim. The headline
 * invariant, pinned for every template: its output PASSES the
 * guardrail against the same evidence it was built from.
 */

const BUDGET_STATUS = {
  available: true,
  month: '2026-11',
  monthlyIncome: 60000,
  categories: [
    {
      name: 'Food & Dining',
      budgeted: 10000,
      spent: 8600,
      remaining: 1400,
      overBudget: false,
    },
    {
      name: 'Transport',
      budgeted: 5000,
      spent: 4200,
      remaining: 800,
      overBudget: false,
    },
    {
      name: 'Shopping',
      budgeted: 3000,
      spent: 3400,
      remaining: -400,
      overBudget: true,
    },
  ],
  totalBudgeted: 18000,
  totalSpent: 16200,
  totalRemaining: 1800,
};

const GOAL_PROGRESS = {
  goals: [
    {
      name: 'Emergency fund',
      target: 100000,
      saved: 50000,
      remaining: 50000,
      progressPercent: 50,
      targetDate: '2027-06-01',
      priority: 'high',
    },
    {
      name: 'Japan trip',
      target: 200000,
      saved: 20000,
      remaining: 180000,
      progressPercent: 10,
      targetDate: '2027-12-01',
      priority: 'medium',
    },
  ],
  totalTarget: 300000,
  totalSaved: 70000,
};

const PORTFOLIO_SUMMARY = {
  holdings: [
    {
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries',
      quantity: 10,
      buyPrice: 2400,
      currentPrice: 2600,
      currentValue: 26000,
      investedValue: 24000,
      gainLoss: 2000,
      gainLossPercent: 8.33,
      sector: 'Energy',
      priced: true,
    },
  ],
  totals: {
    totalValue: 26000,
    totalInvested: 24000,
    totalGainLoss: 2000,
    totalGainLossPercent: 8.33,
  },
  sectors: [{ sector: 'Energy', value: 26000, weight: 100 }],
  unavailable: [],
  asOf: '2026-11-21T10:00:00Z',
  stale: false,
};

const FUNDAMENTALS = {
  symbol: 'RELIANCE.NS',
  name: 'Reliance Industries',
  price: 2600,
  previousClose: 2580,
  change: 20,
  changePercent: 0.78,
  currency: 'INR',
  sector: 'Energy',
  fetchedAt: '2026-11-21T10:00:00Z',
  stale: false,
  fundamentals: {
    sector: 'Energy',
    industry: 'Oil & Gas',
    marketCap: 17_600_000_000_000,
    trailingPE: 25.4,
    forwardPE: 22.1,
    dividendYield: 0.35,
    fiftyTwoWeekHigh: 3210,
    fiftyTwoWeekLow: 2440.15,
    description: 'Reliance Industries Limited.',
  },
  fundamentalsAvailable: true,
  technicals: {
    barsUsed: 63,
    rsi14: 55.55,
    sma20: 2500.5,
    sma50: 2400,
    macd: { macd: 12.34, signal: 10.11, histogram: 2.23 },
    change1moPercent: 5.5,
    change3moPercent: 12.3,
    note: null,
  },
};

const NEWS_CHUNK = {
  id: 'doc-1',
  source_type: 'news',
  source_id: 'https://example.test/a1',
  user_id: null,
  symbol: 'RELIANCE.NS',
  title: 'Reliance profit jumps',
  content: 'Reliance profit jumps 12% on strong retail sales. Source: Reuters.',
  published_at: new Date('2026-11-18T10:00:00Z'),
  url: 'https://example.test/a1',
  metadata: { publisher: 'Reuters' },
  created_at: new Date('2026-11-18T10:05:00Z'),
  updated_at: new Date('2026-11-18T10:05:00Z'),
  similarity: 0.82,
} as RetrievedChunk;

const SCREEN: ScreenResponse = {
  filters: { minRsi: 70 },
  universe: ['RELIANCE.NS', 'TCS.NS'],
  matches: [
    {
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries',
      price: 2600,
      changePercent: 1.2,
      marketCap: 17_600_000_000_000,
      trailingPE: 25,
      sector: 'Energy',
      rsi14: 100,
      sma20: 2500,
      sma50: 2400,
      change1moPercent: 5.5,
      stale: false,
    },
  ],
  unavailable: ['TCS.NS'],
  evaluatedAt: '2026-11-21T10:00:00Z',
};

function asAnswer(template: TemplateAnswer): AiAnswer {
  return {
    answer: template.answer,
    claims: template.claims,
    refused: false,
    refusalReason: null,
  };
}

function context(overrides: Partial<GuardrailContext> = {}): GuardrailContext {
  return {
    requestId: 'req-1',
    userId: 'user-123',
    feature: 'chat',
    toolResults: new Map(),
    chunks: [],
    ...overrides,
  };
}

describe('chatTemplate', () => {
  const snapshot = {
    getBudgetStatus: BUDGET_STATUS,
    getGoalProgress: GOAL_PROGRESS,
    getPortfolioSummary: PORTFOLIO_SUMMARY,
  };

  it('summarises budget, goals, and portfolio from the snapshot', () => {
    const template = chatTemplate(snapshot);
    expect(template.answer).toContain('₹16,200 spent of ₹18,000 budgeted');
    expect(template.answer).toContain('₹70,000 saved of ₹3,00,000 target');
    expect(template.answer).toContain('worth ₹26,000');
    expect(template.answer).toContain(
      'Shopping is over budget: ₹3,400 spent of ₹3,000 budgeted.',
    );
    expect(template.answer).toContain(
      'Emergency fund: ₹50,000 saved of ₹1,00,000 target (50% complete).',
    );
  });

  it('skips unavailable sections instead of inventing numbers', () => {
    const template = chatTemplate({
      getBudgetStatus: { available: false, month: '2026-11' },
      getGoalProgress: { goals: [], totalTarget: 0, totalSaved: 0 },
      getPortfolioSummary: { holdings: [], totals: {} },
    });
    expect(template.claims).toHaveLength(0);
    expect(template.answer).toContain("couldn't be loaded");
  });

  it('passes verification against the same snapshot (invariant)', () => {
    const template = chatTemplate(snapshot);
    const result = verifyAnswer(
      asAnswer(template),
      context({
        toolResults: new Map<string, unknown[]>([
          ['getBudgetStatus', [BUDGET_STATUS]],
          ['getGoalProgress', [GOAL_PROGRESS]],
          ['getPortfolioSummary', [PORTFOLIO_SUMMARY]],
        ]),
      }),
    );
    expect(result.passed).toBe(true);
    expect(result.checksFailed).toBe(0);
  });
});

describe('explainStockTemplate', () => {
  it('states price, technicals, and fundamentals from the figures', () => {
    const template = explainStockTemplate('RELIANCE.NS', FUNDAMENTALS);
    expect(template.answer).toContain(
      'RELIANCE.NS (Reliance Industries) is trading at ₹2,600.00',
    );
    expect(template.answer).toContain('the RSI (14) is 55.55');
    expect(template.answer).toContain('the P/E ratio is 25.4');
    expect(template.answer).toContain('₹2,440.15 – ₹3,210.00');
    // Market cap rides in the evidence, not the prose (it cannot be
    // restated exactly in crores).
    const values = template.claims.flatMap((claim) =>
      Object.values(claim.source.values),
    );
    expect(values).toContain(17_600_000_000_000);
  });

  it('degrades to the price alone when technicals are missing', () => {
    const template = explainStockTemplate('RELIANCE.NS', {
      symbol: 'RELIANCE.NS',
      price: 2600,
      previousClose: null,
      changePercent: null,
    });
    expect(template.answer).toContain('trading at ₹2,600.00');
    expect(template.answer).not.toContain('RSI');
  });

  it('says so when no figures exist at all', () => {
    const template = explainStockTemplate('RELIANCE.NS', null);
    expect(template.claims).toHaveLength(0);
    expect(template.answer).toContain('No computed figures');
  });

  it('passes verification against the same figures (invariant)', () => {
    const template = explainStockTemplate('RELIANCE.NS', FUNDAMENTALS);
    const result = verifyAnswer(
      asAnswer(template),
      context({
        feature: 'explain-stock',
        toolResults: new Map<string, unknown[]>([
          ['getStockFundamentals', [FUNDAMENTALS]],
        ]),
      }),
    );
    expect(result.passed).toBe(true);
    expect(result.checksFailed).toBe(0);
  });
});

describe('explainNewsTemplate', () => {
  const chunks = chunksFromRetrieved([NEWS_CHUNK]);

  it('lists the retrieved articles with title and date', () => {
    const template = explainNewsTemplate('RELIANCE.NS', chunks);
    expect(template.answer).toContain('Recent news for RELIANCE.NS:');
    expect(template.answer).toContain('"Reliance profit jumps" (2026-11-18).');
    expect(template.claims).toHaveLength(1);
    expect(template.claims[0]?.source.tool).toBe('searchKnowledge');
  });

  it('says so when there are no articles', () => {
    const template = explainNewsTemplate('RELIANCE.NS', []);
    expect(template.claims).toHaveLength(0);
    expect(template.answer).toContain('No recent news was found');
  });

  it('passes verification against the same chunks (invariant)', () => {
    const template = explainNewsTemplate('RELIANCE.NS', chunks);
    const result = verifyAnswer(
      asAnswer(template),
      context({ feature: 'explain-news', chunks }),
    );
    expect(result.passed).toBe(true);
    expect(result.checksFailed).toBe(0);
  });
});

describe('screenTemplate', () => {
  it('lists the matches with their screened figures', () => {
    const template = screenTemplate(SCREEN);
    expect(template.answer).toContain('1 stock matched your filters.');
    expect(template.answer).toContain(
      'RELIANCE.NS is trading at ₹2,600.00, RSI 100, 1-month +5.5%.',
    );
  });

  it('says so when nothing matched', () => {
    const template = screenTemplate({ ...SCREEN, matches: [] });
    expect(template.claims).toHaveLength(0);
    expect(template.answer).toContain('No stocks matched');
  });

  it('passes verification against the same screen (invariant)', () => {
    const template = screenTemplate(SCREEN);
    const result = verifyAnswer(
      asAnswer(template),
      context({ feature: 'screen', screen: SCREEN }),
    );
    expect(result.passed).toBe(true);
    expect(result.checksFailed).toBe(0);
  });
});

describe('readinessTemplate', () => {
  function midAssessment(): ReadinessAssessment {
    const result = scoreReadiness({
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
    });
    if (!result.available) throw new Error('expected an available assessment');
    return result;
  }

  function noHoldingsAssessment(): ReadinessAssessment {
    const result = scoreReadiness({
      emergencyFundBand: '6+',
      monthlyIncome: 60000,
      monthlyExpenses: 30000,
      totalDebt: 0,
      holdings: [],
      holdingVolatilities: [],
    });
    if (!result.available) throw new Error('expected an available assessment');
    return result;
  }

  it('states the score, every factor, and the suggestions', () => {
    const template = readinessTemplate(midAssessment());
    expect(template.answer).toContain(
      'Your investment readiness score is 71 out of 100 (Ready).',
    );
    expect(template.answer).toContain(
      'Emergency fund: 4.5 months of expenses saved, worth 18.8 of 25 points.',
    );
    expect(template.answer).toContain(
      'Debt-to-income: ₹1,20,000 of debt against ₹6,00,000 of annual income (ratio 0.2), worth 16 of 20 points.',
    );
    expect(template.answer).toContain(
      'Monthly surplus: ₹10,000 a month (20% of income), worth 16.7 of 25 points.',
    );
    expect(template.answer).toContain(
      'Portfolio concentration: your largest holding (RELIANCE.NS) is 50% of the portfolio, worth 9.4 of 15 points.',
    );
    expect(template.answer).toContain(
      'Portfolio volatility: 30% annualised across 2 holdings with enough history, worth 10 of 15 points.',
    );
    expect(template.answer).toContain(
      'Raising your monthly surplus to ₹15,000 (30% of income) would add 8.3 points.',
    );
  });

  it('says which factors could not be measured, without inventing them', () => {
    const template = readinessTemplate(noHoldingsAssessment());
    expect(template.answer).toContain(
      'Your investment readiness score is 100 out of 100 (Ready). Only 70 of the 100 points could be measured from your data.',
    );
    expect(template.answer).toContain(
      'Portfolio concentration: no priced holdings, so concentration cannot be measured.',
    );
    expect(template.answer).toContain(
      'Portfolio volatility: not enough price history for your holdings yet, so volatility cannot be measured.',
    );
  });

  it('says so when no assessment exists at all', () => {
    const template = readinessTemplate({
      available: false,
      reason: 'Complete your financial profile.',
      missing: ['financial profile'],
    });
    expect(template.claims).toHaveLength(0);
    expect(template.answer).toContain('No readiness score is available');
  });

  it('passes verification against the same assessment (invariant)', () => {
    const assessment = midAssessment();
    const template = readinessTemplate(assessment);
    const result = verifyAnswer(
      asAnswer(template),
      context({
        feature: 'explain-readiness',
        toolResults: new Map<string, unknown[]>([
          ['getReadinessScore', [assessment]],
        ]),
      }),
    );
    expect(result.passed).toBe(true);
    expect(result.checksFailed).toBe(0);
  });

  it('passes verification with unavailable factors (invariant)', () => {
    const assessment = noHoldingsAssessment();
    const template = readinessTemplate(assessment);
    const result = verifyAnswer(
      asAnswer(template),
      context({
        feature: 'explain-readiness',
        toolResults: new Map<string, unknown[]>([
          ['getReadinessScore', [assessment]],
        ]),
      }),
    );
    expect(result.passed).toBe(true);
    expect(result.checksFailed).toBe(0);
  });
});
