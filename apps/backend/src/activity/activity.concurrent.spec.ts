import { ActivityService } from './activity.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * B34 — concurrent auto-pay, B37 — undoing a payment, B44 — next
 * occurrence dedup, exercised against an in-memory fake Prisma.
 *
 * Why a fake, and why it proves the fix: activity.http.spec.ts mocks
 * Prisma with jest.fn()s that return canned rows — no store, no
 * transaction semantics — so it cannot distinguish a read done
 * outside the transaction from one done inside it, and there is no
 * live Postgres in this environment (no DATABASE_URL, no server).
 * This fake models the two Postgres behaviours the fix relies on:
 *
 * 1. Transactions serialize: $transaction bodies run one at a time,
 *    in call order — the way SELECT ... FOR UPDATE on the user's
 *    bills serializes concurrent auto-pay runs in Postgres.
 * 2. Reads outside a transaction see the last committed state, so a
 *    snapshot taken before the lock is stale if another run commits
 *    first — exactly the old code's bug.
 *
 * With those two rules, the OLD code (reads outside the transaction,
 * then writes inside it) double-pays under Promise.all, and the
 * FIXED code (reads inside the locked transaction) pays once. The
 * red/green check was run by hand: with the reads moved back outside
 * the transaction this spec's concurrent test records 2 payments,
 * 2 expenses and 2 next bills; with the fix it records 1 of each.
 *
 * The fake also simulates the ON DELETE CASCADE foreign keys for
 * bill -> payments, so removeBill behaves as it does on Postgres.
 */

type Row = Record<string, unknown>;

function matches(row: Row, where: Record<string, unknown> = {}): boolean {
  return Object.entries(where).every(([key, value]) => {
    const actual = row[key];
    // Dates are objects too: compare them by time before the
    // generic object (operator) branch below.
    if (value instanceof Date && actual instanceof Date)
      return value.getTime() === actual.getTime();
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const cond = value as Record<string, unknown>;
      if ('in' in cond)
        return (cond.in as unknown[]).some((item) =>
          item instanceof Date && actual instanceof Date
            ? item.getTime() === actual.getTime()
            : item === actual,
        );
      return false;
    }
    return actual === value;
  });
}

function buildFakePrisma() {
  const bills: Row[] = [];
  const payments: Row[] = [];
  const transactions: Row[] = [];
  let billSeq = 0;
  let paymentSeq = 0;
  let transactionSeq = 0;

  const userBill = {
    findMany: jest.fn(
      async ({ where }: { where?: Record<string, unknown> } = {}) =>
        bills.filter((row) => matches(row, where)).map((row) => ({ ...row })),
    ),
    findFirst: jest.fn(
      async ({ where }: { where?: Record<string, unknown> } = {}) => {
        const found = bills.find((row) => matches(row, where));
        return found ? { ...found } : null;
      },
    ),
    create: jest.fn(async ({ data }: { data: Row }) => {
      const row = {
        id: `bill-${++billSeq}`,
        parent_bill_id: null,
        created_at: new Date(),
        ...data,
      };
      bills.push(row);
      return { ...row };
    }),
    updateMany: jest.fn(
      async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Row;
      }) => {
        let count = 0;
        for (const row of bills.filter((r) => matches(r, where))) {
          Object.assign(row, data);
          count++;
        }
        return { count };
      },
    ),
    deleteMany: jest.fn(
      async ({ where }: { where?: Record<string, unknown> } = {}) => {
        let count = 0;
        for (let i = bills.length - 1; i >= 0; i--) {
          if (matches(bills[i], where)) {
            // ON DELETE CASCADE: a bill's payments go with it.
            const billId = bills[i].id;
            for (let j = payments.length - 1; j >= 0; j--) {
              if (payments[j].bill_id === billId) payments.splice(j, 1);
            }
            bills.splice(i, 1);
            count++;
          }
        }
        return { count };
      },
    ),
    count: jest.fn(
      async ({ where }: { where?: Record<string, unknown> } = {}) =>
        bills.filter((row) => matches(row, where)).length,
    ),
  };
  const userBillPayment = {
    findMany: jest.fn(
      async ({ where }: { where?: Record<string, unknown> } = {}) =>
        payments
          .filter((row) => matches(row, where))
          .map((row) => ({ ...row })),
    ),
    create: jest.fn(async ({ data }: { data: Row }) => {
      const row = {
        id: `payment-${++paymentSeq}`,
        created_at: new Date(),
        ...data,
      };
      payments.push(row);
      return { ...row };
    }),
    deleteMany: jest.fn(
      async ({ where }: { where?: Record<string, unknown> } = {}) => {
        let count = 0;
        for (let i = payments.length - 1; i >= 0; i--) {
          if (matches(payments[i], where)) {
            payments.splice(i, 1);
            count++;
          }
        }
        return { count };
      },
    ),
  };
  const userTransaction = {
    findMany: jest.fn(
      async ({ where }: { where?: Record<string, unknown> } = {}) =>
        transactions
          .filter((row) => matches(row, where))
          .map((row) => ({ ...row })),
    ),
    create: jest.fn(async ({ data }: { data: Row }) => {
      const row = {
        id: `txn-${++transactionSeq}`,
        bill_payment_id: null,
        created_at: new Date(),
        ...data,
      };
      transactions.push(row);
      return { ...row };
    }),
    deleteMany: jest.fn(
      async ({ where }: { where?: Record<string, unknown> } = {}) => {
        let count = 0;
        for (let i = transactions.length - 1; i >= 0; i--) {
          if (matches(transactions[i], where)) {
            transactions.splice(i, 1);
            count++;
          }
        }
        return { count };
      },
    ),
  };
  const tx = {
    $queryRaw: jest.fn(async () => []),
    userBill,
    userBillPayment,
    userTransaction,
  };
  // Transactions run one at a time, in call order — the serialization
  // a FOR UPDATE lock gives concurrent runs on the same rows.
  let queue: Promise<unknown> = Promise.resolve();
  const prisma = {
    $queryRaw: jest.fn(async () => []),
    userBill,
    userBillPayment,
    userTransaction,
    userGoal: { findFirst: jest.fn(async () => null) },
    userGoalContribution: {
      findMany: jest.fn(async () => []),
      create: jest.fn(),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    idempotencyKey: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => ({})),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    $transaction: jest.fn((fn: (client: unknown) => unknown) => {
      const run = queue.then(() => fn(tx));
      queue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    }),
  };
  return { prisma, bills, payments, transactions };
}

describe('concurrent auto-pay and payment side effects', () => {
  it('two simultaneous auto-pay runs pay a monthly bill exactly once (B34)', async () => {
    const { prisma, bills, payments, transactions } = buildFakePrisma();
    const service = new ActivityService(prisma as unknown as PrismaService);
    const original = await prisma.userBill.create({
      data: {
        name: 'Internet',
        amount: '999.00',
        due_date: new Date('2026-11-20T00:00:00Z'),
        auto_pay: true,
        recurrence: 'monthly',
        user_id: 'owner',
      },
    });
    const [first, second] = await Promise.all([
      service.runAutoPay('owner', { today: '2026-11-24' }),
      service.runAutoPay('owner', { today: '2026-11-24' }),
    ]);
    const paidCount = first.paid.length + second.paid.length;
    expect(paidCount).toBe(1);
    expect(payments).toHaveLength(1);
    expect(transactions).toHaveLength(1);
    // Exactly one next occurrence, linked to the bill it came from.
    expect(bills).toHaveLength(2);
    const next = bills.find((bill) => bill.id !== original.id);
    expect(next?.parent_bill_id).toBe(original.id);
    expect(next?.due_date?.toISOString().slice(0, 10)).toBe('2026-12-20');
    expect(transactions[0].bill_payment_id).toBe(payments[0].id);
  });

  it('two partial payments of a monthly bill spawn only one next occurrence (B44)', async () => {
    const { prisma, bills, payments, transactions } = buildFakePrisma();
    const service = new ActivityService(prisma as unknown as PrismaService);
    const original = await prisma.userBill.create({
      data: {
        name: 'Rent',
        amount: '1000.00',
        due_date: new Date('2026-11-28T00:00:00Z'),
        auto_pay: false,
        recurrence: 'monthly',
        user_id: 'owner',
      },
    });
    await service.addBillPayment('owner', original.id, {
      amount: 400,
      paidDate: '2026-11-25',
    });
    await service.addBillPayment('owner', original.id, {
      amount: 400,
      paidDate: '2026-11-25',
    });
    expect(payments).toHaveLength(2);
    expect(transactions).toHaveLength(2);
    expect(bills).toHaveLength(2);
    expect(
      bills
        .find((bill) => bill.id !== original.id)
        ?.due_date?.toISOString()
        .slice(0, 10),
    ).toBe('2026-12-28');
  });

  it('deleting a payment removes its expense and its next occurrence (B37)', async () => {
    const { prisma, bills, payments, transactions } = buildFakePrisma();
    const service = new ActivityService(prisma as unknown as PrismaService);
    const original = await prisma.userBill.create({
      data: {
        name: 'Internet',
        amount: '999.00',
        due_date: new Date('2026-11-20T00:00:00Z'),
        auto_pay: true,
        recurrence: 'monthly',
        user_id: 'owner',
      },
    });
    const created = await service.addBillPayment('owner', original.id, {
      amount: 999,
      paidDate: '2026-11-24',
    });
    expect(payments).toHaveLength(1);
    expect(transactions).toHaveLength(1);
    expect(bills).toHaveLength(2);
    await service.removeBillPayment('owner', original.id, created.id);
    expect(payments).toHaveLength(0);
    expect(transactions).toHaveLength(0);
    expect(bills).toHaveLength(1);
    expect(bills[0].id).toBe(original.id);
  });

  it('deleting a bill removes its payments, expenses and generated occurrences (B37)', async () => {
    const { prisma, bills, payments, transactions } = buildFakePrisma();
    const service = new ActivityService(prisma as unknown as PrismaService);
    const original = await prisma.userBill.create({
      data: {
        name: 'Internet',
        amount: '999.00',
        due_date: new Date('2026-11-20T00:00:00Z'),
        auto_pay: true,
        recurrence: 'monthly',
        user_id: 'owner',
      },
    });
    await service.addBillPayment('owner', original.id, {
      amount: 999,
      paidDate: '2026-11-24',
    });
    expect(bills).toHaveLength(2);
    await service.removeBill('owner', original.id);
    expect(bills).toHaveLength(0);
    expect(payments).toHaveLength(0);
    expect(transactions).toHaveLength(0);
  });
});
