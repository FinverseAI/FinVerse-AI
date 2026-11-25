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
    $queryRaw: jest.fn(),
    userBill: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    userBillPayment: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    userGoal: { findFirst: jest.fn() },
    userGoalContribution: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    userTransaction: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    idempotencyKey: {
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    // Runs the callback against this same mock, so both writes in a
    // service transaction hit the mocked delegates.
    $transaction: jest.fn((fn: (tx: unknown) => unknown): unknown =>
      fn(prisma),
    ),
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
  const storedPayment = {
    id: 'payment-1',
    bill_id: 'bill-1',
    user_id: 'owner',
    amount: '1850.50',
    paid_date: new Date('2026-11-24T00:00:00Z'),
  };
  const storedGoal = {
    id: 'goal-1',
    user_id: 'owner',
    name: 'Emergency fund',
    target_amount: '100000.00',
    target_date: new Date('2027-12-31T00:00:00Z'),
    priority: 'high',
  };
  const storedContribution = {
    id: 'contribution-1',
    goal_id: 'goal-1',
    user_id: 'owner',
    amount: '5000.00',
    date: new Date('2026-11-17T00:00:00Z'),
    note: 'Salary day',
  };
  // The payment rows the mocked findMany serves, filtered by its
  // where clause like a real query would — recordPayment re-reads
  // payments inside the transaction, so a where-blind mock would
  // hand every bill the same payment and trip the overpay check.
  let paymentRows: (typeof storedPayment)[] = [];

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
    // A lookup for generated next occurrences (parent_bill_id) finds
    // none by default; every other bill lookup finds the stored bill.
    prisma.userBill.findMany.mockImplementation(
      (args: { where?: { parent_bill_id?: string } }) =>
        Promise.resolve(args?.where?.parent_bill_id ? [] : [storedBill]),
    );
    prisma.userBill.create.mockResolvedValue(storedBill);
    prisma.userBill.updateMany.mockResolvedValue({ count: 1 });
    prisma.userBill.findFirst.mockResolvedValue(storedBill);
    prisma.userBill.deleteMany.mockResolvedValue({ count: 1 });
    prisma.userBill.count.mockResolvedValue(0);
    prisma.$queryRaw.mockResolvedValue([]);
    paymentRows = [];
    prisma.userBillPayment.findMany.mockImplementation(
      ({ where }: { where?: { bill_id?: string; user_id?: string } }) =>
        Promise.resolve(
          paymentRows.filter(
            (row) =>
              (!where?.bill_id || row.bill_id === where.bill_id) &&
              (!where?.user_id || row.user_id === where.user_id),
          ),
        ),
    );
    prisma.userBillPayment.create.mockResolvedValue(storedPayment);
    prisma.userBillPayment.deleteMany.mockResolvedValue({ count: 1 });
    prisma.userGoal.findFirst.mockResolvedValue(storedGoal);
    prisma.userGoalContribution.findMany.mockResolvedValue([]);
    prisma.userGoalContribution.create.mockResolvedValue(storedContribution);
    prisma.userGoalContribution.deleteMany.mockResolvedValue({ count: 1 });
    prisma.idempotencyKey.findFirst.mockResolvedValue(null);
    prisma.idempotencyKey.create.mockResolvedValue({});
    prisma.idempotencyKey.deleteMany.mockResolvedValue({ count: 0 });
    prisma.userTransaction.findMany.mockResolvedValue([]);
    prisma.userTransaction.updateMany.mockResolvedValue({ count: 1 });
    prisma.userTransaction.findFirst.mockResolvedValue({
      id: 'transaction-1',
      name: 'Groceries',
      amount: '-25.50',
      category: 'Food & Dining',
      date: new Date('2026-11-13T00:00:00Z'),
    });
    prisma.userTransaction.deleteMany.mockResolvedValue({ count: 1 });
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
    await request(app.getHttpServer())
      .post('/api/bills/auto-pay')
      .send({ today: '2026-11-24' })
      .expect(401);
    await request(app.getHttpServer())
      .put('/api/bills/bill-1')
      .send(bill)
      .expect(401);
    await request(app.getHttpServer()).delete('/api/bills/bill-1').expect(401);
    await request(app.getHttpServer())
      .get('/api/bills/bill-1/payments')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/bills/bill-1/payments')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .delete('/api/bills/bill-1/payments/payment-1')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/goals/goal-1/contributions')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/goals/goal-1/contributions')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .delete('/api/goals/goal-1/contributions/contribution-1')
      .expect(401);
    await request(app.getHttpServer()).get('/api/transactions').expect(401);
    await request(app.getHttpServer())
      .post('/api/transactions')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .put('/api/transactions/transaction-1')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .delete('/api/transactions/transaction-1')
      .expect(401);
    expect(prisma.userBill.findMany).not.toHaveBeenCalled();
    expect(prisma.userBill.create).not.toHaveBeenCalled();
    expect(prisma.userBill.updateMany).not.toHaveBeenCalled();
    expect(prisma.userBill.deleteMany).not.toHaveBeenCalled();
    expect(prisma.userBillPayment.create).not.toHaveBeenCalled();
    expect(prisma.userBillPayment.deleteMany).not.toHaveBeenCalled();
    expect(prisma.userGoalContribution.create).not.toHaveBeenCalled();
    expect(prisma.userGoalContribution.deleteMany).not.toHaveBeenCalled();
    expect(prisma.userTransaction.updateMany).not.toHaveBeenCalled();
    expect(prisma.userTransaction.deleteMany).not.toHaveBeenCalled();
  });
  it('rejects cross-origin additions and removals', async () => {
    await request(app.getHttpServer())
      .post('/api/bills')
      .set('Cookie', 'session=test')
      .set('Origin', 'https://other.example')
      .send(bill)
      .expect(403);
    await request(app.getHttpServer())
      .put('/api/bills/bill-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'https://other.example')
      .send(bill)
      .expect(403);
    await request(app.getHttpServer())
      .delete('/api/bills/bill-1')
      .set('Cookie', 'session=test')
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/bills/bill-1/payments')
      .set('Cookie', 'session=test')
      .set('Origin', 'https://other.example')
      .send({ amount: 1850.5, paidDate: '2026-11-24' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/bills/auto-pay')
      .set('Cookie', 'session=test')
      .set('Origin', 'https://other.example')
      .send({ today: '2026-11-24' })
      .expect(403);
    expect(prisma.userBill.updateMany).not.toHaveBeenCalled();
    expect(prisma.userBill.deleteMany).not.toHaveBeenCalled();
    expect(prisma.userBillPayment.create).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post('/api/goals/goal-1/contributions')
      .set('Cookie', 'session=test')
      .set('Origin', 'https://other.example')
      .send({ amount: 5000, date: '2026-11-17' })
      .expect(403);
    expect(prisma.userGoalContribution.create).not.toHaveBeenCalled();
  });
  it('returns all bills in due-date order without trusting a requested user ID', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/bills?user_id=someone-else')
      .set('Cookie', 'session=test')
      .expect(200);
    expect(result.body).toEqual([
      { id: 'bill-1', ...bill, recurrence: null, paidTotal: 0, payments: [] },
    ]);
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(prisma.userBill.findMany).toHaveBeenCalledWith({
      where: { user_id: 'owner' },
      orderBy: [{ due_date: 'asc' }, { created_at: 'asc' }, { id: 'asc' }],
    });
    expect(prisma.userBillPayment.findMany).toHaveBeenCalledWith({
      where: { user_id: 'owner' },
      orderBy: [{ paid_date: 'desc' }, { created_at: 'desc' }, { id: 'desc' }],
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
        recurrence: null,
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
  it('rejects cross-origin transaction updates and removals', async () => {
    await request(app.getHttpServer())
      .put('/api/transactions/transaction-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'https://other.example')
      .send({
        name: 'Groceries',
        amount: -25.5,
        category: 'Food & Dining',
        date: '2026-11-13',
      })
      .expect(403);
    await request(app.getHttpServer())
      .delete('/api/transactions/transaction-1')
      .set('Cookie', 'session=test')
      .expect(403);
    expect(prisma.userTransaction.updateMany).not.toHaveBeenCalled();
    expect(prisma.userTransaction.deleteMany).not.toHaveBeenCalled();
  });
  it('updates only a transaction belonging to the owner', async () => {
    const updated = {
      name: 'Weekly groceries',
      amount: -32.75,
      category: 'Groceries',
      date: '2026-11-14',
    };
    prisma.userTransaction.findFirst.mockResolvedValue({
      ...updated,
      id: 'transaction-1',
      amount: '-32.75',
      date: new Date('2026-11-14T00:00:00Z'),
    });
    const result = await request(app.getHttpServer())
      .put('/api/transactions/transaction-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ ...updated, user_id: 'someone-else' })
      .expect(200);
    expect(result.body).toEqual({ ...updated, id: 'transaction-1' });
    expect(prisma.userTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'transaction-1', user_id: 'owner' },
      data: {
        ...updated,
        amount: '-32.75',
        date: new Date('2026-11-14T00:00:00Z'),
      },
    });
  });
  it('rejects invalid transaction updates before any database write', async () => {
    await request(app.getHttpServer())
      .put('/api/transactions/transaction-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({
        name: 'Groceries',
        amount: -25.5,
        category: 'Not a category',
        date: '2026-11-13',
      })
      .expect(400);
    expect(prisma.userTransaction.updateMany).not.toHaveBeenCalled();
  });
  it('reports missing transactions on update and removal', async () => {
    prisma.userTransaction.updateMany.mockResolvedValue({ count: 0 });
    await request(app.getHttpServer())
      .put('/api/transactions/other-users-transaction')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({
        name: 'Groceries',
        amount: -25.5,
        category: 'Food & Dining',
        date: '2026-11-13',
      })
      .expect(404);
    prisma.userTransaction.deleteMany.mockResolvedValue({ count: 0 });
    await request(app.getHttpServer())
      .delete('/api/transactions/other-users-transaction')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .expect(404);
  });
  it('removes only a transaction belonging to the owner', async () => {
    await request(app.getHttpServer())
      .delete('/api/transactions/transaction-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .expect(200, { deleted: true });
    expect(prisma.userTransaction.deleteMany).toHaveBeenCalledWith({
      where: { id: 'transaction-1', user_id: 'owner' },
    });
  });
  it('updates only a bill belonging to the owner and keeps its payments', async () => {
    const updated = {
      name: 'Rent (revised)',
      amount: 1900,
      dueDate: '2026-11-30',
      autoPay: false,
    };
    prisma.userBill.findFirst.mockResolvedValue({
      ...storedBill,
      ...updated,
      amount: '1900.00',
      due_date: new Date('2026-11-30T00:00:00Z'),
      // `updated` is API-shaped (autoPay); the stored row is DB-shaped, so
      // the re-read mock must carry auto_pay explicitly — otherwise the
      // spread leaves storedBill's auto_pay: true in place and the response
      // reports autoPay: true while the test expects false.
      auto_pay: false,
    });
    paymentRows = [storedPayment];
    const result = await request(app.getHttpServer())
      .put('/api/bills/bill-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ ...updated, user_id: 'someone-else' })
      .expect(200);
    expect(result.body).toEqual({
      id: 'bill-1',
      ...updated,
      recurrence: null,
      paidTotal: 1850.5,
      payments: [{ id: 'payment-1', amount: 1850.5, paidDate: '2026-11-24' }],
    });
    expect(prisma.userBill.updateMany).toHaveBeenCalledWith({
      where: { id: 'bill-1', user_id: 'owner' },
      data: {
        name: 'Rent (revised)',
        amount: '1900.00',
        due_date: new Date('2026-11-30T00:00:00Z'),
        auto_pay: false,
        recurrence: null,
      },
    });
  });
  it('rejects invalid bill updates and reports missing bills', async () => {
    await request(app.getHttpServer())
      .put('/api/bills/bill-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ ...bill, amount: -5 })
      .expect(400);
    expect(prisma.userBill.updateMany).not.toHaveBeenCalled();
    prisma.userBill.updateMany.mockResolvedValue({ count: 0 });
    await request(app.getHttpServer())
      .put('/api/bills/other-users-bill')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send(bill)
      .expect(404);
  });
  it('lists payments only for a bill belonging to the owner', async () => {
    paymentRows = [storedPayment];
    const result = await request(app.getHttpServer())
      .get('/api/bills/bill-1/payments')
      .set('Cookie', 'session=test')
      .expect(200);
    expect(result.body).toEqual([
      { id: 'payment-1', amount: 1850.5, paidDate: '2026-11-24' },
    ]);
    expect(prisma.userBillPayment.findMany).toHaveBeenCalledWith({
      where: { bill_id: 'bill-1', user_id: 'owner' },
      orderBy: [{ paid_date: 'desc' }, { created_at: 'desc' }, { id: 'desc' }],
    });
    prisma.userBill.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/api/bills/other-users-bill/payments')
      .set('Cookie', 'session=test')
      .expect(404);
  });
  it('records a payment only for a bill belonging to the owner', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/bills/bill-1/payments')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ amount: 1850.5, paidDate: '2026-11-24', user_id: 'someone-else' })
      .expect(201);
    expect(result.body).toEqual({
      id: 'payment-1',
      amount: 1850.5,
      paidDate: '2026-11-24',
      nextBill: null,
    });
    expect(prisma.userBillPayment.create).toHaveBeenCalledWith({
      data: {
        amount: '1850.50',
        paid_date: new Date('2026-11-24T00:00:00Z'),
        bill_id: 'bill-1',
        user_id: 'owner',
      },
    });
    // The payment and its matching expense transaction are written
    // together, in one database transaction. The expense carries the
    // payment's id (B37) so deleting the payment can undo it.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.userTransaction.create).toHaveBeenCalledWith({
      data: {
        name: 'Rent',
        amount: '-1850.50',
        category: 'Bills & Utilities',
        date: new Date('2026-11-24T00:00:00Z'),
        user_id: 'owner',
        bill_payment_id: 'payment-1',
      },
    });
  });
  it('generates the next occurrence when a monthly bill is paid', async () => {
    prisma.userBill.findFirst.mockResolvedValue({
      ...storedBill,
      recurrence: 'monthly',
    });
    prisma.userBill.create.mockResolvedValue({
      ...storedBill,
      id: 'bill-next',
      due_date: new Date('2026-12-28T00:00:00Z'),
      recurrence: 'monthly',
    });
    const result = await request(app.getHttpServer())
      .post('/api/bills/bill-1/payments')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ amount: 1850.5, paidDate: '2026-11-24' })
      .expect(201);
    expect(result.body.nextBill).toEqual({
      id: 'bill-next',
      name: 'Rent',
      amount: 1850.5,
      dueDate: '2026-12-28',
      autoPay: true,
      recurrence: 'monthly',
      paidTotal: 0,
      payments: [],
    });
    // Payment, transaction and next occurrence: one transaction.
    // The next occurrence carries the paid bill's id (B37) so
    // deleting the payment can undo it.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.userBillPayment.create).toHaveBeenCalledTimes(1);
    expect(prisma.userTransaction.create).toHaveBeenCalledTimes(1);
    expect(prisma.userBill.create).toHaveBeenCalledWith({
      data: {
        name: 'Rent',
        amount: '1850.50',
        due_date: new Date('2026-12-28T00:00:00Z'),
        auto_pay: true,
        recurrence: 'monthly',
        parent_bill_id: 'bill-1',
        user_id: 'owner',
      },
    });
  });
  it('does not generate a next occurrence for a one-off bill', async () => {
    await request(app.getHttpServer())
      .post('/api/bills/bill-1/payments')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ amount: 1850.5, paidDate: '2026-11-24' })
      .expect(201);
    expect(prisma.userBill.create).not.toHaveBeenCalled();
  });
  it('auto-pay pays due auto-pay bills, skips the rest, and rolls monthly bills forward', async () => {
    const dueMonthly = {
      ...storedBill,
      id: 'bill-monthly',
      name: 'Internet',
      amount: '999.00',
      due_date: new Date('2026-11-20T00:00:00Z'),
      auto_pay: true,
      recurrence: 'monthly',
    };
    const dueOnce = {
      ...storedBill,
      id: 'bill-once',
      name: 'Plumber',
      amount: '500.00',
      due_date: new Date('2026-11-24T00:00:00Z'),
      auto_pay: true,
      recurrence: null,
    };
    const notDue = {
      ...storedBill,
      id: 'bill-future',
      name: 'Rent',
      amount: '1850.50',
      due_date: new Date('2026-12-01T00:00:00Z'),
      auto_pay: true,
      recurrence: null,
    };
    const noAutoPay = {
      ...storedBill,
      id: 'bill-manual',
      name: 'Gym',
      amount: '100.00',
      due_date: new Date('2026-11-10T00:00:00Z'),
      auto_pay: false,
      recurrence: null,
    };
    const alreadyPaid = {
      ...storedBill,
      id: 'bill-paid',
      name: 'Phone',
      amount: '299.00',
      due_date: new Date('2026-11-15T00:00:00Z'),
      auto_pay: true,
      recurrence: null,
    };
    prisma.userBill.findMany.mockResolvedValue([
      dueMonthly,
      dueOnce,
      notDue,
      noAutoPay,
      alreadyPaid,
    ]);
    paymentRows = [
      { ...storedPayment, bill_id: 'bill-paid', amount: '299.00' },
    ];
    prisma.userBill.create.mockResolvedValue({
      ...storedBill,
      id: 'bill-next',
      due_date: new Date('2026-12-20T00:00:00Z'),
    });
    const result = await request(app.getHttpServer())
      .post('/api/bills/auto-pay')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ today: '2026-11-24' })
      .expect(200);
    expect(result.body).toEqual({
      paid: [
        {
          billId: 'bill-monthly',
          name: 'Internet',
          amount: 999,
          paidDate: '2026-11-24',
          nextDueDate: '2026-12-20',
        },
        {
          billId: 'bill-once',
          name: 'Plumber',
          amount: 500,
          paidDate: '2026-11-24',
          nextDueDate: null,
        },
      ],
    });
    // Two payments + two transactions, one next occurrence, one
    // database transaction for the whole run.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.userBillPayment.create).toHaveBeenCalledTimes(2);
    expect(prisma.userBillPayment.create).toHaveBeenCalledWith({
      data: {
        amount: '999.00',
        paid_date: new Date('2026-11-24T00:00:00Z'),
        bill_id: 'bill-monthly',
        user_id: 'owner',
      },
    });
    expect(prisma.userTransaction.create).toHaveBeenCalledTimes(2);
    expect(prisma.userTransaction.create).toHaveBeenCalledWith({
      data: {
        name: 'Internet',
        amount: '-999.00',
        category: 'Bills & Utilities',
        date: new Date('2026-11-24T00:00:00Z'),
        user_id: 'owner',
        bill_payment_id: 'payment-1',
      },
    });
    expect(prisma.userBill.create).toHaveBeenCalledTimes(1);
    expect(prisma.userBill.create).toHaveBeenCalledWith({
      data: {
        name: 'Internet',
        amount: '999.00',
        due_date: new Date('2026-12-20T00:00:00Z'),
        auto_pay: true,
        recurrence: 'monthly',
        parent_bill_id: 'bill-monthly',
        user_id: 'owner',
      },
    });
  });
  it('auto-pay pays only the unpaid remainder of a partially paid bill', async () => {
    prisma.userBill.findMany.mockResolvedValue([
      {
        ...storedBill,
        id: 'bill-partial',
        name: 'Internet',
        amount: '999.00',
        due_date: new Date('2026-11-20T00:00:00Z'),
        auto_pay: true,
        recurrence: null,
      },
    ]);
    paymentRows = [
      { ...storedPayment, bill_id: 'bill-partial', amount: '400.00' },
    ];
    const result = await request(app.getHttpServer())
      .post('/api/bills/auto-pay')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ today: '2026-11-24' })
      .expect(200);
    expect(result.body).toEqual({
      paid: [
        {
          billId: 'bill-partial',
          name: 'Internet',
          amount: 599,
          paidDate: '2026-11-24',
          nextDueDate: null,
        },
      ],
    });
    expect(prisma.userBillPayment.create).toHaveBeenCalledWith({
      data: {
        amount: '599.00',
        paid_date: new Date('2026-11-24T00:00:00Z'),
        bill_id: 'bill-partial',
        user_id: 'owner',
      },
    });
  });
  it('a second auto-pay run pays nothing once the bills are recorded', async () => {
    prisma.userBill.findMany.mockResolvedValue([
      {
        ...storedBill,
        id: 'bill-due',
        name: 'Internet',
        amount: '999.00',
        due_date: new Date('2026-11-20T00:00:00Z'),
        auto_pay: true,
        recurrence: null,
      },
    ]);
    await request(app.getHttpServer())
      .post('/api/bills/auto-pay')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ today: '2026-11-24' })
      .expect(200);
    expect(prisma.userBillPayment.create).toHaveBeenCalledTimes(1);
    // The payment is now recorded: the next run sees it and pays nothing.
    paymentRows = [{ ...storedPayment, bill_id: 'bill-due', amount: '999.00' }];
    const result = await request(app.getHttpServer())
      .post('/api/bills/auto-pay')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ today: '2026-11-24' })
      .expect(200);
    expect(result.body).toEqual({ paid: [] });
    expect(prisma.userBillPayment.create).toHaveBeenCalledTimes(1);
    // Both runs open a transaction: the second one locks, re-reads,
    // and finds nothing due inside it (B34).
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
  it('auto-pay rejects an invalid run date before any database write', async () => {
    await request(app.getHttpServer())
      .post('/api/bills/auto-pay')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ today: '2026-02-30' })
      .expect(400);
    expect(prisma.userBill.findMany).not.toHaveBeenCalled();
    expect(prisma.userBillPayment.create).not.toHaveBeenCalled();
  });
  it('rejects invalid payments and payments for missing bills', async () => {
    await request(app.getHttpServer())
      .post('/api/bills/bill-1/payments')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ amount: 0, paidDate: '2026-11-24' })
      .expect(400);
    expect(prisma.userBillPayment.create).not.toHaveBeenCalled();
    prisma.userBill.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/api/bills/other-users-bill/payments')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ amount: 100, paidDate: '2026-11-24' })
      .expect(404);
    expect(prisma.userBillPayment.create).not.toHaveBeenCalled();
  });
  it('removes only a payment belonging to the owner', async () => {
    await request(app.getHttpServer())
      .delete('/api/bills/bill-1/payments/payment-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .expect(200, { deleted: true });
    expect(prisma.userBillPayment.deleteMany).toHaveBeenCalledWith({
      where: { id: 'payment-1', bill_id: 'bill-1', user_id: 'owner' },
    });
    // B37: deleting the payment also deletes the expense transaction
    // it generated, in the same database transaction.
    expect(prisma.userTransaction.deleteMany).toHaveBeenCalledWith({
      where: { bill_payment_id: 'payment-1', user_id: 'owner' },
    });
    prisma.userBillPayment.deleteMany.mockResolvedValue({ count: 0 });
    await request(app.getHttpServer())
      .delete('/api/bills/bill-1/payments/other-payment')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .expect(404);
  });
  it('rejects a payment larger than the amount still owed (B36)', async () => {
    await request(app.getHttpServer())
      .post('/api/bills/bill-1/payments')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ amount: 2000, paidDate: '2026-11-25' })
      .expect(400);
    expect(prisma.userBillPayment.create).not.toHaveBeenCalled();
    expect(prisma.userTransaction.create).not.toHaveBeenCalled();
    // A payment that exactly covers the remaining balance is fine.
    await request(app.getHttpServer())
      .post('/api/bills/bill-1/payments')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ amount: 1850.5, paidDate: '2026-11-25' })
      .expect(201);
  });
  it('rejects lowering a bill below what is already paid (B36)', async () => {
    paymentRows = [storedPayment];
    await request(app.getHttpServer())
      .put('/api/bills/bill-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ ...bill, amount: 1000 })
      .expect(400);
    expect(prisma.userBill.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a replayed idempotency key with 409 DUPLICATE_REQUEST (B44)', async () => {
    prisma.idempotencyKey.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValue({
        id: 'key-row-1',
        user_id: 'owner',
        key: 'bill-key-1',
        endpoint: 'POST /api/bills',
        created_at: new Date().toISOString(),
      });
    await request(app.getHttpServer())
      .post('/api/bills')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .set('X-Idempotency-Key', 'bill-key-1')
      .send(bill)
      .expect(201);
    expect(prisma.userBill.create).toHaveBeenCalledTimes(1);
    const replay = await request(app.getHttpServer())
      .post('/api/bills')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .set('X-Idempotency-Key', 'bill-key-1')
      .send(bill)
      .expect(409);
    expect(replay.body).toMatchObject({
      message: 'duplicate request',
      code: 'DUPLICATE_REQUEST',
    });
    expect(prisma.userBill.create).toHaveBeenCalledTimes(1);
  });
  it('lists contributions only for a goal belonging to the owner', async () => {
    prisma.userGoalContribution.findMany.mockResolvedValue([
      storedContribution,
    ]);
    const result = await request(app.getHttpServer())
      .get('/api/goals/goal-1/contributions')
      .set('Cookie', 'session=test')
      .expect(200);
    expect(result.body).toEqual([
      {
        id: 'contribution-1',
        amount: 5000,
        date: '2026-11-17',
        note: 'Salary day',
      },
    ]);
    expect(prisma.userGoalContribution.findMany).toHaveBeenCalledWith({
      where: { goal_id: 'goal-1', user_id: 'owner' },
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }, { id: 'desc' }],
    });
    prisma.userGoal.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/api/goals/other-users-goal/contributions')
      .set('Cookie', 'session=test')
      .expect(404);
  });
  it('records a contribution only for a goal belonging to the owner', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/goals/goal-1/contributions')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({
        amount: 5000,
        date: '2026-11-17',
        note: 'Salary day',
        user_id: 'someone-else',
      })
      .expect(201);
    expect(result.body).toEqual({
      id: 'contribution-1',
      amount: 5000,
      date: '2026-11-17',
      note: 'Salary day',
    });
    expect(prisma.userGoalContribution.create).toHaveBeenCalledWith({
      data: {
        amount: '5000.00',
        date: new Date('2026-11-17T00:00:00Z'),
        note: 'Salary day',
        goal_id: 'goal-1',
        user_id: 'owner',
      },
    });
  });
  it('rejects invalid contributions and contributions for missing goals', async () => {
    await request(app.getHttpServer())
      .post('/api/goals/goal-1/contributions')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ amount: 0, date: '2026-11-17' })
      .expect(400);
    expect(prisma.userGoalContribution.create).not.toHaveBeenCalled();
    prisma.userGoal.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/api/goals/other-users-goal/contributions')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .send({ amount: 100, date: '2026-11-17' })
      .expect(404);
    expect(prisma.userGoalContribution.create).not.toHaveBeenCalled();
  });
  it('removes only a contribution belonging to the owner', async () => {
    await request(app.getHttpServer())
      .delete('/api/goals/goal-1/contributions/contribution-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .expect(200, { deleted: true });
    expect(prisma.userGoalContribution.deleteMany).toHaveBeenCalledWith({
      where: { id: 'contribution-1', goal_id: 'goal-1', user_id: 'owner' },
    });
    prisma.userGoalContribution.deleteMany.mockResolvedValue({ count: 0 });
    await request(app.getHttpServer())
      .delete('/api/goals/goal-1/contributions/other-contribution')
      .set('Cookie', 'session=test')
      .set('Origin', 'http://localhost:3000')
      .expect(404);
  });
});
