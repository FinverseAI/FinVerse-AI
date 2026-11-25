import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  UserBill,
  UserBillPayment,
  UserGoalContribution,
  UserTransaction,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { nextMonthlyDue } from './activity.dates';
import {
  validateAutoPayRun,
  validateBill,
  validateBillPayment,
  validateGoalContribution,
  validateTransaction,
} from './activity.validation';

/** A replayed request is rejected for 24 hours after the first one. */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function paymentResponse(payment: UserBillPayment) {
  return {
    id: payment.id,
    amount: Number(payment.amount),
    paidDate: payment.paid_date.toISOString().slice(0, 10),
  };
}

function billResponse(bill: UserBill, payments: UserBillPayment[] = []) {
  const paidCents = payments.reduce(
    (sum, payment) => sum + Math.round(Number(payment.amount) * 100),
    0,
  );
  return {
    id: bill.id,
    name: bill.name,
    amount: Number(bill.amount),
    dueDate: bill.due_date.toISOString().slice(0, 10),
    autoPay: bill.auto_pay,
    recurrence: bill.recurrence ?? null,
    paidTotal: paidCents / 100,
    payments: payments.map(paymentResponse),
  };
}

function contributionResponse(contribution: UserGoalContribution) {
  return {
    id: contribution.id,
    amount: Number(contribution.amount),
    date: contribution.date.toISOString().slice(0, 10),
    note: contribution.note,
  };
}

function transactionResponse(transaction: UserTransaction) {
  return {
    id: transaction.id,
    name: transaction.name,
    amount: Number(transaction.amount),
    category: transaction.category,
    date: transaction.date.toISOString().slice(0, 10),
  };
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  private async ownedBill(userId: string, billId: string) {
    const bill = await this.prisma.userBill.findFirst({
      where: { id: billId, user_id: userId },
    });
    if (!bill) throw new NotFoundException('This bill no longer exists.');
    return bill;
  }

  private async paymentsFor(userId: string, billId?: string) {
    return this.prisma.userBillPayment.findMany({
      where: billId
        ? { bill_id: billId, user_id: userId }
        : { user_id: userId },
      orderBy: [{ paid_date: 'desc' }, { created_at: 'desc' }, { id: 'desc' }],
    });
  }

  /**
   * B44 — idempotency for POST creates. The client sends a unique
   * `X-Idempotency-Key` header per request (see the controller). A
   * replay of the same (user, key) within 24h is rejected with 409
   * `{ message: 'duplicate request', code: 'DUPLICATE_REQUEST' }`
   * instead of creating a duplicate row. Keys older than 24h are
   * expired and may be reused. The UNIQUE(user_id, key) constraint
   * (migration 20261126020100) is the backstop if two replays race
   * this check. Note the key is claimed before the write: if the
   * write then fails, the key stays claimed and the client must retry
   * with a fresh key.
   */
  private async claimIdempotencyKey(
    userId: string,
    key: string | undefined,
    endpoint: string,
  ) {
    if (!key) return;
    const existing = await this.prisma.idempotencyKey.findFirst({
      where: { user_id: userId, key },
    });
    if (existing) {
      const ageMs = Date.now() - new Date(existing.created_at).getTime();
      if (ageMs < IDEMPOTENCY_TTL_MS) {
        throw new ConflictException({
          message: 'duplicate request',
          code: 'DUPLICATE_REQUEST',
        });
      }
      await this.prisma.idempotencyKey.deleteMany({
        where: { user_id: userId, key },
      });
    }
    try {
      await this.prisma.idempotencyKey.create({
        data: { user_id: userId, key, endpoint },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          message: 'duplicate request',
          code: 'DUPLICATE_REQUEST',
        });
      }
      throw error;
    }
  }

  async bills(userId: string) {
    const [bills, payments] = await Promise.all([
      this.prisma.userBill.findMany({
        where: { user_id: userId },
        orderBy: [{ due_date: 'asc' }, { created_at: 'asc' }, { id: 'asc' }],
      }),
      this.paymentsFor(userId),
    ]);
    const byBill = new Map<string, UserBillPayment[]>();
    for (const payment of payments) {
      const list = byBill.get(payment.bill_id) ?? [];
      list.push(payment);
      byBill.set(payment.bill_id, list);
    }
    return bills.map((bill) => billResponse(bill, byBill.get(bill.id) ?? []));
  }

  async addBill(userId: string, input: unknown, idempotencyKey?: string) {
    await this.claimIdempotencyKey(userId, idempotencyKey, 'POST /api/bills');
    return billResponse(
      await this.prisma.userBill.create({
        data: { ...validateBill(input), user_id: userId },
      }),
    );
  }

  async updateBill(userId: string, id: string, input: unknown) {
    const data = validateBill(input);
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.userBill.findFirst({
        where: { id, user_id: userId },
      });
      if (!bill) throw new NotFoundException('This bill no longer exists.');
      const payments = await tx.userBillPayment.findMany({
        where: { bill_id: id, user_id: userId },
      });
      const paidCents = payments.reduce(
        (sum, payment) => sum + Math.round(Number(payment.amount) * 100),
        0,
      );
      // B36: the amount can never drop below what is already paid —
      // otherwise the bill strands in an overpaid state and auto-pay
      // skips it forever.
      if (Math.round(Number(data.amount) * 100) < paidCents) {
        throw new BadRequestException(
          'The new amount is less than the amount already paid on this bill.',
        );
      }
      const dueChanged = data.due_date.getTime() !== bill.due_date.getTime();
      const recurrenceChanged = data.recurrence !== (bill.recurrence ?? null);
      if (dueChanged || recurrenceChanged) {
        // B36: a generated next occurrence was derived from the old
        // due date/recurrence, so re-derive it — or void it when the
        // bill no longer recurs. A next occurrence that already has
        // payments of its own is real history: refuse the edit
        // instead of silently rewriting it.
        const children = await tx.userBill.findMany({
          where: { parent_bill_id: id, user_id: userId },
        });
        for (const child of children) {
          const childPayments = await tx.userBillPayment.findMany({
            where: { bill_id: child.id, user_id: userId },
          });
          if (childPayments.length) {
            throw new BadRequestException(
              'This bill already generated a next bill that has payments. Change the generated bill instead.',
            );
          }
          if (data.recurrence !== 'monthly') {
            await tx.userBill.deleteMany({
              where: { id: child.id, user_id: userId },
            });
          } else {
            await tx.userBill.updateMany({
              where: { id: child.id, user_id: userId },
              data: {
                amount: data.amount,
                due_date: nextMonthlyDue(data.due_date),
              },
            });
          }
        }
      }
      const updated = await tx.userBill.updateMany({
        where: { id, user_id: userId },
        data,
      });
      if (!updated.count)
        throw new NotFoundException('This bill no longer exists.');
      const refreshed = await tx.userBill.findFirst({
        where: { id, user_id: userId },
      });
      if (!refreshed)
        throw new NotFoundException('This bill no longer exists.');
      return billResponse(refreshed, payments);
    });
  }

  async removeBill(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.userBill.findFirst({
        where: { id, user_id: userId },
      });
      if (!bill) throw new NotFoundException('This bill no longer exists.');
      // B37: deleting a bill undoes its payment side effects in the
      // same transaction — the expense transactions its payments
      // generated, and the next occurrences it generated. The bill's
      // own payments are removed by the FK cascade on delete.
      const payments = await tx.userBillPayment.findMany({
        where: { bill_id: id, user_id: userId },
      });
      if (payments.length) {
        await tx.userTransaction.deleteMany({
          where: {
            bill_payment_id: { in: payments.map((p) => p.id) },
            user_id: userId,
          },
        });
      }
      await tx.userBill.deleteMany({
        where: { parent_bill_id: id, user_id: userId },
      });
      const deleted = await tx.userBill.deleteMany({
        where: { id, user_id: userId },
      });
      if (!deleted.count)
        throw new NotFoundException('This bill no longer exists.');
      return { deleted: true };
    });
  }

  async billPayments(userId: string, billId: string) {
    await this.ownedBill(userId, billId);
    return (await this.paymentsFor(userId, billId)).map(paymentResponse);
  }

  async addBillPayment(
    userId: string,
    billId: string,
    input: unknown,
    idempotencyKey?: string,
  ) {
    await this.claimIdempotencyKey(
      userId,
      idempotencyKey,
      'POST /api/bills/:id/payments',
    );
    const bill = await this.ownedBill(userId, billId);
    const payment = validateBillPayment(input);
    const created = await this.prisma.$transaction((tx) =>
      this.recordPayment(tx, userId, bill, payment.amount, payment.paid_date),
    );
    // The generated next occurrence (if any) rides back with the
    // payment, so the interface can show it without a refetch.
    return {
      ...paymentResponse(created.payment),
      nextBill: created.nextBill ? billResponse(created.nextBill) : null,
    };
  }

  /**
   * One payment, recorded atomically: the payment row, its matching
   * expense transaction (team decision, 2026-11-23 — paying a bill
   * also records the expense, so spending analysis sees it), and —
   * for a monthly bill — the next occurrence. Either all three land
   * or none does.
   *
   * B37: the expense carries the payment's id and the next occurrence
   * carries the bill's id, so deleting the payment or the bill can
   * undo both in the same transaction.
   */
  private async recordPayment(
    tx: Prisma.TransactionClient,
    userId: string,
    bill: UserBill,
    amount: string,
    paidDate: Date,
  ) {
    // B36: re-read the bill and its payments INSIDE the transaction
    // and reject any payment above the remaining balance. The caller
    // may have read a stale bill (or a concurrent payment may have
    // landed since), so the remaining balance is always recomputed
    // here, never trusted from outside the transaction. The re-read
    // row is used only when it is the same bill (its id matches);
    // otherwise the caller's bill stands — in auto-pay the caller
    // already read the bill inside this same transaction.
    const reRead = await tx.userBill.findFirst({
      where: { id: bill.id, user_id: userId },
    });
    if (!reRead) throw new NotFoundException('This bill no longer exists.');
    const fresh = reRead.id === bill.id ? reRead : bill;
    const existing = await tx.userBillPayment.findMany({
      where: { bill_id: bill.id, user_id: userId },
    });
    const paidCents = existing.reduce(
      (sum, payment) => sum + Math.round(Number(payment.amount) * 100),
      0,
    );
    const amountCents = Math.round(Number(amount) * 100);
    const remainingCents = Math.round(Number(fresh.amount) * 100) - paidCents;
    if (amountCents > remainingCents) {
      throw new BadRequestException(
        'This payment is more than the amount still owed on this bill.',
      );
    }
    const savedPayment = await tx.userBillPayment.create({
      data: { amount, paid_date: paidDate, bill_id: fresh.id, user_id: userId },
    });
    await tx.userTransaction.create({
      data: {
        name: fresh.name,
        amount: `-${amount}`,
        category: 'Bills & Utilities',
        date: paidDate,
        user_id: userId,
        bill_payment_id: savedPayment.id,
      },
    });
    let nextBill: UserBill | null = null;
    if (fresh.recurrence === 'monthly') {
      const nextDue = nextMonthlyDue(fresh.due_date);
      // B44: dedupe the next occurrence even with no idempotency key
      // — a retry or double-submit after a partial payment must not
      // spawn a second next-month bill for the same due date.
      const already = await tx.userBill.count({
        where: { parent_bill_id: fresh.id, due_date: nextDue },
      });
      if (!already) {
        nextBill = await tx.userBill.create({
          data: {
            name: fresh.name,
            amount: fresh.amount,
            due_date: nextDue,
            auto_pay: fresh.auto_pay,
            recurrence: 'monthly',
            parent_bill_id: fresh.id,
            user_id: userId,
          },
        });
      }
    }
    return { payment: savedPayment, nextBill };
  }

  /**
   * Auto-pay run (team decision, 2026-11-24): every auto-pay bill
   * that is due on or before `today` and still has an unpaid
   * remainder is marked paid — payment + matching expense
   * transaction (+ next occurrence for monthly bills). The whole run
   * is one database transaction: either every due bill is recorded
   * or none is, so a failure can never half-pay the run.
   *
   * This records the payment in FinVerse; it does NOT move real
   * money or pay the provider — the user's bank or provider
   * auto-pay does that. It is triggered by the dashboard loading,
   * not by a background scheduler (no cron infrastructure exists),
   * so a bill is recorded on the first dashboard visit on or after
   * its due date.
   *
   * B34 — concurrency: the bill/payment reads happen INSIDE the
   * transaction, after a SELECT ... FOR UPDATE row lock on the
   * user's bills (the same pattern profile.save uses). Two
   * concurrent runs serialize on the lock: the second re-reads after
   * the first commits, finds the bills already paid, and pays
   * nothing. Reading outside the transaction (the old code) let both
   * runs compute the same due list from a stale snapshot and pay
   * twice. Approach chosen: row-locking (not a unique constraint),
   * because auto-pay legitimately records several payments against
   * one bill over time (partial payments), so no single-column
   * unique key fits — and the lock also protects the remaining
   * balance recomputation. Proven by the concurrent test in
   * activity.concurrent.spec.ts (Promise.all, two simultaneous
   * runs against a serializing fake transaction): exactly one
   * payment, one expense, one next bill.
   */
  async runAutoPay(userId: string, input: unknown) {
    const { today } = validateAutoPayRun(input);
    const todayKey = today.toISOString().slice(0, 10);
    // One transaction for the whole run: either every due bill is
    // recorded or none is, so a failure can never half-pay the run.
    const paid = await this.prisma.$transaction(async (tx) => {
      // Lock the user's bills for the duration of the run so a
      // concurrent run blocks here instead of reading a stale
      // snapshot. The re-read below then sees committed payments.
      await tx.$queryRaw`SELECT "id" FROM "user_bills" WHERE "user_id" = ${userId} FOR UPDATE`;
      const [bills, payments] = await Promise.all([
        tx.userBill.findMany({ where: { user_id: userId } }),
        tx.userBillPayment.findMany({
          where: { user_id: userId },
          orderBy: [
            { paid_date: 'desc' },
            { created_at: 'desc' },
            { id: 'desc' },
          ],
        }),
      ]);
      const paidByBill = new Map<string, number>();
      for (const payment of payments) {
        paidByBill.set(
          payment.bill_id,
          (paidByBill.get(payment.bill_id) ?? 0) +
            Math.round(Number(payment.amount) * 100),
        );
      }
      const due = bills
        .map((bill) => ({
          bill,
          remainingCents:
            Math.round(Number(bill.amount) * 100) -
            (paidByBill.get(bill.id) ?? 0),
        }))
        .filter(
          ({ bill, remainingCents }) =>
            bill.auto_pay &&
            bill.due_date.toISOString().slice(0, 10) <= todayKey &&
            remainingCents > 0,
        );
      const results: {
        billId: string;
        name: string;
        amount: number;
        paidDate: string;
        nextDueDate: string | null;
      }[] = [];
      for (const { bill, remainingCents } of due) {
        const amount = (remainingCents / 100).toFixed(2);
        const { nextBill } = await this.recordPayment(
          tx,
          userId,
          bill,
          amount,
          today,
        );
        results.push({
          billId: bill.id,
          name: bill.name,
          amount: remainingCents / 100,
          paidDate: todayKey,
          nextDueDate: nextBill
            ? nextBill.due_date.toISOString().slice(0, 10)
            : null,
        });
      }
      return results;
    });
    return { paid };
  }

  async removeBillPayment(userId: string, billId: string, paymentId: string) {
    await this.ownedBill(userId, billId);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.userBillPayment.deleteMany({
        where: { id: paymentId, bill_id: billId, user_id: userId },
      });
      if (!result.count)
        throw new NotFoundException('This payment no longer exists.');
      // B37: undo the payment's side effects in the same transaction
      // — the expense transaction it generated, and the next
      // occurrence it generated if that occurrence has no payments of
      // its own yet (a paid occurrence is real history and is kept).
      await tx.userTransaction.deleteMany({
        where: { bill_payment_id: paymentId, user_id: userId },
      });
      const children = await tx.userBill.findMany({
        where: { parent_bill_id: billId, user_id: userId },
      });
      for (const child of children) {
        const childPayments = await tx.userBillPayment.findMany({
          where: { bill_id: child.id, user_id: userId },
        });
        if (!childPayments.length) {
          await tx.userBill.deleteMany({
            where: { id: child.id, user_id: userId },
          });
        }
      }
      return { deleted: true };
    });
  }

  private async ownedGoal(userId: string, goalId: string) {
    const goal = await this.prisma.userGoal.findFirst({
      where: { id: goalId, user_id: userId },
    });
    if (!goal) throw new NotFoundException('This goal no longer exists.');
    return goal;
  }

  private async contributionsFor(userId: string, goalId: string) {
    return this.prisma.userGoalContribution.findMany({
      where: { goal_id: goalId, user_id: userId },
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async goalContributions(userId: string, goalId: string) {
    await this.ownedGoal(userId, goalId);
    return (await this.contributionsFor(userId, goalId)).map(
      contributionResponse,
    );
  }

  async addGoalContribution(
    userId: string,
    goalId: string,
    input: unknown,
    idempotencyKey?: string,
  ) {
    await this.claimIdempotencyKey(
      userId,
      idempotencyKey,
      'POST /api/goals/:id/contributions',
    );
    await this.ownedGoal(userId, goalId);
    return contributionResponse(
      await this.prisma.userGoalContribution.create({
        data: {
          ...validateGoalContribution(input),
          goal_id: goalId,
          user_id: userId,
        },
      }),
    );
  }

  async removeGoalContribution(
    userId: string,
    goalId: string,
    contributionId: string,
  ) {
    await this.ownedGoal(userId, goalId);
    const result = await this.prisma.userGoalContribution.deleteMany({
      where: { id: contributionId, goal_id: goalId, user_id: userId },
    });
    if (!result.count)
      throw new NotFoundException('This contribution no longer exists.');
    return { deleted: true };
  }

  async transactions(userId: string) {
    const transactions = await this.prisma.userTransaction.findMany({
      where: { user_id: userId },
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }, { id: 'desc' }],
    });
    return transactions.map(transactionResponse);
  }

  async addTransaction(
    userId: string,
    input: unknown,
    idempotencyKey?: string,
  ) {
    await this.claimIdempotencyKey(
      userId,
      idempotencyKey,
      'POST /api/transactions',
    );
    return transactionResponse(
      await this.prisma.userTransaction.create({
        data: { ...validateTransaction(input), user_id: userId },
      }),
    );
  }

  async updateTransaction(userId: string, id: string, input: unknown) {
    const data = validateTransaction(input);
    const result = await this.prisma.userTransaction.updateMany({
      where: { id, user_id: userId },
      data,
    });
    if (!result.count)
      throw new NotFoundException('This transaction no longer exists.');
    const updated = await this.prisma.userTransaction.findFirst({
      where: { id, user_id: userId },
    });
    if (!updated)
      throw new NotFoundException('This transaction no longer exists.');
    return transactionResponse(updated);
  }

  async removeTransaction(userId: string, id: string) {
    const result = await this.prisma.userTransaction.deleteMany({
      where: { id, user_id: userId },
    });
    if (!result.count)
      throw new NotFoundException('This transaction no longer exists.');
    return { deleted: true };
  }
}
