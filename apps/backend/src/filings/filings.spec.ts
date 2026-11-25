import { BadRequestException } from '@nestjs/common';
import { BseClient, parseBseAnnouncements, parseBseDate } from './bse.client';
import {
  bseStockPageUrl,
  drhpLinks,
  nseQuotePageUrl,
  ratingLinks,
  reportLinks,
} from './deep-links';
import { FilingsService, mergeAnnouncements } from './filings.service';
import type { FilingEntry } from './filings.types';
import { NseClient, parseNseAnnouncements, parseNseDate } from './nse.client';
import { findCompany, findCompanyByScripCode, nseSymbolOf } from './registry';

describe('company registry', () => {
  it('resolves a known symbol with and without the .NS suffix', () => {
    expect(findCompany('HDFCBANK')).toMatchObject({
      companyName: 'HDFC Bank Ltd',
      bseScripCode: '500180',
    });
    expect(findCompany('hdfcbank.ns')).toMatchObject({
      bseScripCode: '500180',
    });
    expect(findCompany('RELIANCE')).toMatchObject({
      bseScripCode: '500325',
    });
    expect(findCompany('TCS')).toMatchObject({ bseScripCode: '532540' });
  });

  it('returns null for an unknown symbol — never a guessed scrip code', () => {
    expect(findCompany('UNKNOWNCO.NS')).toBeNull();
    expect(findCompany('UNKNOWNCO')).toBeNull();
  });

  it('resolves a .BO symbol through its scrip code', () => {
    expect(findCompanyByScripCode('500180')).toMatchObject({
      symbol: 'HDFCBANK',
    });
    expect(findCompanyByScripCode('500180.BO')).toMatchObject({
      symbol: 'HDFCBANK',
    });
    expect(findCompanyByScripCode('999999')).toBeNull();
  });

  it('treats .BO symbols as non-NSE for the NSE lookup', () => {
    expect(nseSymbolOf('500180.BO')).toBeNull();
    expect(nseSymbolOf('RELIANCE.NS')).toBe('RELIANCE');
    expect(nseSymbolOf('RELIANCE')).toBe('RELIANCE');
  });
});

describe('deep links', () => {
  const hdfc = findCompany('HDFCBANK')!;

  it('builds the NSE quote page for a symbol', () => {
    expect(nseQuotePageUrl('HDFCBANK')).toBe(
      'https://www.nseindia.com/get-quotes/equity?symbol=HDFCBANK',
    );
  });

  it('builds the verified BSE stock page for HDFC Bank', () => {
    expect(bseStockPageUrl(hdfc)).toBe(
      'https://www.bseindia.com/stock-share-price/hdfc-bank-ltd/hdfcbank/500180/',
    );
  });

  it('points report links at the company IR page first', () => {
    const links = reportLinks(hdfc, 'HDFCBANK');
    expect(links[0]).toMatchObject({
      source: 'Company IR',
      url: 'https://www.hdfcbank.com/personal/about-us/investor-relations',
    });
    expect(links.some((link) => link.source === 'BSE')).toBe(true);
    expect(links.some((link) => link.source === 'NSE')).toBe(true);
  });

  it('falls back to exchange links for an unregistered company', () => {
    const links = reportLinks(null, 'UNKNOWNCO');
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      source: 'NSE',
      url: 'https://www.nseindia.com/get-quotes/equity?symbol=UNKNOWNCO',
    });
  });

  it('points DRHP at the SEBI public-issues page', () => {
    expect(drhpLinks()).toEqual([
      {
        label: 'SEBI — public issues & offer documents (DRHP/RHP)',
        url: 'https://www.sebi.gov.in/filings/public-issues.html',
        source: 'SEBI',
      },
    ]);
  });

  it('names the company in rating-agency search links, or stays generic', () => {
    expect(ratingLinks('HDFC Bank Ltd')[0].label).toBe(
      'Search CRISIL Ratings for HDFC Bank Ltd',
    );
    expect(ratingLinks(null)[0].label).toBe('Search CRISIL Ratings');
    expect(ratingLinks('X')).toHaveLength(3);
  });
});

describe('NSE date parsing', () => {
  it('parses DD-Mon-YYYY and passes ISO dates through', () => {
    expect(parseNseDate('24-Nov-2026')).toBe('2026-11-24');
    expect(parseNseDate('3-Jan-2025')).toBe('2025-01-03');
    expect(parseNseDate('2026-11-24')).toBe('2026-11-24');
    expect(parseNseDate('2026-11-24T10:00:00Z')).toBe('2026-11-24');
  });

  it('returns null for anything unparseable', () => {
    expect(parseNseDate('yesterday')).toBeNull();
    expect(parseNseDate('24-Xxx-2026')).toBeNull();
    expect(parseNseDate(20261124)).toBeNull();
    expect(parseNseDate(null)).toBeNull();
  });

  it('rejects impossible dates and accepts any month case (B32)', () => {
    expect(parseNseDate('32-Nov-2026')).toBeNull();
    expect(parseNseDate('31-Apr-2026')).toBeNull();
    expect(parseNseDate('29-Feb-2026')).toBeNull();
    expect(parseNseDate('29-Feb-2024')).toBe('2024-02-29');
    expect(parseNseDate('2026-02-30')).toBeNull();
    expect(parseNseDate('2026-13-01')).toBeNull();
    expect(parseNseDate('2026-00-10')).toBeNull();
    expect(parseNseDate('24-nov-2026')).toBe('2026-11-24');
    expect(parseNseDate('24-NOV-2026')).toBe('2026-11-24');
  });
});

describe('NSE announcement parsing', () => {
  const payload = [
    {
      symbol: 'HDFCBANK',
      desc: 'HDFC Bank Limited has informed the Exchange about a board meeting.',
      date: '24-Nov-2026',
      attachmentFile: 'https://www.nseindia.com/corporate/board-meeting.pdf',
    },
    {
      symbol: 'HDFCBANK',
      desc: 'Outcome of the board meeting.',
      date: '2026-11-23',
      attachmentFile: '/corporate/outcome.pdf',
    },
    {
      symbol: 'HDFCBANK',
      desc: 'Press release with no attachment and no date.',
    },
    { symbol: 'HDFCBANK', date: '24-Nov-2026' },
    'not-an-object',
  ];

  it('parses valid rows and drops rows without a title', () => {
    const entries = parseNseAnnouncements(payload, 'HDFCBANK');
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      title:
        'HDFC Bank Limited has informed the Exchange about a board meeting.',
      date: '2026-11-24',
      source: 'NSE',
      url: 'https://www.nseindia.com/corporate/board-meeting.pdf',
      documentType: 'announcement',
    });
    expect(entries[1].url).toBe(
      'https://www.nseindia.com/corporate/outcome.pdf',
    );
    expect(entries[2]).toMatchObject({
      date: null,
      url: 'https://www.nseindia.com/get-quotes/equity?symbol=HDFCBANK',
    });
  });

  it('accepts a { data: [...] } wrapper and rejects other shapes', () => {
    expect(parseNseAnnouncements({ data: payload }, 'HDFCBANK')).toHaveLength(
      3,
    );
    expect(parseNseAnnouncements({ rows: payload }, 'HDFCBANK')).toEqual([]);
    expect(parseNseAnnouncements(null, 'HDFCBANK')).toEqual([]);
    expect(parseNseAnnouncements('nope', 'HDFCBANK')).toEqual([]);
  });
});

describe('BSE date parsing', () => {
  it('parses DD Mon YYYY with an optional time suffix', () => {
    expect(parseBseDate('24 Nov 2026')).toBe('2026-11-24');
    expect(parseBseDate('24 Nov 2026 04:30:00 PM')).toBe('2026-11-24');
    expect(parseBseDate('2026-11-24')).toBe('2026-11-24');
    expect(parseBseDate('garbage')).toBeNull();
  });

  it('rejects impossible dates and accepts any month case (B32)', () => {
    expect(parseBseDate('32 Nov 2026')).toBeNull();
    expect(parseBseDate('31 Apr 2026')).toBeNull();
    expect(parseBseDate('29 Feb 2026')).toBeNull();
    expect(parseBseDate('29 Feb 2024')).toBe('2024-02-29');
    expect(parseBseDate('2026-02-30')).toBeNull();
    expect(parseBseDate('2026-13-01')).toBeNull();
    expect(parseBseDate('24 nov 2026')).toBe('2026-11-24');
    expect(parseBseDate('24 NOV 2026')).toBe('2026-11-24');
  });
});

describe('BSE announcement parsing', () => {
  const payload = {
    Table: [
      {
        SCRIP_CD: 500180,
        ANNOUNCEMENT: 'Board meeting intimation.',
        ANNOUNCEMENT_DT: '24 Nov 2026',
        ATTACHMENT_URL:
          'https://www.bseindia.com/xml-data/corpfiling/AttachHis/board.pdf',
      },
      {
        SCRIP_CD: 500180,
        NEWSSUB: 'Outcome of board meeting.',
        DT_TM: '23 Nov 2026 05:00 PM',
        ATTACHMENTNAME: 'outcome.pdf',
      },
      { SCRIP_CD: 500180, ANNOUNCEMENT_DT: '24 Nov 2026' },
    ],
  };
  const fallback =
    'https://www.bseindia.com/stock-share-price/hdfc-bank-ltd/hdfcbank/500180/';

  it('parses valid rows across field-name variants', () => {
    const entries = parseBseAnnouncements(payload, fallback);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      title: 'Board meeting intimation.',
      date: '2026-11-24',
      source: 'BSE',
      url: 'https://www.bseindia.com/xml-data/corpfiling/AttachHis/board.pdf',
      documentType: 'announcement',
    });
    expect(entries[1]).toMatchObject({
      title: 'Outcome of board meeting.',
      date: '2026-11-23',
      source: 'BSE',
      url: 'https://www.bseindia.com/xml-data/corpfiling/AttachHis/outcome.pdf',
    });
  });

  it('falls back to the stock page when there is no attachment', () => {
    const entries = parseBseAnnouncements(
      { Table: [{ ANNOUNCEMENT: 'No attachment here.' }] },
      fallback,
    );
    expect(entries[0].url).toBe(fallback);
    expect(entries[0].date).toBeNull();
  });

  it('returns an empty list when the shape is not a Table', () => {
    expect(parseBseAnnouncements({}, fallback)).toEqual([]);
    expect(parseBseAnnouncements({ Table: 'nope' }, fallback)).toEqual([]);
    expect(parseBseAnnouncements(null, fallback)).toEqual([]);
  });
});

describe('announcement merging', () => {
  const entry = (
    overrides: Partial<FilingEntry> & { title: string },
  ): FilingEntry => ({
    date: null,
    source: 'NSE',
    url: '',
    documentType: 'announcement',
    ...overrides,
  });

  it('merges newest first, deduplicates by URL, undated last', () => {
    const merged = mergeAnnouncements(
      [
        entry({
          title: 'Old NSE',
          date: '2026-11-20',
          url: 'https://nse/a.pdf',
        }),
        entry({ title: 'Undated', url: 'https://nse/b.pdf' }),
      ],
      [
        entry({
          title: 'New BSE',
          date: '2026-11-24',
          source: 'BSE',
          url: 'https://bse/c.pdf',
        }),
        entry({
          title: 'Old NSE duplicate',
          date: '2026-11-20',
          source: 'BSE',
          url: 'https://nse/a.pdf/',
        }),
      ],
    );
    expect(merged.map((item) => item.title)).toEqual([
      'New BSE',
      'Old NSE',
      'Undated',
    ]);
  });

  it('caps the merged list at 25', () => {
    const feed = Array.from({ length: 30 }, (_, i) =>
      entry({ title: `Item ${i}`, url: `https://nse/${i}.pdf` }),
    );
    expect(mergeAnnouncements(feed)).toHaveLength(25);
  });

  it('keeps several attachment-less rows that share the fallback page URL (B18)', () => {
    const merged = mergeAnnouncements([
      entry({
        title: 'Outcome one',
        date: '2026-11-24',
        url: 'https://www.nseindia.com/get-quotes/equity?symbol=HDFCBANK',
      }),
      entry({
        title: 'Outcome two',
        date: '2026-11-23',
        url: 'https://www.nseindia.com/get-quotes/equity?symbol=HDFCBANK',
      }),
      entry({
        title: 'Outcome three',
        date: '2026-11-22',
        source: 'BSE',
        url: 'https://www.bseindia.com/stock-share-price/hdfc-bank-ltd/hdfcbank/500180/',
      }),
    ]);
    expect(merged.map((item) => item.title)).toEqual([
      'Outcome one',
      'Outcome two',
      'Outcome three',
    ]);
  });

  it('still collapses an exact title+date duplicate on the fallback URL (B18)', () => {
    const merged = mergeAnnouncements(
      [
        entry({
          title: 'Outcome',
          date: '2026-11-24',
          url: 'https://www.nseindia.com/get-quotes/equity?symbol=HDFCBANK',
        }),
      ],
      [
        entry({
          title: 'Outcome',
          date: '2026-11-24',
          source: 'BSE',
          url: 'https://www.bseindia.com/stock-share-price/hdfc-bank-ltd/hdfcbank/500180/',
        }),
      ],
    );
    expect(merged).toHaveLength(1);
  });

  it('keeps multi-row no-attachment parses end to end (B18)', () => {
    const parsed = parseNseAnnouncements(
      [
        { desc: 'Outcome one.', date: '24-Nov-2026' },
        { desc: 'Outcome two.', date: '23-Nov-2026' },
        { desc: 'Outcome three.', date: '22-Nov-2026' },
      ],
      'HDFCBANK',
    );
    expect(parsed).toHaveLength(3);
    expect(mergeAnnouncements(parsed)).toHaveLength(3);
  });
});

describe('NseClient fail-open behaviour', () => {
  const homeResponse = () =>
    new Response('<html></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  const apiResponse = (body: unknown, status = 200) =>
    Response.json(body, { status });

  it('fetches the session first, then the API, and parses entries', async () => {
    const seen: string[] = [];
    const fetchFn = jest.fn(async (url: string) => {
      seen.push(url);
      if (url.includes('/api/corporate-announcements')) {
        return apiResponse([
          {
            desc: 'Board meeting.',
            date: '24-Nov-2026',
            attachmentFile: 'https://www.nseindia.com/x.pdf',
          },
        ]);
      }
      return homeResponse();
    });
    const client = new NseClient(fetchFn as unknown as typeof fetch);
    const result = await client.fetchAnnouncements('HDFCBANK');
    expect(result.available).toBe(true);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].title).toBe('Board meeting.');
    expect(seen[0]).toBe('https://www.nseindia.com/');
    expect(seen[1]).toContain('symbol=HDFCBANK');
  });

  it('returns unavailable on a 403 instead of throwing', async () => {
    const fetchFn = jest.fn(async (url: string) =>
      url.includes('/api/')
        ? new Response('Access Denied', { status: 403 })
        : homeResponse(),
    );
    const client = new NseClient(fetchFn as unknown as typeof fetch);
    await expect(client.fetchAnnouncements('HDFCBANK')).resolves.toEqual({
      available: false,
      entries: [],
      fetchedAt: expect.any(String),
    });
  });

  it('returns unavailable when the network throws', async () => {
    const fetchFn = jest.fn(async () => {
      throw new Error('network down');
    });
    const client = new NseClient(fetchFn as unknown as typeof fetch);
    await expect(client.fetchAnnouncements('HDFCBANK')).resolves.toEqual({
      available: false,
      entries: [],
      fetchedAt: expect.any(String),
    });
  });

  it('caches a result for ten minutes', async () => {
    const fetchFn = jest.fn(async (url: string) =>
      url.includes('/api/') ? apiResponse([]) : homeResponse(),
    );
    const client = new NseClient(fetchFn as unknown as typeof fetch);
    await client.fetchAnnouncements('HDFCBANK');
    await client.fetchAnnouncements('HDFCBANK');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('caches a failure only briefly, then refetches (B23)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-26T00:00:00Z'));
    try {
      const fetchFn = jest.fn(async (url: string) =>
        url.includes('/api/')
          ? new Response('Denied', { status: 403 })
          : homeResponse(),
      );
      const client = new NseClient(fetchFn as unknown as typeof fetch);
      await client.fetchAnnouncements('HDFCBANK');
      await client.fetchAnnouncements('HDFCBANK');
      expect(fetchFn).toHaveBeenCalledTimes(2);
      jest.setSystemTime(new Date('2026-11-26T00:01:01Z'));
      await client.fetchAnnouncements('HDFCBANK');
      expect(fetchFn).toHaveBeenCalledTimes(4);
    } finally {
      jest.useRealTimers();
    }
  });

  it('caches an empty successful result only briefly (B23)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-26T00:00:00Z'));
    try {
      const fetchFn = jest.fn(async (url: string) =>
        url.includes('/api/') ? apiResponse([]) : homeResponse(),
      );
      const client = new NseClient(fetchFn as unknown as typeof fetch);
      await client.fetchAnnouncements('HDFCBANK');
      jest.setSystemTime(new Date('2026-11-26T00:00:59Z'));
      await client.fetchAnnouncements('HDFCBANK');
      expect(fetchFn).toHaveBeenCalledTimes(2);
      jest.setSystemTime(new Date('2026-11-26T00:01:01Z'));
      await client.fetchAnnouncements('HDFCBANK');
      expect(fetchFn).toHaveBeenCalledTimes(4);
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps a successful non-empty result for ten minutes and reports its original fetch time (B23, B27)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-26T00:00:00Z'));
    try {
      const fetchFn = jest.fn(async (url: string) => {
        if (url.includes('/api/corporate-announcements')) {
          return apiResponse([
            {
              desc: 'Board meeting.',
              date: '24-Nov-2026',
              attachmentFile: 'https://www.nseindia.com/x.pdf',
            },
          ]);
        }
        return homeResponse();
      });
      const client = new NseClient(fetchFn as unknown as typeof fetch);
      const first = await client.fetchAnnouncements('HDFCBANK');
      expect(first.fetchedAt).toBe('2026-11-26T00:00:00.000Z');
      jest.setSystemTime(new Date('2026-11-26T00:09:00Z'));
      const second = await client.fetchAnnouncements('HDFCBANK');
      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(second.fetchedAt).toBe(first.fetchedAt);
      jest.setSystemTime(new Date('2026-11-26T00:10:01Z'));
      const third = await client.fetchAnnouncements('HDFCBANK');
      expect(fetchFn).toHaveBeenCalledTimes(4);
      expect(third.fetchedAt).toBe('2026-11-26T00:10:01.000Z');
    } finally {
      jest.useRealTimers();
    }
  });

  it('evicts the oldest entry past 200 cached symbols (B23)', async () => {
    const fetchFn = jest.fn(async (url: string) =>
      url.includes('/api/') ? apiResponse([]) : homeResponse(),
    );
    const client = new NseClient(fetchFn as unknown as typeof fetch);
    for (let i = 0; i < 201; i++) {
      await client.fetchAnnouncements(`SYM${String(i).padStart(3, '0')}`);
    }
    const callsForFirst = () =>
      fetchFn.mock.calls.filter((call) =>
        String(call[0]).includes('symbol=SYM000'),
      ).length;
    expect(callsForFirst()).toBe(1);
    await client.fetchAnnouncements('SYM000');
    expect(callsForFirst()).toBe(2);
  });
});

describe('BseClient fail-open behaviour', () => {
  it('fetches announcements for the scrip code and parses the Table', async () => {
    const seen: string[] = [];
    const fetchFn = jest.fn(async (url: string) => {
      seen.push(url);
      return Response.json({
        Table: [
          {
            ANNOUNCEMENT: 'Results declared.',
            ANNOUNCEMENT_DT: '24 Nov 2026',
          },
        ],
      });
    });
    const client = new BseClient(fetchFn as unknown as typeof fetch);
    const result = await client.fetchAnnouncements(
      '500180',
      'https://www.bseindia.com/stock-share-price/hdfc-bank-ltd/hdfcbank/500180/',
    );
    expect(result.available).toBe(true);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].title).toBe('Results declared.');
    expect(seen[0]).toContain('strScrip=500180');
  });

  it('returns unavailable on a 403 instead of throwing', async () => {
    const fetchFn = jest.fn(
      async () => new Response('Denied', { status: 403 }),
    );
    const client = new BseClient(fetchFn as unknown as typeof fetch);
    await expect(
      client.fetchAnnouncements('500180', 'https://example.com'),
    ).resolves.toEqual({
      available: false,
      entries: [],
      fetchedAt: expect.any(String),
    });
  });

  it('pages through results until a page adds nothing new (B31)', async () => {
    const fetchFn = jest.fn(async (url: string) => {
      const page = new URL(url).searchParams.get('pageno');
      const rows =
        page === '1'
          ? [
              {
                ANNOUNCEMENT: 'First.',
                ANNOUNCEMENT_DT: '24 Nov 2026',
              },
              {
                ANNOUNCEMENT: 'Second.',
                ANNOUNCEMENT_DT: '23 Nov 2026',
              },
            ]
          : page === '2'
            ? [{ ANNOUNCEMENT: 'Third.', ANNOUNCEMENT_DT: '22 Nov 2026' }]
            : [];
      return Response.json({ Table: rows });
    });
    const client = new BseClient(fetchFn as unknown as typeof fetch);
    const result = await client.fetchAnnouncements(
      '500180',
      'https://www.bseindia.com/stock-share-price/hdfc-bank-ltd/hdfcbank/500180/',
    );
    expect(result.available).toBe(true);
    expect(result.entries.map((entry) => entry.title)).toEqual([
      'First.',
      'Second.',
      'Third.',
    ]);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(new URL(fetchFn.mock.calls[1][0]).searchParams.get('pageno')).toBe(
      '2',
    );
  });

  it('stops paging when a page repeats rows already seen (B31)', async () => {
    const fetchFn = jest.fn(async () =>
      Response.json({
        Table: [{ ANNOUNCEMENT: 'Same.', ANNOUNCEMENT_DT: '24 Nov 2026' }],
      }),
    );
    const client = new BseClient(fetchFn as unknown as typeof fetch);
    const result = await client.fetchAnnouncements(
      '500180',
      'https://example.com',
    );
    expect(result.entries).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('caps paging at five pages even when every page has new rows (B31)', async () => {
    let page = 0;
    const fetchFn = jest.fn(async () => {
      page++;
      return Response.json({
        Table: [
          {
            ANNOUNCEMENT: `Row ${page}.`,
            ANNOUNCEMENT_DT: '24 Nov 2026',
          },
        ],
      });
    });
    const client = new BseClient(fetchFn as unknown as typeof fetch);
    const result = await client.fetchAnnouncements(
      '500180',
      'https://example.com',
    );
    expect(result.entries).toHaveLength(5);
    expect(fetchFn).toHaveBeenCalledTimes(5);
  });

  it('caches a failure only briefly, then refetches (B23)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-26T00:00:00Z'));
    try {
      const fetchFn = jest.fn(
        async () => new Response('Denied', { status: 403 }),
      );
      const client = new BseClient(fetchFn as unknown as typeof fetch);
      await client.fetchAnnouncements('500180', 'https://example.com');
      await client.fetchAnnouncements('500180', 'https://example.com');
      expect(fetchFn).toHaveBeenCalledTimes(1);
      jest.setSystemTime(new Date('2026-11-26T00:01:01Z'));
      await client.fetchAnnouncements('500180', 'https://example.com');
      expect(fetchFn).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('evicts the oldest entry past 200 cached scrip codes (B23)', async () => {
    const fetchFn = jest.fn(async (_url: string) =>
      Response.json({ Table: [] }),
    );
    const client = new BseClient(fetchFn as unknown as typeof fetch);
    for (let i = 0; i < 201; i++) {
      await client.fetchAnnouncements(
        String(500000 + i),
        'https://example.com',
      );
    }
    const callsForFirst = () =>
      fetchFn.mock.calls.filter((call) =>
        String(call[0]).includes('strScrip=500000'),
      ).length;
    expect(callsForFirst()).toBe(1);
    await client.fetchAnnouncements('500000', 'https://example.com');
    expect(callsForFirst()).toBe(2);
  });
});

describe('FilingsService', () => {
  const nseEntry: FilingEntry = {
    title: 'NSE announcement.',
    date: '2026-11-24',
    source: 'NSE',
    url: 'https://www.nseindia.com/a.pdf',
    documentType: 'announcement',
  };
  const bseEntry: FilingEntry = {
    title: 'BSE announcement.',
    date: '2026-11-23',
    source: 'BSE',
    url: 'https://www.bseindia.com/b.pdf',
    documentType: 'announcement',
  };
  const mockClients = () => ({
    nse: { fetchAnnouncements: jest.fn() },
    bse: { fetchAnnouncements: jest.fn() },
  });

  it('serves live announcements for a registered company', async () => {
    const { nse, bse } = mockClients();
    nse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [nseEntry],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    bse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [bseEntry],
      fetchedAt: '2026-11-25T10:05:00.000Z',
    });
    const service = new FilingsService(
      nse as unknown as NseClient,
      bse as unknown as BseClient,
    );
    const result = await service.getFilings('hdfcbank.ns');
    expect(result.symbol).toBe('HDFCBANK.NS');
    expect(result.nseSymbol).toBe('HDFCBANK');
    expect(result.company).toEqual({
      name: 'HDFC Bank Ltd',
      bseScripCode: '500180',
    });
    expect(result.categories.announcements.status).toBe('live');
    expect(result.categories.announcements.entries).toHaveLength(2);
    expect(result.categories['annual-reports'].status).toBe('links-only');
    expect(result.categories['annual-reports'].links[0].source).toBe(
      'Company IR',
    );
    expect(result.categories.ratings.links).toHaveLength(3);
    expect(nse.fetchAnnouncements).toHaveBeenCalledWith('HDFCBANK');
    expect(bse.fetchAnnouncements).toHaveBeenCalledWith(
      '500180',
      expect.stringContaining('500180'),
    );
  });

  it('reports asOf as the newest feed fetch time, not now (B27)', async () => {
    const { nse, bse } = mockClients();
    nse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [nseEntry],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    bse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [bseEntry],
      fetchedAt: '2026-11-25T10:05:00.000Z',
    });
    const service = new FilingsService(
      nse as unknown as NseClient,
      bse as unknown as BseClient,
    );
    const result = await service.getFilings('HDFCBANK');
    expect(result.asOf).toBe('2026-11-25T10:05:00.000Z');
  });

  it('keeps a stale cached asOf instead of refreshing it to now (B27)', async () => {
    const { nse, bse } = mockClients();
    nse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [nseEntry],
      fetchedAt: '2026-11-25T09:00:00.000Z',
    });
    bse.fetchAnnouncements.mockResolvedValue({
      available: false,
      entries: [],
      fetchedAt: '2026-11-25T09:01:00.000Z',
    });
    const service = new FilingsService(
      nse as unknown as NseClient,
      bse as unknown as BseClient,
    );
    const result = await service.getFilings('HDFCBANK');
    expect(result.asOf).toBe('2026-11-25T09:01:00.000Z');
    expect(new Date(result.asOf).getTime()).toBeLessThan(Date.now());
  });

  it('degrades to unavailable when both feeds are blocked, links intact', async () => {
    const { nse, bse } = mockClients();
    nse.fetchAnnouncements.mockResolvedValue({
      available: false,
      entries: [],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    bse.fetchAnnouncements.mockResolvedValue({
      available: false,
      entries: [],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    const service = new FilingsService(
      nse as unknown as NseClient,
      bse as unknown as BseClient,
    );
    const result = await service.getFilings('HDFCBANK');
    expect(result.categories.announcements.status).toBe('unavailable');
    expect(result.categories.announcements.entries).toEqual([]);
    expect(result.categories.announcements.links.length).toBeGreaterThan(0);
    expect(
      result.categories.announcements.links.some(
        (link) => link.source === 'BSE',
      ),
    ).toBe(true);
  });

  it('stays live when only one feed answers', async () => {
    const { nse, bse } = mockClients();
    nse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [nseEntry],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    bse.fetchAnnouncements.mockResolvedValue({
      available: false,
      entries: [],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    const service = new FilingsService(
      nse as unknown as NseClient,
      bse as unknown as BseClient,
    );
    const result = await service.getFilings('HDFCBANK');
    expect(result.categories.announcements.status).toBe('live');
    expect(result.categories.announcements.entries).toHaveLength(1);
  });

  it('serves an unknown symbol with Yahoo-style data only: NSE feed, no BSE call', async () => {
    const { nse, bse } = mockClients();
    nse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    const service = new FilingsService(
      nse as unknown as NseClient,
      bse as unknown as BseClient,
    );
    const result = await service.getFilings('UNKNOWNCO.NS');
    expect(result.company).toBeNull();
    expect(result.categories.announcements.status).toBe('live');
    expect(result.categories.announcements.entries).toEqual([]);
    expect(bse.fetchAnnouncements).not.toHaveBeenCalled();
    expect(nse.fetchAnnouncements).toHaveBeenCalledWith('UNKNOWNCO');
    expect(
      result.categories['annual-reports'].links.some(
        (link) => link.source === 'Company IR',
      ),
    ).toBe(false);
  });

  it('resolves a .BO symbol through its scrip code', async () => {
    const { nse, bse } = mockClients();
    nse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    bse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    const service = new FilingsService(
      nse as unknown as NseClient,
      bse as unknown as BseClient,
    );
    const result = await service.getFilings('500180.BO');
    expect(result.company).toEqual({
      name: 'HDFC Bank Ltd',
      bseScripCode: '500180',
    });
    expect(nse.fetchAnnouncements).toHaveBeenCalledWith('HDFCBANK');
  });

  it('resolves a .BO symbol by company name, not only by scrip code (B24)', async () => {
    const { nse, bse } = mockClients();
    nse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    bse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    const service = new FilingsService(
      nse as unknown as NseClient,
      bse as unknown as BseClient,
    );
    const result = await service.getFilings('RELIANCE.BO');
    expect(result.company).toEqual({
      name: 'Reliance Industries Ltd',
      bseScripCode: '500325',
    });
    expect(result.nseSymbol).toBe('RELIANCE');
    expect(nse.fetchAnnouncements).toHaveBeenCalledWith('RELIANCE');
    expect(bse.fetchAnnouncements).toHaveBeenCalledWith(
      '500325',
      expect.stringContaining('500325'),
    );
  });

  it('resolves a bare 6-digit scrip code (B24)', async () => {
    const { nse, bse } = mockClients();
    nse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    bse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [],
      fetchedAt: '2026-11-25T10:00:00.000Z',
    });
    const service = new FilingsService(
      nse as unknown as NseClient,
      bse as unknown as BseClient,
    );
    const result = await service.getFilings('500180');
    expect(result.symbol).toBe('500180');
    expect(result.company).toEqual({
      name: 'HDFC Bank Ltd',
      bseScripCode: '500180',
    });
    expect(result.nseSymbol).toBe('HDFCBANK');
    expect(nse.fetchAnnouncements).toHaveBeenCalledWith('HDFCBANK');
    expect(bse.fetchAnnouncements).toHaveBeenCalledWith(
      '500180',
      expect.stringContaining('500180'),
    );
  });

  it('treats an index as links-only and never calls the feeds', async () => {
    const { nse, bse } = mockClients();
    const service = new FilingsService(
      nse as unknown as NseClient,
      bse as unknown as BseClient,
    );
    const result = await service.getFilings('^NSEI');
    expect(result.categories.announcements.status).toBe('links-only');
    expect(nse.fetchAnnouncements).not.toHaveBeenCalled();
    expect(bse.fetchAnnouncements).not.toHaveBeenCalled();
  });

  it('rejects an invalid symbol with 400', async () => {
    const { nse, bse } = mockClients();
    const service = new FilingsService(
      nse as unknown as NseClient,
      bse as unknown as BseClient,
    );
    await expect(service.getFilings('BAD SYMBOL')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
