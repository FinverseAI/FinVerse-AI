import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SessionGuard } from '../auth/session.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

describe('account-scoped dashboard activity', () => {
  let app: INestApplication;
  const originalFetch = global.fetch;
  const prisma = {
    userBill: { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
    userTransaction: { findMany: jest.fn(), create: jest.fn() },
  };
  const bill = {
    name: 'Rent',
    amount: 1850.5,
    dueDate: '2026-11-28',
    autoPay: true,
  };
  const storedBill = {
    id: 'bill-1',
    user_id: 'owner',
    name: 'Rent',
    amount: '1850.50',
    due_date: new Date('2026-11-28T00:00:00Z'),
    auto_pay: true,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        ActivityService,
        SessionGuard,
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:3000' },
        },
        { provide: PrismaService, useValue: prisma },
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
    prisma.userBill.findMany.mockResolvedValue([storedBill]);
    prisma.userBill.create.mockResolvedValue(storedBill);
    prisma.userBill.deleteMany.mockResolvedValue({ count: 1 });
    prisma.userTransaction.findMany.mockResolvedValue([]);
    global.fetch = jest.fn(async () =>
      Response.json({
        user: { id: 'owner' },
        session: { expiresAt: new Date(Date.now() + 60000).toISOString() },
      }),
    );
  });

  it('requires authentication for every activity route', async () => {
    await request(app.getHttpServer()).get('/api/bills').expect(401);
    await request(app.getHttpServer())
      .post('/api/bills')
      .send(bill)
      .expect(401);
    await request(app.getHttpServer()).delete('/api/bills/bill-1').expect(401);
    await request(app.getHttpServer()).get('/api/transactions').expect(401);
    await request(app.getHttpServer())
      .post('/api/transactions')
      .send({})
      .expect(401);
    expect(prisma.userBill.findMany).not.toHaveBeenCalled();
    expect(prisma.userBill.create).not.toHaveBeenCalled();
    expect(prisma.userBill.deleteMany).not.toHaveBeenCalled();
  });
  it('rejects cross-origin additions and removals', async () => {
    await request(app.getHttpServer())
      .post('/api/bills')
      .set('Cookie', 'session=test')
      .set('Origin', 'https://other.example')
      .send(bill)
      .expect(403);
    await request(app.getHttpServer())
      .delete('/api/bills/bill-1')
      .set('Cookie', 'session=test')
      .expect(403);
    expect(prisma.userBill.deleteMany).not.toHaveBeenCalled();
  });
  it('returns all bills in due-date order without trusting a requested user ID', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/bills?user_id=someone-else')
      .set('Cookie', 'session=test')
      .expect(200);
    expect(result.body).toEqual([{ id: 'bill-1', ...bill }]);
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(prisma.userBill.findMany).toHaveBeenCalledWith({
      where: { user_id: 'owner' },
      orderBy: [{ due_date: 'asc' }, { created_at: 'asc' }, { id: 'asc' }],
    });
  });
  it('creates a bill using only the authenticated owner', async () => {
    await request(app.getHttpServer())
      .post('/api/bills')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ ...bill, user_id: 'someone-else', id: 'forged' })
      .expect(201);
    expect(prisma.userBill.create).toHaveBeenCalledWith({
      data: {
        user_id: 'owner',
        name: 'Rent',
        amount: '1850.50',
        due_date: storedBill.due_date,
        auto_pay: true,
      },
    });
  });
  it('rejects invalid records before any database write', async () => {
    await request(app.getHttpServer())
      .post('/api/bills')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ ...bill, dueDate: '2026-02-30' })
      .expect(400);
    expect(prisma.userBill.create).not.toHaveBeenCalled();
  });
  it('removes only a bill belonging to the owner and reports missing records', async () => {
    await request(app.getHttpServer())
      .delete('/api/bills/bill-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .expect(200, { deleted: true });
    expect(prisma.userBill.deleteMany).toHaveBeenCalledWith({
      where: { id: 'bill-1', user_id: 'owner' },
    });
    prisma.userBill.deleteMany.mockResolvedValue({ count: 0 });
    await request(app.getHttpServer())
      .delete('/api/bills/other-users-bill')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .expect(404);
  });
  it('reads and creates transactions under the authenticated account', async () => {
    const transaction = {
      name: 'Groceries',
      amount: -25.5,
      category: 'Food & Dining',
      date: '2026-11-13',
    };
    prisma.userTransaction.create.mockResolvedValue({
      ...transaction,
      id: 'transaction-1',
      date: new Date('2026-11-13T00:00:00Z'),
    });
    const result = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ ...transaction, user_id: 'someone-else' })
      .expect(201);
    expect(result.body).toEqual({ ...transaction, id: 'transaction-1' });
    expect(prisma.userTransaction.create).toHaveBeenCalledWith({
      data: {
        ...transaction,
        amount: '-25.50',
        date: new Date('2026-11-13T00:00:00Z'),
        user_id: 'owner',
      },
    });
    await request(app.getHttpServer())
      .get('/api/transactions')
      .set('Cookie', 'session=test')
      .expect(200, []);
    expect(prisma.userTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 'owner' } }),
    );
  });
});
