import type YahooFinance from 'yahoo-finance2';
import { YahooFinanceProvider } from './market.provider';

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
    expect(quoteSummary).toHaveBeenCalledWith('HDFCBANK.NS', {
      modules: [
        'assetProfile',
        'summaryDetail',
        'price',
        'financialData',
        'defaultKeyStatistics',
      ],
    });
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
