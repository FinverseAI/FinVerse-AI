import { BadRequestException } from '@nestjs/common';
import {
  validateAutoPayRun,
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
  it.each([
    'Income',
    'Food & Dining',
    'Groceries',
    'Transport',
    'Shopping',
    'Bills & Utilities',
    'Rent',
    'Health',
    'Entertainment',
    'Travel',
    'Education',
    'Investments',
    'Others',
  ])('accepts the canonical category %s', (category) => {
    // B40: Income is money in (positive); every other category is
    // money out (negative).
    const amount = category === 'Income' ? 0.01 : -0.01;
    expect(
      validateTransaction({
        name: 'Record',
        amount,
        date: '2026-11-16',
        category,
      }).category,
    ).toBe(category);
  });
  it.each([
    ['Housing', 'Rent'],
    ['Transportation', 'Transport'],
    ['Utilities', 'Bills & Utilities'],
    ['Other', 'Others'],
  ])('maps the legacy category %s to %s', (legacy, canonical) => {
    expect(
      validateTransaction({
        name: 'Record',
        amount: -0.01,
        date: '2026-11-16',
        category: legacy,
      }).category,
    ).toBe(canonical);
  });
  it('normalizes names, precise amounts, and date-only values', () => {
    expect(validateBill(bill)).toEqual({
      name: 'Rent',
      amount: '1850.50',
      due_date: new Date('2026-11-28T00:00:00Z'),
      auto_pay: false,
      recurrence: null,
    });
  });
  it('accepts a monthly recurrence and normalizes an absent one to null', () => {
    expect(validateBill({ ...bill, recurrence: 'monthly' }).recurrence).toBe(
      'monthly',
    );
    expect(validateBill({ ...bill, recurrence: null }).recurrence).toBe(null);
    expect(validateBill(bill).recurrence).toBe(null);
  });
  it.each(['weekly', 'yearly', '', 0, true, {}])(
    'rejects an unsupported recurrence %s',
    (recurrence) => {
      expect(() => validateBill({ ...bill, recurrence })).toThrow(
        BadRequestException,
      );
    },
  );
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
  it('rejects a sign that contradicts the category (B40)', () => {
    // Negative Income would be counted as spending downstream;
    // positive spending would be counted as income.
    expect(() =>
      validateTransaction({
        name: 'Salary',
        amount: -120,
        date: '2026-11-13',
        category: 'Income',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateTransaction({
        name: 'Groceries',
        amount: 12.34,
        date: '2026-11-13',
        category: 'Food & Dining',
      }),
    ).toThrow(BadRequestException);
  });
  it('rejects future dates on transactions, payments and contributions (B41)', () => {
    // A date a year out is far beyond the one-day local-date grace.
    expect(() =>
      validateTransaction({
        name: 'Groceries',
        amount: -12.34,
        date: '2099-01-01',
        category: 'Food & Dining',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateBillPayment({ amount: 100, paidDate: '2099-01-01' }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateGoalContribution({ amount: 100, date: '2099-01-01' }),
    ).toThrow(BadRequestException);
    // A bill due date may legitimately be in the future.
    expect(validateBill({ ...bill, dueDate: '2099-01-01' }).due_date).toEqual(
      new Date('2099-01-01T00:00:00Z'),
    );
  });
  it('rejects a forged far-future auto-pay date and clamps tomorrow (B35)', () => {
    expect(() => validateAutoPayRun({ today: '9999-12-31' })).toThrow(
      BadRequestException,
    );
    expect(() => validateAutoPayRun({ today: '2099-01-01' })).toThrow(
      BadRequestException,
    );
    // One day ahead is the caller's local date around midnight IST:
    // it is clamped to the server's UTC today, never paid as tomorrow.
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const serverToday = new Date().toISOString().slice(0, 10);
    expect(validateAutoPayRun({ today: tomorrow }).today).toEqual(
      new Date(`${serverToday}T00:00:00.000Z`),
    );
    // A past date is accepted as sent.
    expect(validateAutoPayRun({ today: '2026-11-24' }).today).toEqual(
      new Date('2026-11-24T00:00:00Z'),
    );
    expect(validateAutoPayRun(undefined).today).toEqual(
      new Date(`${serverToday}T00:00:00.000Z`),
    );
  });
  it('normalizes bill payments to precise amounts and date-only values', () => {
    expect(
      validateBillPayment({ amount: 1850.5, paidDate: '2026-11-24' }),
    ).toEqual({
      amount: '1850.50',
      paid_date: new Date('2026-11-24T00:00:00Z'),
    });
  });
  it.each([0, -1, 'NaN', '1.001', '', null, 100000001])(
    'rejects invalid payment amount %s',
    (amount) => {
      expect(() =>
        validateBillPayment({ amount, paidDate: '2026-11-24' }),
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
