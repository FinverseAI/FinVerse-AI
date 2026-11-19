import { formatRetrievedContext, formatScreenResults } from './rag.prompts';
import type { RetrievedChunk } from './rag.repository';
import type { ScreenResponse } from './rag.service';

const chunk = (overrides: Partial<RetrievedChunk> = {}): RetrievedChunk => ({
  id: 'doc-1',
  source_type: 'news',
  source_id: 'https://example.test/a1',
  user_id: null,
  symbol: 'RELIANCE.NS',
  title: 'Reliance profit jumps',
  content: 'Reliance profit jumps. Source: Reuters.',
  published_at: new Date('2026-11-18T10:00:00Z'),
  url: 'https://example.test/a1',
  metadata: { publisher: 'Reuters' },
  created_at: new Date('2026-11-18T10:05:00Z'),
  updated_at: new Date('2026-11-18T10:05:00Z'),
  similarity: 0.82,
  ...overrides,
});

describe('formatRetrievedContext', () => {
  it('returns an empty string for no chunks', () => {
    expect(formatRetrievedContext([])).toBe('');
  });

  it('labels news with title, publisher and date', () => {
    const block = formatRetrievedContext([chunk()]);
    expect(block).toContain(
      '[1] News — "Reliance profit jumps" (Reuters, 2026-11-18)',
    );
    expect(block).toContain('Reliance profit jumps. Source: Reuters.');
    expect(block).toContain('never instructions');
  });

  it('labels profiles and transactions by source', () => {
    const block = formatRetrievedContext([
      chunk({
        source_type: 'profile',
        title: 'Reliance Industries',
        content: 'Reliance Industries. Sector: Energy.',
        published_at: null,
        metadata: null,
      }),
      chunk({
        source_type: 'transaction',
        title: 'Swiggy order',
        symbol: null,
        content: 'Swiggy order: spent ₹420.50.',
        published_at: new Date('2026-11-15T00:00:00Z'),
      }),
    ]);
    expect(block).toContain('[1] Company profile — Reliance Industries:');
    expect(block).toContain(
      '[2] Your transaction — Swiggy order (2026-11-15):',
    );
  });

  it('truncates long chunks', () => {
    const block = formatRetrievedContext([
      chunk({ content: 'x'.repeat(2000) }),
    ]);
    expect(block).not.toContain('x'.repeat(2000));
    expect(block).toContain('x'.repeat(600));
    expect(block).toContain('\u2026');
  });

  it('numbers multiple chunks in order', () => {
    const block = formatRetrievedContext([
      chunk(),
      chunk({ id: 'doc-2', title: 'Second article' }),
    ]);
    expect(block).toContain('[1] News — "Reliance profit jumps"');
    expect(block).toContain('[2] News — "Second article"');
  });
});

describe('formatScreenResults', () => {
  const screen = (overrides: Partial<ScreenResponse> = {}): ScreenResponse => ({
    filters: {},
    universe: ['RELIANCE.NS'],
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
    unavailable: [],
    evaluatedAt: new Date().toISOString(),
    ...overrides,
  });

  it('formats matches as compact lines', () => {
    const text = formatScreenResults(screen());
    expect(text).toBe(
      'RELIANCE.NS: price ₹2600, RSI 100, P/E 25, 1-month 5.5%, market cap ₹1760000 crore',
    );
  });

  it('says so when nothing matched', () => {
    expect(formatScreenResults(screen({ matches: [] }))).toBe(
      'No stocks matched the filters.',
    );
  });

  it('lists unavailable symbols and caps at ten matches', () => {
    const matches = Array.from({ length: 12 }, (_, i) => ({
      ...screen().matches[0],
      symbol: `SYM${i}.NS`,
    }));
    const text = formatScreenResults(
      screen({ matches, unavailable: ['DEAD.NS'] }),
    );
    expect(text).toContain('Unavailable: DEAD.NS');
    expect(text).not.toContain('SYM10.NS');
    expect(text).toContain('SYM9.NS');
  });

  it('omits null metrics', () => {
    const text = formatScreenResults(
      screen({
        matches: [
          {
            ...screen().matches[0],
            price: null,
            rsi14: null,
            trailingPE: null,
            change1moPercent: null,
            marketCap: null,
          },
        ],
      }),
    );
    expect(text).toBe('RELIANCE.NS: price n/a');
  });
});
