import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SessionGuard } from '../auth/session.guard';
import { BseClient } from './bse.client';
import { FilingsController } from './filings.controller';
import { FilingsService } from './filings.service';
import { NseClient } from './nse.client';

describe('filings endpoint', () => {
  let app: INestApplication;
  const originalFetch = global.fetch;
  const nse = { fetchAnnouncements: jest.fn() };
  const bse = { fetchAnnouncements: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FilingsController],
      providers: [
        FilingsService,
        SessionGuard,
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:3000' },
        },
        { provide: NseClient, useValue: nse },
        { provide: BseClient, useValue: bse },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    global.fetch = originalFetch;
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    nse.fetchAnnouncements.mockResolvedValue({ available: false, entries: [] });
    bse.fetchAnnouncements.mockResolvedValue({ available: false, entries: [] });
    global.fetch = jest.fn(async () =>
      Response.json({
        user: { id: 'owner' },
        session: { expiresAt: new Date(Date.now() + 60000).toISOString() },
      }),
    );
  });

  const session = (req: request.Test) =>
    req.set('Cookie', 'session=test').set('Origin', 'http://localhost:3000');

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/market/filings/HDFCBANK')
      .expect(401);
    expect(nse.fetchAnnouncements).not.toHaveBeenCalled();
  });

  it('serves live announcements with the company resolved', async () => {
    nse.fetchAnnouncements.mockResolvedValue({
      available: true,
      entries: [
        {
          title: 'Board meeting intimation.',
          date: '2026-11-24',
          source: 'NSE',
          url: 'https://www.nseindia.com/a.pdf',
          documentType: 'announcement',
        },
      ],
    });
    const result = await session(
      request(app.getHttpServer()).get('/api/market/filings/hdfcbank.ns'),
    ).expect(200);
    expect(result.body).toMatchObject({
      symbol: 'HDFCBANK.NS',
      nseSymbol: 'HDFCBANK',
      company: { name: 'HDFC Bank Ltd', bseScripCode: '500180' },
    });
    expect(typeof result.body.asOf).toBe('string');
    expect(result.body.categories.announcements.status).toBe('live');
    expect(result.body.categories.announcements.entries).toHaveLength(1);
    expect(result.body.categories['annual-reports'].status).toBe('links-only');
    expect(result.body.categories.drhp.links[0].source).toBe('SEBI');
    expect(result.body.categories.ratings.links).toHaveLength(3);
  });

  it('fails open with 200 and unavailable status when both feeds are blocked', async () => {
    const result = await session(
      request(app.getHttpServer()).get('/api/market/filings/HDFCBANK'),
    ).expect(200);
    expect(result.body.categories.announcements).toMatchObject({
      status: 'unavailable',
      entries: [],
    });
    expect(result.body.categories.announcements.links.length).toBeGreaterThan(
      0,
    );
    // The rest of the index still works: links need no feed.
    expect(result.body.categories['annual-reports'].status).toBe('links-only');
    expect(
      result.body.categories['quarterly-results'].links.length,
    ).toBeGreaterThan(0);
  });

  it('serves an unknown symbol without a BSE call', async () => {
    const result = await session(
      request(app.getHttpServer()).get('/api/market/filings/UNKNOWNCO.NS'),
    ).expect(200);
    expect(result.body.company).toBeNull();
    expect(result.body.categories.announcements.status).toBe('unavailable');
    expect(bse.fetchAnnouncements).not.toHaveBeenCalled();
    expect(nse.fetchAnnouncements).toHaveBeenCalledWith('UNKNOWNCO');
  });

  it('rejects invalid symbols with 400', async () => {
    await session(
      request(app.getHttpServer()).get('/api/market/filings/BAD%20SYMBOL'),
    ).expect(400);
    expect(nse.fetchAnnouncements).not.toHaveBeenCalled();
  });
});
