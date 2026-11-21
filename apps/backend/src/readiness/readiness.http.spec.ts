import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SessionGuard } from '../auth/session.guard';
import { MarketService } from '../market/market.service';
import { PortfolioService } from '../market/portfolio.service';
import { ProfileService } from '../profile/profile.service';
import { ReadinessController } from './readiness.controller';
import { ReadinessService } from './readiness.service';

describe('readiness endpoint', () => {
  let app: INestApplication;
  const originalFetch = global.fetch;
  const profileGet = jest.fn();
  const portfolioSummary = jest.fn();
  const marketHistory = jest.fn();

  const profile = {
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
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReadinessController],
      providers: [
        ReadinessService,
        SessionGuard,
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:3000' },
        },
        { provide: ProfileService, useValue: { get: profileGet } },
        {
          provide: PortfolioService,
          useValue: { portfolioSummary },
        },
        { provide: MarketService, useValue: { history: marketHistory } },
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
    profileGet.mockResolvedValue({
      profile,
      goals: [],
      onboarding_completed: true,
    });
    portfolioSummary.mockResolvedValue({
      holdings: [],
      totals: {
        totalValue: 0,
        totalInvested: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
      },
      sectors: [],
      unavailable: [],
      asOf: null,
      stale: false,
    });
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
    await request(app.getHttpServer()).get('/api/readiness').expect(401);
    expect(profileGet).not.toHaveBeenCalled();
  });

  it('returns the deterministic assessment for a profile with no holdings', async () => {
    const result = await session(
      request(app.getHttpServer()).get('/api/readiness'),
    ).expect(200);
    // No holdings: concentration and volatility unavailable, maxScore
    // 70, all three cash-flow factors at full marks → 100.
    expect(result.body.available).toBe(true);
    expect(result.body.score).toBe(100);
    expect(result.body.band).toBe('Ready');
    expect(result.body.maxScore).toBe(70);
    expect(result.body.factors).toHaveLength(5);
    expect(result.body.suggestions).toEqual([]);
  });

  it('returns the honest unavailable shape without a profile', async () => {
    profileGet.mockResolvedValue({
      profile: null,
      goals: [],
      onboarding_completed: false,
    });
    const result = await session(
      request(app.getHttpServer()).get('/api/readiness'),
    ).expect(200);
    expect(result.body.available).toBe(false);
    expect(result.body.missing).toEqual(['financial profile']);
  });
});
