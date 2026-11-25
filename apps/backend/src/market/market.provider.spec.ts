import YahooFinance from 'yahoo-finance2';
import { YahooFinanceProvider, YAHOO_TIMEOUT_MS } from './market.provider';

describe('YahooFinanceProvider profile mapping', () => {
  const quoteSummary = jest.fn();
  const client = { quoteSummary } as unknown as InstanceType<
    typeof YahooFinance
  >;

  beforeEach(() => {
    quoteSummary.mockReset();
  });

  it('maps the deeper fundamentals from financialData and defaultKeyStatistics', async () => {
    quoteSummary.mockResolvedValue({
      assetProfile: {
        sector: 'Financial Services',
        industry: 'Banks',
        longBusinessSummary: 'A large Indian bank.',
      },
      summaryDetail: {
        marketCap: 14000000000000,
        trailingPE: 19.5,
        forwardPE: 17.2,
        dividendYield: 0.012,
        fiftyTwoWeekHigh: 860,
        fiftyTwoWeekLow: 700,
        payoutRatio: 0.24,
      },
      price: {
        longName: 'HDFC Bank Limited',
        currency: 'INR',
      },
      financialData: {
        returnOnEquity: 0.168,
        debtToEquity: 12.4,
        revenueGrowth: 0.19,
        earningsGrowth: 0.22,
      },
      defaultKeyStatistics: {
        bookValue: 412.5,
        priceToBook: 1.95,
        beta: 1.05,
        sharesOutstanding: 7650000000,
      },
    });
    const provider = new YahooFinanceProvider(client);
    const profile = await provider.profile('HDFCBANK.NS');
    expect(quoteSummary).toHaveBeenCalledWith(
      'HDFCBANK.NS',
      {
        modules: [
          'assetProfile',
          'summaryDetail',
          'price',
          'financialData',
          'defaultKeyStatistics',
        ],
      },
      expect.objectContaining({
        fetchOptions: expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      }),
    );
    expect(profile).toMatchObject({
      symbol: 'HDFCBANK.NS',
      name: 'HDFC Bank Limited',
      marketCap: 14000000000000,
      bookValue: 412.5,
      priceToBook: 1.95,
      returnOnEquity: 0.168,
      debtToEquity: 12.4,
      revenueGrowth: 0.19,
      earningsGrowth: 0.22,
      payoutRatio: 0.24,
      beta: 1.05,
      sharesOutstanding: 7650000000,
    });
  });

  it('leaves absent fundamentals undefined instead of inventing zeros', async () => {
    quoteSummary.mockResolvedValue({
      assetProfile: {},
      summaryDetail: {},
      price: { currency: 'INR' },
      financialData: {},
      defaultKeyStatistics: {},
    });
    const provider = new YahooFinanceProvider(client);
    const profile = await provider.profile('UNKNOWN.NS');
    expect(profile.bookValue).toBeUndefined();
    expect(profile.priceToBook).toBeUndefined();
    expect(profile.returnOnEquity).toBeUndefined();
    expect(profile.debtToEquity).toBeUndefined();
    expect(profile.revenueGrowth).toBeUndefined();
    expect(profile.earningsGrowth).toBeUndefined();
    expect(profile.payoutRatio).toBeUndefined();
    expect(profile.beta).toBeUndefined();
    expect(profile.sharesOutstanding).toBeUndefined();
    expect(profile.marketCap).toBeUndefined();
  });

  it('ignores non-finite values from the provider', async () => {
    quoteSummary.mockResolvedValue({
      summaryDetail: { payoutRatio: Number.NaN },
      financialData: { returnOnEquity: Number.POSITIVE_INFINITY },
      defaultKeyStatistics: { beta: 'high' },
      price: {},
    });
    const provider = new YahooFinanceProvider(client);
    const profile = await provider.profile('X.NS');
    expect(profile.payoutRatio).toBeUndefined();
    expect(profile.returnOnEquity).toBeUndefined();
    expect(profile.beta).toBeUndefined();
  });
});

describe('YahooFinanceProvider quote currency (B21)', () => {
  const quote = jest.fn();
  const client = { quote } as unknown as InstanceType<typeof YahooFinance>;

  beforeEach(() => {
    quote.mockReset();
  });

  it('defaults a missing currency to INR only for Indian listings', async () => {
    quote.mockResolvedValue({
      symbol: 'RELIANCE.NS',
      regularMarketPrice: 2600,
      currency: undefined,
    });
    const provider = new YahooFinanceProvider(client);
    expect((await provider.quote('RELIANCE.NS')).currency).toBe('INR');
    quote.mockResolvedValue({
      symbol: 'RELIANCE.BO',
      regularMarketPrice: 2600,
    });
    expect((await provider.quote('RELIANCE.BO')).currency).toBe('INR');
  });

  it('treats a foreign quote with no currency as unpriceable', async () => {
    quote.mockResolvedValue({
      symbol: 'AAPL',
      regularMarketPrice: 250,
    });
    const provider = new YahooFinanceProvider(client);
    await expect(provider.quote('AAPL')).rejects.toThrow(/currency/);
  });

  it('passes a timeout signal with every quote call (B20)', async () => {
    quote.mockResolvedValue({
      symbol: 'AAPL',
      regularMarketPrice: 250,
      currency: 'USD',
    });
    const provider = new YahooFinanceProvider(client);
    await provider.quote('AAPL');
    expect(quote).toHaveBeenCalledWith(
      'AAPL',
      undefined,
      expect.objectContaining({
        fetchOptions: expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      }),
    );
  });
});

describe('YahooFinanceProvider timeout against a hung upstream (B20)', () => {
  it('fails within the timeout instead of hanging forever', async () => {
    expect(YAHOO_TIMEOUT_MS).toBe(10_000);
    const hungFetch = jest.fn(
      (_input: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(
              new DOMException('The operation was aborted.', 'AbortError'),
            ),
          );
        }),
    );
    const client = new YahooFinance({
      fetch: hungFetch as unknown as typeof fetch,
      suppressNotices: ['yahooSurvey'],
    });
    const provider = new YahooFinanceProvider(client);
    const started = Date.now();
    // Real timers on purpose: AbortSignal.timeout's timer is a Node
    // internal that jest's fake timers cannot drive, so this test
    // waits out the real 10s timeout and proves a hung upstream
    // surfaces as a rejection instead of hanging the request.
    await expect(provider.quote('AAPL')).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(15_000);
    expect(hungFetch).toHaveBeenCalled();
  }, 20_000);
});
