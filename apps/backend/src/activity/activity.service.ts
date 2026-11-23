import { Injectable, NotFoundException } from '@nestjs/common';
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

  async addBill(userId: string, input: unknown) {
    return billResponse(
      await this.prisma.userBill.create({
        data: { ...validateBill(input), user_id: userId },
      }),
    );
  }

  async updateBill(userId: string, id: string, input: unknown) {
    const data = validateBill(input);
    const result = await this.prisma.userBill.updateMany({
      where: { id, user_id: userId },
      data,
    });
    if (!result.count)
      throw new NotFoundException('This bill no longer exists.');
    const updated = await this.ownedBill(userId, id);
    return billResponse(updated, await this.paymentsFor(userId, id));
  }

  async removeBill(userId: string, id: string) {
    const result = await this.prisma.userBill.deleteMany({
      where: { id, user_id: userId },
    });
    if (!result.count)
      throw new NotFoundException('This bill no longer exists.');
    return { deleted: true };
  }

  async billPayments(userId: string, billId: string) {
    await this.ownedBill(userId, billId);
    return (await this.paymentsFor(userId, billId)).map(paymentResponse);
  }

  async addBillPayment(userId: string, billId: string, input: unknown) {
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
   * or none does. Removing a payment later does NOT remove the
   * transaction, and does NOT remove a generated next occurrence.
   */
  private async recordPayment(
    tx: Prisma.TransactionClient,
    userId: string,
    bill: UserBill,
    amount: string,
    paidDate: Date,
  ) {
    const savedPayment = await tx.userBillPayment.create({
      data: { amount, paid_date: paidDate, bill_id: bill.id, user_id: userId },
    });
    await tx.userTransaction.create({
      data: {
        name: bill.name,
        amount: `-${amount}`,
        category: 'Bills & Utilities',
        date: paidDate,
        user_id: userId,
      },
    });
    let nextBill: UserBill | null = null;
    if (bill.recurrence === 'monthly') {
      nextBill = await tx.userBill.create({
        data: {
          name: bill.name,
          amount: bill.amount,
          due_date: nextMonthlyDue(bill.due_date),
          auto_pay: bill.auto_pay,
          recurrence: 'monthly',
          user_id: userId,
        },
      });
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
   * auto-pay does that. The run is idempotent: a second run finds
   * nothing left unpaid and pays nothing. It is triggered by the
   * dashboard loading, not by a background scheduler (no cron
   * infrastructure exists), so a bill is recorded on the first
   * dashboard visit on or after its due date.
   */
  async runAutoPay(userId: string, input: unknown) {
    const { today } = validateAutoPayRun(input);
    const todayKey = today.toISOString().slice(0, 10);
    const [bills, payments] = await Promise.all([
      this.prisma.userBill.findMany({ where: { user_id: userId } }),
      this.paymentsFor(userId),
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
    if (!due.length) return { paid: [] };
    // One transaction for the whole run: either every due bill is
    // recorded or none is, so a failure can never half-pay the run.
    const paid = await this.prisma.$transaction(async (tx) => {
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
    const result = await this.prisma.userBillPayment.deleteMany({
      where: { id: paymentId, bill_id: billId, user_id: userId },
    });
    if (!result.count)
      throw new NotFoundException('This payment no longer exists.');
    return { deleted: true };
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

  async addGoalContribution(userId: string, goalId: string, input: unknown) {
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

  async addTransaction(userId: string, input: unknown) {
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
