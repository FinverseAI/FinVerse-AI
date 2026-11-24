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
    });
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
    });
    bse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [bseEntry],
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

  it('degrades to unavailable when both feeds are blocked, links intact', async () => {
    const { nse, bse } = mockClients();
    nse.fetchAnnouncements.mockResolvedValue({ available: false, entries: [] });
    bse.fetchAnnouncements.mockResolvedValue({ available: false, entries: [] });
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
    });
    bse.fetchAnnouncements.mockResolvedValue({ available: false, entries: [] });
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
    nse.fetchAnnouncements.mockResolvedValue({ available: true, entries: [] });
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
    nse.fetchAnnouncements.mockResolvedValue({ available: true, entries: [] });
    bse.fetchAnnouncements.mockResolvedValue({ available: true, entries: [] });
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
