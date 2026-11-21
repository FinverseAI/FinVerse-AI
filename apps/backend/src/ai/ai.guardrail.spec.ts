import type { RetrievedChunk } from '../rag/rag.repository';
import type { ScreenResponse } from '../rag/rag.service';
import {
  chunksFromRetrieved,
  chunksFromToolResults,
  extractTextNumbers,
  verifyAnswer,
  type GuardrailContext,
} from './ai.guardrail';
import type { AiAnswer, AiClaim } from './ai.validation';

/**
 * The Phase 3 acceptance suite (plan §2, Phase 3): the guardrail is fed
 * deliberately corrupted outputs — wrong amounts, invented tickers,
 * fake citations, swapped numbers — and must catch 100% of them.
 *
 * The suite also pins the other side of the contract: legitimate
 * answers (rounded percentages, period labels like "20-day", years,
 * complete citations) must PASS, so the guardrail does not punish
 * honest answers.
 */

const CATEGORY_SPENDING = {
  category: 'Food & Dining',
  period: 'month',
  startDate: '2026-11-01',
  endDate: '2026-11-21',
  totalSpent: 8200,
  count: 12,
  largest: [
    { name: 'Dinner at Spice House', amount: 1250, date: '2026-11-19' },
    { name: 'Grocery run', amount: 900, date: '2026-11-18' },
  ],
};

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
  ],
  totalBudgeted: 15000,
  totalSpent: 12800,
  totalRemaining: 2200,
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

const QUOTE = {
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

function claim(
  text: string,
  tool: string,
  values: Record<string, string | number | boolean | null>,
): AiClaim {
  return { text, source: { tool, values } };
}

function answer(claims: AiClaim[]): AiAnswer {
  return {
    answer: claims.map((entry) => entry.text).join(' '),
    claims,
    refused: false,
    refusalReason: null,
  };
}

function context(overrides: Partial<GuardrailContext> = {}): GuardrailContext {
  return {
    requestId: 'req-1',
    userId: 'user-123',
    feature: 'chat',
    toolResults: new Map<string, unknown[]>([
      ['getCategorySpending', [CATEGORY_SPENDING]],
      ['getBudgetStatus', [BUDGET_STATUS]],
      ['getStockFundamentals', [FUNDAMENTALS]],
      ['getStockQuote', [QUOTE]],
    ]),
    chunks: chunksFromRetrieved([NEWS_CHUNK]),
    ...overrides,
  };
}

describe('verifyAnswer — legitimate answers pass', () => {
  it('passes an exact money claim', () => {
    const result = verifyAnswer(
      answer([
        claim('You spent ₹8,200 on Food & Dining.', 'getCategorySpending', {
          category: 'Food & Dining',
          totalSpent: 8200,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(true);
    expect(result.checksFailed).toBe(0);
  });

  it('passes a claim scoped to one budget category', () => {
    const result = verifyAnswer(
      answer([
        claim(
          'Transport is at ₹4,200 spent of ₹5,000 budgeted.',
          'getBudgetStatus',
          { category: 'Transport', spent: 4200, budgeted: 5000 },
        ),
      ]),
      context(),
    );
    expect(result.passed).toBe(true);
  });

  it('passes a 1-decimal restatement of a percentage (tolerance)', () => {
    const result = verifyAnswer(
      answer([
        claim('The RSI is 55.6.', 'getStockFundamentals', { rsi14: 55.6 }),
        claim('It is up 0.8% today.', 'getStockQuote', {
          changePercent: 0.8,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(true);
  });

  it('passes a 1-decimal restatement of a ratio (P/E)', () => {
    const result = verifyAnswer(
      answer([
        claim('The P/E is about 25.4.', 'getStockFundamentals', {
          trailingPE: 25.4,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(true);
  });

  it('passes period labels, years, and counts in the claim text', () => {
    const result = verifyAnswer(
      answer([
        claim(
          'The price sits above its 20-day average and the RSI (14) is 55.55, in line with the trend since 2024 across 3 signals.',
          'getStockFundamentals',
          { rsi14: 55.55, sma20: 2500.5 },
        ),
      ]),
      context(),
    );
    expect(result.passed).toBe(true);
  });

  it('passes a market-cap claim written in lakh crore', () => {
    const result = verifyAnswer(
      answer([
        claim('The market cap is ₹17.6 lakh crore.', 'getStockFundamentals', {
          marketCap: 17_600_000_000_000,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(true);
  });

  it('passes a news claim citing the retrieved title and date', () => {
    const result = verifyAnswer(
      answer([
        claim('Reliance profit jumped.', 'searchKnowledge', {
          title: 'Reliance profit jumps',
          date: '2026-11-18',
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(true);
  });

  it('passes a news claim whose number appears in the article text', () => {
    const result = verifyAnswer(
      answer([
        claim('Profit rose 12% on strong retail sales.', 'searchKnowledge', {
          title: 'Reliance profit jumps',
          date: '2026-11-18',
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(true);
  });

  it('passes a screener claim matching the screened row', () => {
    const result = verifyAnswer(
      answer([
        claim('RELIANCE.NS has an RSI of 100.', 'screenStocks', {
          symbol: 'RELIANCE.NS',
          rsi14: 100,
        }),
      ]),
      context({ feature: 'screen', screen: SCREEN }),
    );
    expect(result.passed).toBe(true);
  });

  it('passes a claim about the number of screened matches', () => {
    const result = verifyAnswer(
      answer([
        claim('1 stock matched your filters.', 'screenStocks', {
          matches: 1,
        }),
      ]),
      context({ feature: 'screen', screen: SCREEN }),
    );
    expect(result.passed).toBe(true);
  });

  it('passes a refusal with no checks at all', () => {
    const result = verifyAnswer(
      {
        answer: 'I cannot predict what a stock will do tomorrow.',
        claims: [],
        refused: true,
        refusalReason: 'I cannot predict what a stock will do tomorrow.',
      },
      context(),
    );
    expect(result.passed).toBe(true);
    expect(result.checks).toHaveLength(0);
  });

  it('accepts the P/E alias (pe → trailingPE)', () => {
    const result = verifyAnswer(
      answer([claim('The P/E is 25.4.', 'getStockFundamentals', { pe: 25.4 })]),
      context(),
    );
    expect(result.passed).toBe(true);
  });

  it('accepts a symbol without the exchange suffix', () => {
    const result = verifyAnswer(
      answer([
        claim('RELIANCE is trading at ₹2,600.', 'getStockQuote', {
          symbol: 'RELIANCE',
          price: 2600,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(true);
  });
});

describe('verifyAnswer — corrupted outputs are caught (100%)', () => {
  it('catches a wrong amount', () => {
    const result = verifyAnswer(
      answer([
        claim('You spent ₹9,200 on Food & Dining.', 'getCategorySpending', {
          totalSpent: 9200,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
    expect(result.failures.some((check) => check.checkType === 'value')).toBe(
      true,
    );
    expect(result.failures[0]?.expected).toBe('8200');
  });

  it('catches a swapped number (budgeted stated as spent)', () => {
    // 10000 IS in the tool result (as budgeted) — matching by value
    // alone would pass this; matching by field name must catch it.
    const result = verifyAnswer(
      answer([
        claim('You spent ₹10,000 on Food & Dining.', 'getCategorySpending', {
          totalSpent: 10000,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a swapped number in the claim text', () => {
    // The values are right (8200) but the prose says ₹10,000 — the
    // budgeted figure. The text must agree with the cited values.
    const result = verifyAnswer(
      answer([
        claim('You spent ₹10,000 on Food & Dining.', 'getCategorySpending', {
          totalSpent: 8200,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
    expect(result.failures.some((check) => check.checkType === 'text')).toBe(
      true,
    );
  });

  it('catches a category swap (Food spending attributed to Transport)', () => {
    const result = verifyAnswer(
      answer([
        claim('Transport is at ₹8,600 spent.', 'getBudgetStatus', {
          category: 'Transport',
          spent: 8600,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches an invented ticker', () => {
    const result = verifyAnswer(
      answer([
        claim('FAKECO is trading at ₹100.', 'getStockQuote', {
          symbol: 'FAKECO.NS',
          price: 100,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a claim citing a tool that was never called', () => {
    const result = verifyAnswer(
      answer([
        claim('You saved ₹50,000 towards your goal.', 'getGoalProgress', {
          totalSaved: 50000,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
    expect(result.failures.some((check) => check.checkType === 'source')).toBe(
      true,
    );
  });

  it('catches a claim citing an invented tool', () => {
    const result = verifyAnswer(
      answer([
        claim('Bitcoin is at $90,000.', 'getCryptoPrices', {
          price: 90000,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a fake news citation (invented title)', () => {
    const result = verifyAnswer(
      answer([
        claim('Reliance is buying a bank.', 'searchKnowledge', {
          title: 'Reliance buys a bank',
          date: '2026-11-18',
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a real title with a wrong date', () => {
    const result = verifyAnswer(
      answer([
        claim('Reliance profit jumped.', 'searchKnowledge', {
          title: 'Reliance profit jumps',
          date: '2026-11-01',
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a news claim when nothing was retrieved', () => {
    const result = verifyAnswer(
      answer([
        claim('Reliance profit jumped.', 'searchKnowledge', {
          title: 'Reliance profit jumps',
          date: '2026-11-18',
        }),
      ]),
      context({ chunks: [] }),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a number the article never stated', () => {
    const result = verifyAnswer(
      answer([
        claim('Profit rose 25% on strong retail sales.', 'searchKnowledge', {
          title: 'Reliance profit jumps',
          date: '2026-11-18',
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a wrong screener metric', () => {
    const result = verifyAnswer(
      answer([
        claim('RELIANCE.NS has an RSI of 55.', 'screenStocks', {
          symbol: 'RELIANCE.NS',
          rsi14: 55,
        }),
      ]),
      context({ feature: 'screen', screen: SCREEN }),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a screener claim about a stock outside the universe', () => {
    const result = verifyAnswer(
      answer([
        claim('INFY.NS has an RSI of 100.', 'screenStocks', {
          symbol: 'INFY.NS',
          rsi14: 100,
        }),
      ]),
      context({ feature: 'screen', screen: SCREEN }),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a screener claim with no screen in the request', () => {
    const result = verifyAnswer(
      answer([
        claim('RELIANCE.NS has an RSI of 100.', 'screenStocks', {
          symbol: 'RELIANCE.NS',
          rsi14: 100,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a one-paise money error (money is exact)', () => {
    const result = verifyAnswer(
      answer([
        claim('RELIANCE is at ₹2,600.01.', 'getStockQuote', {
          price: 2600.01,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a percentage outside the tolerance', () => {
    const result = verifyAnswer(
      answer([
        claim('It is up 1.5% today.', 'getStockQuote', {
          changePercent: 1.5,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches an RSI outside the tolerance', () => {
    const result = verifyAnswer(
      answer([
        claim('The RSI is 56.5.', 'getStockFundamentals', { rsi14: 56.5 }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a claim with no verifiable values at all', () => {
    const result = verifyAnswer(
      answer([
        claim('Your portfolio is doing great.', 'getPortfolioSummary', {}),
      ]),
      context({
        toolResults: new Map([
          [
            'getPortfolioSummary',
            [
              {
                holdings: [],
                totals: {
                  totalValue: 0,
                  totalInvested: 0,
                  totalGainLoss: 0,
                  totalGainLossPercent: 0,
                },
              },
            ],
          ],
        ]),
      }),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a value the tool never returned', () => {
    const result = verifyAnswer(
      answer([
        claim('Your credit score is 780.', 'getBudgetStatus', {
          creditScore: 780,
        }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches a non-refused answer with no claims', () => {
    const result = verifyAnswer(
      {
        answer: 'Trust me, everything is fine.',
        claims: [],
        refused: false,
        refusalReason: null,
      },
      context(),
    );
    expect(result.passed).toBe(false);
  });

  it('catches one bad claim among good ones', () => {
    const result = verifyAnswer(
      answer([
        claim('You spent ₹8,200 on Food & Dining.', 'getCategorySpending', {
          totalSpent: 8200,
        }),
        claim('RELIANCE is at ₹9,999.', 'getStockQuote', { price: 9999 }),
      ]),
      context(),
    );
    expect(result.passed).toBe(false);
    expect(result.checksPassed).toBeGreaterThan(0);
    expect(result.checksFailed).toBeGreaterThan(0);
  });
});

describe('verifyAnswer — the answer text itself is checked', () => {
  it('fails when the prose states a number no claim cites', () => {
    const result = verifyAnswer(
      {
        answer: 'You spent ₹8,200 on food, leaving ₹1,400.',
        claims: [
          claim('You spent ₹8,200 on Food & Dining.', 'getCategorySpending', {
            totalSpent: 8200,
          }),
        ],
        refused: false,
        refusalReason: null,
      },
      context(),
    );
    expect(result.passed).toBe(false);
    expect(
      result.failures.some(
        (check) => check.checkType === 'text' && check.claimIndex === -1,
      ),
    ).toBe(true);
  });

  it('passes when the prose restates a number from the cited element', () => {
    const result = verifyAnswer(
      {
        answer: 'Transport: ₹4,200 spent of ₹5,000 budgeted.',
        claims: [
          claim('Transport is at ₹4,200 spent.', 'getBudgetStatus', {
            category: 'Transport',
            spent: 4200,
          }),
        ],
        refused: false,
        refusalReason: null,
      },
      context(),
    );
    expect(result.passed).toBe(true);
  });

  it('passes when the prose restates a number from the cited article', () => {
    const result = verifyAnswer(
      {
        answer: 'Profit rose 12% on strong retail sales.',
        claims: [
          claim('Reliance profit jumped.', 'searchKnowledge', {
            title: 'Reliance profit jumps',
            date: '2026-11-18',
          }),
        ],
        refused: false,
        refusalReason: null,
      },
      context(),
    );
    expect(result.passed).toBe(true);
  });
});

describe('extractTextNumbers', () => {
  it('extracts rupee amounts with Indian grouping', () => {
    expect(extractTextNumbers('You spent ₹8,200.')).toEqual([
      { value: 8200, raw: '₹8,200', unit: 'plain' },
    ]);
    expect(extractTextNumbers('Income is ₹1,20,000.')[0]?.value).toBe(120000);
  });

  it('extracts percentages and decimals', () => {
    expect(extractTextNumbers('Up 8.2% today.')).toEqual([
      { value: 8.2, raw: '8.2%', unit: 'percent' },
    ]);
    expect(extractTextNumbers('RSI is 55.55.')[0]?.value).toBe(55.55);
  });

  it('expands lakh crore and crore', () => {
    expect(extractTextNumbers('₹17.6 lakh crore')[0]?.value).toBe(
      17.6 * 100_000 * 10_000_000,
    );
    expect(extractTextNumbers('₹3.03 crore')[0]?.value).toBeCloseTo(
      30_300_000,
      0,
    );
  });

  it('skips dates, years, periods, and small counts', () => {
    expect(
      extractTextNumbers('On 2026-11-19 the 20-day average held.'),
    ).toEqual([]);
    expect(extractTextNumbers('Since 2024, across 3 signals.')).toEqual([]);
    expect(extractTextNumbers('The RSI (14) is steady.')).toEqual([]);
  });

  it('extracts negative amounts', () => {
    expect(extractTextNumbers('Down −₹1,200.')[0]?.value).toBe(-1200);
  });
});

describe('chunk normalisers', () => {
  it('normalises raw retrieved chunks', () => {
    const chunks = chunksFromRetrieved([NEWS_CHUNK]);
    expect(chunks).toEqual([
      {
        title: 'Reliance profit jumps',
        symbol: 'RELIANCE.NS',
        publishedAt: '2026-11-18',
        sourceType: 'news',
        content: NEWS_CHUNK.content,
      },
    ]);
  });

  it('normalises searchKnowledge tool results', () => {
    const chunks = chunksFromToolResults([
      {
        available: true,
        chunks: [
          {
            sourceType: 'news',
            title: 'Reliance profit jumps',
            symbol: 'RELIANCE.NS',
            publishedAt: '2026-11-18',
            url: 'https://example.test/a1',
            similarity: 0.82,
            content: 'Reliance profit jumps 12%.',
          },
        ],
      },
    ]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.publishedAt).toBe('2026-11-18');
    expect(chunks[0]?.content).toContain('12%');
  });

  it('ignores malformed tool results', () => {
    expect(chunksFromToolResults([null, {}, { chunks: 'nope' }])).toEqual([]);
  });
});
