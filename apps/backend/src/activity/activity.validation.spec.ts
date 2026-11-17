import { BadRequestException } from '@nestjs/common';
import {
  validateBill,
  validateBillPayment,
  validateGoalContribution,
  validateTransaction,
} from './activity.validation';

const bill = {
  name: ' Rent ',
  amount: '1850.50',
  dueDate: '2026-11-28',
  autoPay: false,
};

describe('dashboard activity validation', () => {
  it.each(['Groceries', 'Health', 'Travel', 'Education', 'Investments'])(
    'accepts the onboarding category %s',
    (category) => {
      expect(
        validateTransaction({
          name: 'Record',
          amount: -0.01,
          date: '2026-11-16',
          category,
        }).category,
      ).toBe(category);
    },
  );
  it('normalizes names, precise amounts, and date-only values', () => {
    expect(validateBill(bill)).toEqual({
      name: 'Rent',
      amount: '1850.50',
      due_date: new Date('2026-11-28T00:00:00Z'),
      auto_pay: false,
    });
  });
  it.each([0, -1, 'NaN', Infinity, '1.001', '', null, true, 100000001])(
    'rejects invalid bill amount %s',
    (amount) => {
      expect(() => validateBill({ ...bill, amount })).toThrow(
        BadRequestException,
      );
    },
  );
  it.each([
    '2026-02-29',
    '2026-11-31',
    '2026-1-01',
    'not-a-date',
    '1899-12-31',
  ])('rejects invalid due date %s', (dueDate) => {
    expect(() => validateBill({ ...bill, dueDate })).toThrow(
      BadRequestException,
    );
  });
  it('accepts leap days and overdue reminders', () => {
    expect(
      validateBill({ ...bill, dueDate: '2024-02-29' }).due_date.toISOString(),
    ).toBe('2024-02-29T00:00:00.000Z');
  });
  it('rejects blank names and non-boolean auto-pay values', () => {
    expect(() => validateBill({ ...bill, name: '   ' })).toThrow(
      BadRequestException,
    );
    expect(() => validateBill({ ...bill, name: 'a'.repeat(81) })).toThrow(
      BadRequestException,
    );
    expect(() => validateBill({ ...bill, autoPay: 'false' })).toThrow(
      BadRequestException,
    );
  });
  it('accepts both income and expenses and rejects invalid categories', () => {
    const transaction = {
      name: 'Groceries',
      amount: -12.34,
      date: '2026-11-13',
      category: 'Food & Dining',
    };
    expect(validateTransaction(transaction).amount).toBe('-12.34');
    expect(
      validateTransaction({ ...transaction, amount: 120, category: 'Income' })
        .amount,
    ).toBe('120.00');
    expect(() =>
      validateTransaction({ ...transaction, category: 'Made up' }),
    ).toThrow(BadRequestException);
    expect(() => validateTransaction({ ...transaction, amount: 0 })).toThrow(
      BadRequestException,
    );
  });
  it('normalizes bill payments to precise amounts and date-only values', () => {
    expect(
      validateBillPayment({ amount: 1850.5, paidDate: '2026-11-27' }),
    ).toEqual({
      amount: '1850.50',
      paid_date: new Date('2026-11-27T00:00:00Z'),
    });
  });
  it.each([0, -1, 'NaN', '1.001', '', null, 100000001])(
    'rejects invalid payment amount %s',
    (amount) => {
      expect(() =>
        validateBillPayment({ amount, paidDate: '2026-11-27' }),
      ).toThrow(BadRequestException);
    },
  );
  it.each(['2026-02-30', 'not-a-date', '1899-12-31'])(
    'rejects invalid payment date %s',
    (paidDate) => {
      expect(() => validateBillPayment({ amount: 100, paidDate })).toThrow(
        BadRequestException,
      );
    },
  );
  it('normalizes goal contributions and trims optional notes', () => {
    expect(
      validateGoalContribution({
        amount: 500,
        date: '2026-11-17',
        note: '  Salary day  ',
      }),
    ).toEqual({
      amount: '500.00',
      date: new Date('2026-11-17T00:00:00Z'),
      note: 'Salary day',
    });
    expect(
      validateGoalContribution({ amount: 500, date: '2026-11-17' }).note,
    ).toBeNull();
  });
  it.each([0, -1, '1.001', '', null])(
    'rejects invalid contribution amount %s',
    (amount) => {
      expect(() =>
        validateGoalContribution({ amount, date: '2026-11-17' }),
      ).toThrow(BadRequestException);
    },
  );
  it('rejects invalid contribution dates and long notes', () => {
    expect(() =>
      validateGoalContribution({ amount: 100, date: '2026-02-30' }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateGoalContribution({
        amount: 100,
        date: '2026-11-17',
        note: 'x'.repeat(141),
      }),
    ).toThrow(BadRequestException);
  });
});
