import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  UserBill,
  UserBillPayment,
  UserGoalContribution,
  UserTransaction,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
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
    await this.ownedBill(userId, billId);
    return paymentResponse(
      await this.prisma.userBillPayment.create({
        data: {
          ...validateBillPayment(input),
          bill_id: billId,
          user_id: userId,
        },
      }),
    );
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
