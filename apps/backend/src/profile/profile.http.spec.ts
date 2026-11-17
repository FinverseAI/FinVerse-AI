import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SessionGuard } from '../auth/session.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

describe('protected financial profile HTTP endpoints', () => {
  let app: INestApplication;
  const originalFetch = global.fetch;
  const tx = {
    $queryRaw: jest.fn(),
    userFinancialProfile: { findUnique: jest.fn(), upsert: jest.fn() },
    userGoal: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    userGoalContribution: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const payload = {
    employment_type: 'salaried',
    monthly_income: '1000',
    fixed_expenses: '300',
    variable_expenses: '200',
    current_savings: '100',
    monthly_savings_target: '100',
    investment_experience: 'none',
    risk_tolerance: 'low',
    already_investing: false,
    emergency_fund_months: '0',
    goals: [
      {
        name: 'Savings',
        target_amount: '100',
        target_date: '2027-12-31',
        priority: 'low',
      },
    ],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        ProfileService,
        SessionGuard,
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:3000' },
        },
        {
          provide: PrismaService,
          useValue: {
            ...tx,
            $transaction: async (
              callback: (db: typeof tx) => Promise<unknown>,
            ) => callback(tx),
          },
        },
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
    tx.user.findUnique.mockResolvedValue(null);
    tx.userFinancialProfile.findUnique.mockResolvedValue(null);
    tx.userGoal.updateMany.mockResolvedValue({ count: 1 });
    tx.userGoalContribution.findMany.mockResolvedValue([]);
    global.fetch = jest.fn(() =>
      Promise.resolve(
        Response.json({
          user: { id: 'authenticated-owner' },
          session: { expiresAt: new Date(Date.now() + 60000).toISOString() },
        }),
      ),
    );
  });

  it('protects GET, POST, and PUT with the session guard', async () => {
    await request(app.getHttpServer()).get('/api/profile').expect(401);
    await request(app.getHttpServer())
      .post('/api/onboarding')
      .send(payload)
      .expect(401);
    await request(app.getHttpServer())
      .put('/api/profile')
      .send(payload)
      .expect(401);
    expect(tx.user.findUnique).not.toHaveBeenCalled();
  });

  it('ignores a query-string user ID and returns the authenticated user state without caching', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/profile?user_id=someone-else')
      .set('Cookie', 'session=signed')
      .expect(200);
    expect(response.body).toEqual({
      profile: null,
      goals: [],
      onboarding_completed: false,
    });
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(tx.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'authenticated-owner' } }),
    );
  });

  it('rejects a body user ID before writing anything', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/onboarding')
      .set('Cookie', 'session=signed')
      .set('Origin', 'http://localhost:3000')
      .send({ ...payload, user_id: 'someone-else' })
      .expect(400);
    expect(response.body.errors.user_id).toBeDefined();
    expect(tx.userFinancialProfile.upsert).not.toHaveBeenCalled();
  });

  it('returns 201 on onboarding and scopes every write to the authenticated user', async () => {
    await request(app.getHttpServer())
      .post('/api/onboarding')
      .set('Cookie', 'session=signed')
      .set('Origin', 'http://localhost:3000')
      .send(payload)
      .expect(201);
    expect(tx.userFinancialProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 'authenticated-owner' } }),
    );
    expect(tx.userGoal.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 'authenticated-owner' },
    });
  });

  it('keeps goal identities across profile updates', async () => {
    tx.userFinancialProfile.findUnique.mockResolvedValue({
      onboarding_completed: true,
    });
    await request(app.getHttpServer())
      .put('/api/profile')
      .set('Cookie', 'session=signed')
      .set('Origin', 'http://localhost:3000')
      .send({
        ...payload,
        goals: [
          {
            id: 'goal-1',
            name: 'Savings',
            target_amount: '100',
            target_date: '2027-12-31',
            priority: 'low',
          },
          {
            name: 'Holiday',
            target_amount: '50',
            target_date: '2027-06-30',
            priority: 'medium',
          },
        ],
      })
      .expect(200);
    expect(tx.userGoal.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 'authenticated-owner', id: { notIn: ['goal-1'] } },
    });
    expect(tx.userGoal.updateMany).toHaveBeenCalledWith({
      where: { id: 'goal-1', user_id: 'authenticated-owner' },
      data: {
        name: 'Savings',
        target_amount: expect.anything(),
        target_date: new Date('2027-12-31T00:00:00Z'),
        priority: 'low',
      },
    });
    expect(tx.userGoal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Holiday',
          user_id: 'authenticated-owner',
        }),
      }),
    );
  });

  it('returns 409 for repeated onboarding and 200 for a subsequent update', async () => {
    tx.userFinancialProfile.findUnique.mockResolvedValue({
      onboarding_completed: true,
    });
    await request(app.getHttpServer())
      .post('/api/onboarding')
      .set('Cookie', 'session=signed')
      .set('Origin', 'http://localhost:3000')
      .send(payload)
      .expect(409);
    expect(tx.userFinancialProfile.upsert).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .put('/api/profile')
      .set('Cookie', 'session=signed')
      .set('Origin', 'http://localhost:3000')
      .send(payload)
      .expect(200);
  });

  it('rejects cross-origin writes before database access', async () => {
    await request(app.getHttpServer())
      .post('/api/onboarding')
      .set('Cookie', 'session=signed')
      .set('Origin', 'https://attacker.example')
      .send(payload)
      .expect(403);
    expect(tx.userFinancialProfile.upsert).not.toHaveBeenCalled();
  });
});
