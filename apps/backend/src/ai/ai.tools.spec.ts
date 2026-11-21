import { ServiceUnavailableException } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { MarketService } from '../market/market.service';
import { PortfolioService } from '../market/portfolio.service';
import { ProfileService } from '../profile/profile.service';
import { RagRetrievalService } from '../rag/rag.retrieval';
import { ReadinessService } from '../readiness/readiness.service';
import { rsi, sma } from './indicators';
import {
  AI_TOOL_DEFINITIONS,
  APPLY_SCREENER_FILTERS_TOOL,
  AiTools,
} from './ai.tools';

const USER_ID = 'user-123';

function monthKey(offsetMonths = 0): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1),
  )
    .toISOString()
    .slice(0, 7);
}

function dayKey(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function makeTools(
  overrides: {
    profile?: unknown;
    transactions?: unknown[];
    quote?: unknown;
    fundamentals?: unknown;
    history?: unknown;
    portfolio?: unknown;
    retrieval?: unknown;
    readiness?: unknown;
  } = {},
) {
  // The raw jest.fn references are returned alongside the services so
  // assertions can use them directly (referencing a method on the cast
  // service object trips the unbound-method lint rule).
  const get = jest.fn().mockResolvedValue(
    overrides.profile ?? {
      profile: null,
      goals: [],
      onboarding_completed: false,
    },
  );
  const transactions = jest
    .fn()
    .mockResolvedValue(overrides.transactions ?? []);
  const quote = jest.fn().mockResolvedValue(overrides.quote ?? {});
  const marketProfile = jest
    .fn()
    .mockResolvedValue(overrides.fundamentals ?? {});
  const history = jest.fn().mockResolvedValue(overrides.history ?? {});
  const portfolioSummary = jest
    .fn()
    .mockResolvedValue(overrides.portfolio ?? {});
  const retrieve = jest
    .fn()
    .mockResolvedValue(
      overrides.retrieval ?? { available: true, chunks: [], reason: null },
    );
  const assess = jest.fn().mockResolvedValue(
    overrides.readiness ?? {
      available: false,
      reason: 'Complete your financial profile.',
      missing: ['financial profile'],
    },
  );
  const profile = { get } as unknown as ProfileService;
  const activity = { transactions } as unknown as ActivityService;
  const market = {
    quote,
    profile: marketProfile,
    history,
  } as unknown as MarketService;
  const portfolio = { portfolioSummary } as unknown as PortfolioService;
  const retrieval = { retrieve } as unknown as RagRetrievalService;
  const readiness = { assess } as unknown as ReadinessService;
  const tools = new AiTools(
    profile,
    activity,
    market,
    portfolio,
    retrieval,
    readiness,
  );
  return {
    tools,
    get,
    transactions,
    quote,
    history,
    portfolioSummary,
    retrieve,
    assess,
  };
}

describe('AiTools', () => {
  describe('AI_TOOL_DEFINITIONS', () => {
    it('declares nine tools, each with a schema', () => {
      const names = AI_TOOL_DEFINITIONS.map(
        (definition) => definition.function.name,
      );
      expect(names).toEqual([
        'getPortfolioSummary',
        'getBudgetStatus',
        'getTransactions',
        'getStockQuote',
        'getStockFundamentals',
        'getCategorySpending',
        'getGoalProgress',
        'getReadinessScore',
        'searchKnowledge',
      ]);
      for (const definition of AI_TOOL_DEFINITIONS) {
        expect(definition.function.description.length).toBeGreaterThan(0);
        expect(definition.function.parameters.type).toBe('object');
      }
    });

    it('keeps the screener translation tool out of the chat tool loop', () => {
      const names = AI_TOOL_DEFINITIONS.map(
        (definition) => definition.function.name,
      );
      expect(names).not.toContain('applyScreenerFilters');
      expect(APPLY_SCREENER_FILTERS_TOOL.function.name).toBe(
        'applyScreenerFilters',
      );
      expect(APPLY_SCREENER_FILTERS_TOOL.function.parameters.type).toBe(
        'object',
      );
    });
  });

  describe('execute', () => {
    it('rejects unknown tools and invalid arguments', async () => {
      const { tools } = makeTools();
      await expect(tools.execute(USER_ID, 'getWeather', {})).rejects.toThrow(
        'Unknown tool',
      );
      await expect(
        tools.execute(USER_ID, 'getTransactions', { limit: 99 }),
      ).rejects.toThrow();
    });

    it('scopes every call to the session user', async () => {
      const { tools, get, transactions, portfolioSummary, quote } = makeTools();
      await tools.execute(USER_ID, 'getTransactions', {});
      await tools.execute(USER_ID, 'getBudgetStatus', {});
      await tools.execute(USER_ID, 'getPortfolioSummary', {});
      await tools.execute(USER_ID, 'getStockQuote', { symbol: 'RELIANCE' });
      expect(transactions).toHaveBeenCalledWith(USER_ID);
      expect(get).toHaveBeenCalledWith(USER_ID);
      expect(portfolioSummary).toHaveBeenCalledWith(USER_ID);
      expect(quote).toHaveBeenCalledWith('RELIANCE');
    });
  });

  describe('getBudgetStatus', () => {
    it('reports budgeted, spent, and remaining per category', async () => {
      const month = monthKey();
      const { tools } = makeTools({
        profile: {
          profile: {
            monthly_income: 100000,
            budget_split: { rent: 30, food: 20 },
          },
          goals: [],
          onboarding_completed: true,
        },
        transactions: [
          {
            name: 'Rent',
            amount: -12000,
            category: 'Housing',
            date: `${month}-05`,
          },
          {
            name: 'Groceries',
            amount: -8000,
            category: 'Food & Dining',
            date: `${month}-06`,
          },
          {
            name: 'Old groceries',
            amount: -1000,
            category: 'Food & Dining',
            date: `${monthKey(-1)}-20`,
          },
          {
            name: 'Salary',
            amount: 50000,
            category: 'Income',
            date: `${month}-01`,
          },
        ],
      });
      const result = (await tools.execute(USER_ID, 'getBudgetStatus', {
        month,
      })) as Record<string, unknown>;
      expect(result.available).toBe(true);
      expect(result.month).toBe(month);
      expect(result.monthlyIncome).toBe(100000);
      const categories = result.categories as Record<string, unknown>[];
      const rent = categories.find((c) => c.name === 'Rent');
      const food = categories.find((c) => c.name === 'Food & Dining');
      // 'Housing' transactions count against 'Rent' through the alias map.
      expect(rent).toEqual({
        name: 'Rent',
        budgeted: 30000,
        spent: 12000,
        remaining: 18000,
        overBudget: false,
      });
      expect(food).toEqual({
        name: 'Food & Dining',
        budgeted: 20000,
        spent: 8000,
        remaining: 12000,
        overBudget: false,
      });
      expect(result.totalBudgeted).toBe(50000);
      expect(result.totalSpent).toBe(20000);
      expect(result.totalRemaining).toBe(30000);
    });

    it('flags overspending and defaults to the current month', async () => {
      const month = monthKey();
      const { tools } = makeTools({
        profile: {
          profile: {
            monthly_income: 10000,
            budget_split: { food: 10 },
          },
          goals: [],
          onboarding_completed: true,
        },
        transactions: [
          {
            name: 'Feast',
            amount: -2000,
            category: 'Food & Dining',
            date: `${month}-03`,
          },
        ],
      });
      const result = (await tools.execute(USER_ID, 'getBudgetStatus', {})) as {
        month: string;
        categories: { name: string; overBudget: boolean; remaining: number }[];
      };
      expect(result.month).toBe(month);
      const food = result.categories.find((c) => c.name === 'Food & Dining');
      expect(food?.overBudget).toBe(true);
      expect(food?.remaining).toBe(-1000);
    });

    it('reports unavailable when no profile exists', async () => {
      const { tools } = makeTools();
      const result = await tools.execute(USER_ID, 'getBudgetStatus', {});
      expect(result).toEqual(expect.objectContaining({ available: false }));
    });
  });

  describe('getTransactions', () => {
    const transactions = [
      {
        id: '1',
        name: 'A',
        amount: -100,
        category: 'Food & Dining',
        date: '2026-11-10',
      },
      {
        id: '2',
        name: 'B',
        amount: -200,
        category: 'Transport',
        date: '2026-11-11',
      },
      {
        id: '3',
        name: 'C',
        amount: 5000,
        category: 'Income',
        date: '2026-11-12',
      },
    ];

    it('filters by category and date', async () => {
      const { tools } = makeTools({ transactions });
      const result = (await tools.execute(USER_ID, 'getTransactions', {
        category: 'food & dining',
      })) as {
        count: number;
        returned: number;
        transactions: { name: string }[];
      };
      expect(result.count).toBe(1);
      expect(result.returned).toBe(1);
      expect(result.transactions.map((t) => t.name)).toEqual(['A']);
      const ranged = (await tools.execute(USER_ID, 'getTransactions', {
        startDate: '2026-11-11',
        endDate: '2026-11-12',
      })) as { transactions: unknown[] };
      expect(ranged.transactions).toHaveLength(2);
    });

    it('returns the most recent first and applies the limit', async () => {
      const { tools } = makeTools({ transactions });
      const result = (await tools.execute(USER_ID, 'getTransactions', {
        limit: 2,
      })) as {
        count: number;
        returned: number;
        transactions: { name: string }[];
      };
      expect(result.count).toBe(3);
      expect(result.returned).toBe(2);
      expect(result.transactions.map((t) => t.name)).toEqual(['C', 'B']);
    });
  });

  describe('getCategorySpending', () => {
    it('totals spending exactly and lists the largest transactions', async () => {
      const { tools } = makeTools({
        transactions: [
          {
            name: 'Dinner',
            amount: -123.45,
            category: 'Food & Dining',
            date: dayKey(0),
          },
          {
            name: 'Lunch',
            amount: -67.55,
            category: 'Food & Dining',
            date: dayKey(-2),
          },
          {
            name: 'Old',
            amount: -999,
            category: 'Food & Dining',
            date: dayKey(-40),
          },
          { name: 'Bus', amount: -50, category: 'Transport', date: dayKey(0) },
        ],
      });
      const result = (await tools.execute(USER_ID, 'getCategorySpending', {
        category: 'Food & Dining',
        period: 'month',
      })) as {
        totalSpent: number;
        count: number;
        largest: { name: string; amount: number }[];
      };
      expect(result.totalSpent).toBe(191);
      expect(result.count).toBe(2);
      expect(result.largest.map((t) => t.name)).toEqual(['Dinner', 'Lunch']);
    });

    it('matches categories through the alias map', async () => {
      const { tools } = makeTools({
        transactions: [
          {
            name: 'Rent',
            amount: -12000,
            category: 'Housing',
            date: dayKey(0),
          },
        ],
      });
      const result = (await tools.execute(USER_ID, 'getCategorySpending', {
        category: 'Rent',
        period: 'week',
      })) as { totalSpent: number; count: number };
      expect(result.totalSpent).toBe(12000);
      expect(result.count).toBe(1);
    });
  });

  describe('getGoalProgress', () => {
    it('computes progress from saved and target amounts', async () => {
      const { tools } = makeTools({
        profile: {
          profile: { monthly_income: 50000 },
          goals: [
            {
              name: 'Emergency fund',
              target_amount: 100000,
              saved_amount: '25000.00',
              target_date: '2027-06-01',
              priority: 'high',
            },
            {
              name: 'No target',
              target_amount: 0,
              saved_amount: '0.00',
              target_date: '2027-01-01',
              priority: 'low',
            },
          ],
          onboarding_completed: true,
        },
      });
      const result = (await tools.execute(USER_ID, 'getGoalProgress', {})) as {
        goals: { name: string; progressPercent: number }[];
        totalTarget: number;
        totalSaved: number;
      };
      expect(result.goals[0]).toEqual({
        name: 'Emergency fund',
        target: 100000,
        saved: 25000,
        remaining: 75000,
        progressPercent: 25,
        targetDate: '2027-06-01',
        priority: 'high',
      });
      expect(result.goals[1]?.progressPercent).toBe(0);
      expect(result.totalTarget).toBe(100000);
      expect(result.totalSaved).toBe(25000);
    });

    it('returns an empty list when there are no goals', async () => {
      const { tools } = makeTools({
        profile: { profile: {}, goals: [], onboarding_completed: true },
      });
      const result = await tools.execute(USER_ID, 'getGoalProgress', {});
      expect(result).toEqual({ goals: [], totalTarget: 0, totalSaved: 0 });
    });
  });

  describe('getReadinessScore', () => {
    it('returns the deterministic assessment from the readiness service', async () => {
      const assessment = { available: true, score: 71, band: 'Ready' };
      const { tools, assess } = makeTools({ readiness: assessment });
      const result = await tools.execute(USER_ID, 'getReadinessScore', {});
      expect(result).toBe(assessment);
      expect(assess).toHaveBeenCalledWith(USER_ID);
    });

    it('passes the unavailable shape through unchanged', async () => {
      const { tools } = makeTools();
      const result = await tools.execute(USER_ID, 'getReadinessScore', {});
      expect(result).toEqual({
        available: false,
        reason: 'Complete your financial profile.',
        missing: ['financial profile'],
      });
    });
  });

  describe('getStockQuote', () => {
    it('delegates to the market service', async () => {
      const quote = { symbol: 'RELIANCE', price: 1500, changePercent: 1.2 };
      const { tools } = makeTools({ quote });
      const result = await tools.execute(USER_ID, 'getStockQuote', {
        symbol: 'reliance',
      });
      expect(result).toBe(quote);
    });
  });

  describe('getStockFundamentals', () => {
    function historyFixture(closes: number[]) {
      return {
        symbol: 'RELIANCE',
        range: '3mo',
        bars: closes.map((close, index) => ({
          date: `2026-09-${String(index + 1).padStart(2, '0')}`,
          open: close,
          high: close,
          low: close,
          close,
          volume: 1000,
        })),
        fetchedAt: new Date().toISOString(),
        stale: false,
      };
    }

    it('combines profile, quote, and computed technicals', async () => {
      const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);
      const profileData = {
        symbol: 'RELIANCE',
        quote: { price: 129.5, changePercent: 0.4 },
        fundamentals: { marketCap: 1_000_000, peRatio: 22.5 },
        fundamentalsAvailable: true,
      };
      const { tools, history } = makeTools({
        fundamentals: profileData,
        history: historyFixture(closes),
      });
      const result = (await tools.execute(USER_ID, 'getStockFundamentals', {
        symbol: 'RELIANCE',
      })) as {
        technicals: {
          rsi14: number | null;
          sma20: number | null;
          sma50: number | null;
          change1moPercent: number | null;
          barsUsed: number;
          note: string | null;
        };
      };
      expect(history).toHaveBeenCalledWith('RELIANCE', '3mo');
      // Technicals are rounded to two decimals for the model.
      expect(result.technicals.rsi14).toBeCloseTo(
        rsi(closes, 14)[closes.length - 1] ?? 0,
        2,
      );
      expect(result.technicals.sma20).toBeCloseTo(
        sma(closes, 20)[closes.length - 1] ?? 0,
        2,
      );
      expect(result.technicals.sma50).toBeCloseTo(
        sma(closes, 50)[closes.length - 1] ?? 0,
        2,
      );
      expect(result.technicals.change1moPercent).toBeCloseTo(
        ((closes[59] - closes[38]) / closes[38]) * 100,
        2,
      );
      expect(result.technicals.barsUsed).toBe(60);
      expect(result.technicals.note).toBeNull();
    });

    it('notes thin and stale history instead of inventing values', async () => {
      const { tools } = makeTools({
        fundamentals: {
          symbol: 'NEWCO',
          quote: { price: 10 },
          fundamentals: {},
          fundamentalsAvailable: false,
        },
        history: {
          ...historyFixture([10, 11, 12]),
          stale: true,
        },
      });
      const result = (await tools.execute(USER_ID, 'getStockFundamentals', {
        symbol: 'NEWCO',
      })) as {
        technicals: {
          rsi14: number | null;
          sma20: number | null;
          note: string | null;
        };
      };
      expect(result.technicals.rsi14).toBeNull();
      expect(result.technicals.sma20).toBeNull();
      expect(result.technicals.note).toContain('Not enough price history');
      expect(result.technicals.note).toContain('out of date');
    });

    it('propagates data failures so the caller can report them', async () => {
      const failing = new AiTools(
        {} as ProfileService,
        {} as ActivityService,
        {
          quote: jest.fn(),
          profile: jest.fn().mockResolvedValue({
            symbol: 'RELIANCE',
            quote: {},
            fundamentals: {},
          }),
          history: jest
            .fn()
            .mockRejectedValue(
              new ServiceUnavailableException('Market data is unavailable.'),
            ),
        } as unknown as MarketService,
        {} as PortfolioService,
        {} as RagRetrievalService,
        {} as ReadinessService,
      );
      await expect(
        failing.execute(USER_ID, 'getStockFundamentals', {
          symbol: 'RELIANCE',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('searchKnowledge returns labelled, truncated chunks', async () => {
      const longContent = 'word '.repeat(200);
      const { tools, retrieve } = makeTools({
        retrieval: {
          available: true,
          reason: null,
          chunks: [
            {
              source_type: 'news',
              title: 'Reliance profit jumps',
              symbol: 'RELIANCE.NS',
              published_at: new Date('2026-11-18T10:00:00Z'),
              url: 'https://example.test/a1',
              similarity: 0.8234,
              content: longContent,
            },
          ],
        },
      });
      const result = (await tools.execute(USER_ID, 'searchKnowledge', {
        query: 'Reliance news',
        symbol: 'reliance.ns',
      })) as {
        available: boolean;
        chunks: Array<Record<string, unknown>>;
      };
      expect(retrieve).toHaveBeenCalledWith(USER_ID, 'Reliance news', {
        symbol: 'RELIANCE.NS',
      });
      expect(result.available).toBe(true);
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].title).toBe('Reliance profit jumps');
      expect(result.chunks[0].publishedAt).toBe('2026-11-18');
      expect(result.chunks[0].similarity).toBe(0.82);
      expect((result.chunks[0].content as string).length).toBeLessThanOrEqual(
        601,
      );
    });

    it('searchKnowledge reports an outage instead of empty context', async () => {
      const { tools } = makeTools({
        retrieval: {
          available: false,
          reason: 'Retrieval is unavailable right now.',
          chunks: [],
        },
      });
      const result = await tools.execute(USER_ID, 'searchKnowledge', {
        query: 'Reliance news',
      });
      expect(result).toEqual({
        available: false,
        reason: 'Retrieval is unavailable right now.',
        chunks: [],
      });
    });

    it('searchKnowledge rejects invalid arguments', async () => {
      const { tools } = makeTools();
      await expect(
        tools.execute(USER_ID, 'searchKnowledge', { query: '' }),
      ).rejects.toThrow();
      await expect(
        tools.execute(USER_ID, 'searchKnowledge', {}),
      ).rejects.toThrow();
    });
  });
});
