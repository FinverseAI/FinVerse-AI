import { Injectable, NotFoundException } from '@nestjs/common';
import type { UserBill, UserTransaction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { validateBill, validateTransaction } from './activity.validation';

function billResponse(bill: UserBill) {
  return {
    id: bill.id,
    name: bill.name,
    amount: Number(bill.amount),
    dueDate: bill.due_date.toISOString().slice(0, 10),
    autoPay: bill.auto_pay,
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

  async bills(userId: string) {
    const bills = await this.prisma.userBill.findMany({
      where: { user_id: userId },
      orderBy: [{ due_date: 'asc' }, { created_at: 'asc' }, { id: 'asc' }],
    });
    return bills.map(billResponse);
  }

  async addBill(userId: string, input: unknown) {
    return billResponse(
      await this.prisma.userBill.create({
        data: { ...validateBill(input), user_id: userId },
      }),
    );
  }

  async removeBill(userId: string, id: string) {
    const result = await this.prisma.userBill.deleteMany({
      where: { id, user_id: userId },
    });
    if (!result.count)
      throw new NotFoundException('This bill no longer exists.');
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
