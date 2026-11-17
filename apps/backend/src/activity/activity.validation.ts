import { BadRequestException } from '@nestjs/common';

const categories = new Set([
  'Income',
  'Housing',
  'Food & Dining',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Other',
  'Transportation',
  'Groceries',
  'Health',
  'Travel',
  'Education',
  'Investments',
]);

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('Send a valid record.');
  }
  return input as Record<string, unknown>;
}

function name(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) {
    throw new BadRequestException('Enter a name between 1 and 80 characters.');
  }
  return value.trim();
}

function amount(value: unknown, signed = false) {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    !/^-?\d+(\.\d{1,2})?$/.test(String(value)) ||
    !Number.isFinite(Number(value)) ||
    Math.abs(Number(value)) > 100000000 ||
    (signed ? Number(value) === 0 : Number(value) <= 0)
  ) {
    throw new BadRequestException(
      'Enter a valid amount with at most two decimal places.',
    );
  }
  return Number(value).toFixed(2);
}

function date(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('Enter a valid date.');
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value ||
    value < '1900-01-01' ||
    value > '9999-12-31'
  ) {
    throw new BadRequestException('Enter a valid date.');
  }
  return parsed;
}

export function validateBill(input: unknown) {
  const body = record(input);
  if (typeof body.autoPay !== 'boolean') {
    throw new BadRequestException('Choose whether this bill uses auto-pay.');
  }
  return {
    name: name(body.name),
    amount: amount(body.amount),
    due_date: date(body.dueDate),
    auto_pay: body.autoPay,
  };
}

export function validateGoalContribution(input: unknown) {
  const body = record(input);
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (
    body.note !== undefined &&
    (typeof body.note !== 'string' || note.length > 140)
  )
    throw new BadRequestException('Keep the note to 140 characters or fewer.');
  return {
    amount: amount(body.amount),
    date: date(body.date),
    note: note || null,
  };
}

export function validateBillPayment(input: unknown) {
  const body = record(input);
  return {
    amount: amount(body.amount),
    paid_date: date(body.paidDate),
  };
}

export function validateTransaction(input: unknown) {
  const body = record(input);
  if (typeof body.category !== 'string' || !categories.has(body.category)) {
    throw new BadRequestException('Choose a valid category.');
  }
  return {
    name: name(body.name),
    amount: amount(body.amount, true),
    date: date(body.date),
    category: body.category,
  };
}
