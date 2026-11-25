import { BadRequestException } from '@nestjs/common';

/**
 * The canonical transaction categories: the twelve setup labels
 * (apps/web/lib/onboarding.ts) plus Income for money coming in.
 * Transaction entry offers exactly this list.
 */
const categories = new Set([
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
]);

/**
 * Labels saved before the categories were unified (November 2026).
 * They are still accepted and mapped to their canonical label, so
 * records saved under the old names keep working.
 */
const LEGACY_CATEGORIES: Record<string, string> = {
  Housing: 'Rent',
  Transportation: 'Transport',
  Utilities: 'Bills & Utilities',
  Other: 'Others',
};

/** Map a saved or submitted category label to its canonical form. */
export function normalizeCategory(category: string): string {
  return LEGACY_CATEGORIES[category] ?? category;
}

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

/**
 * DATE CONVENTION (B35/B39/B41): all bill/profile dates are UTC
 * date-only values ("YYYY-MM-DD", midnight UTC). The server's "today"
 * is the UTC calendar date, never a local date: mixing toISOString()
 * (UTC) with local-day arithmetic shifts dates by a day between
 * 00:00–05:30 IST. A client may send its local date, which can be up
 * to one day ahead of the server UTC date around midnight IST, so
 * dates up to today + 1 day are accepted as the caller's today; any
 * date further in the future is rejected.
 */
function todayUtcKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function maxAcceptedDateKey(): string {
  const max = new Date(`${todayUtcKey()}T00:00:00.000Z`);
  max.setUTCDate(max.getUTCDate() + 1);
  return max.toISOString().slice(0, 10);
}

function date(value: unknown, options: { allowFuture?: boolean } = {}) {
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
  // B41: a record dated after today would land in a future month's
  // spending/balance, so it is rejected (one day of grace for the
  // caller's local date, see the convention above). Bill due dates
  // are exempt — they may legitimately be in the future.
  if (!options.allowFuture && value > maxAcceptedDateKey()) {
    throw new BadRequestException('Enter a date no later than today.');
  }
  return parsed;
}

export function validateBill(input: unknown) {
  const body = record(input);
  if (typeof body.autoPay !== 'boolean') {
    throw new BadRequestException('Choose whether this bill uses auto-pay.');
  }
  // Monthly is the only recurrence today; anything else is rejected
  // rather than stored, so a typo can never create a bill that never
  // recurs. Absent or null means a one-off bill.
  const recurrence = body.recurrence;
  if (
    recurrence !== undefined &&
    recurrence !== null &&
    recurrence !== 'monthly'
  ) {
    throw new BadRequestException('Choose whether this bill repeats monthly.');
  }
  return {
    name: name(body.name),
    amount: amount(body.amount),
    // B41: a bill due date may legitimately be in the future.
    due_date: date(body.dueDate, { allowFuture: true }),
    auto_pay: body.autoPay,
    recurrence: recurrence === 'monthly' ? 'monthly' : null,
  };
}

/**
 * The auto-pay run takes the caller's local date ("today"): a bill is
 * due by the user's calendar, not the server's UTC clock. When the
 * date is missing it defaults to the server's current UTC date.
 *
 * B35: `today` is clamped server-side and never trusted blindly. A
 * date up to one day ahead of the server UTC date is the caller's
 * local date around midnight IST, so it is clamped back to the server
 * date; anything further ahead (e.g. 9999-12-31) is rejected, so one
 * forged request can never mass-pay every future bill. Past dates are
 * accepted as sent — they can only pay bills already due by then.
 */
export function validateAutoPayRun(input: unknown) {
  const now = new Date();
  const fallback = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  if (input === undefined || input === null || input === '')
    return { today: fallback };
  const body = record(input);
  if (body.today === undefined || body.today === null)
    return { today: fallback };
  const today = date(body.today, { allowFuture: true });
  if (today.toISOString().slice(0, 10) > maxAcceptedDateKey()) {
    throw new BadRequestException(
      'Enter an auto-pay date no later than today.',
    );
  }
  return { today: today > fallback ? fallback : today };
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
  if (typeof body.category !== 'string') {
    throw new BadRequestException('Choose a valid category.');
  }
  // Older records carry legacy labels; they map to the canonical label
  // on the way in, so an edit never fails on a saved category.
  const category = normalizeCategory(body.category);
  if (!categories.has(category)) {
    throw new BadRequestException('Choose a valid category.');
  }
  const amountValue = amount(body.amount, true);
  // B40: sign and category are reconciled cross-field — Income is
  // money in (amount > 0), every other category is money out
  // (amount < 0). Downstream (budgets, AI tools, readiness) filters
  // purely on sign, so a positive "Food & Dining" entry would
  // otherwise be silently counted as income.
  if (
    category === 'Income' ? Number(amountValue) <= 0 : Number(amountValue) >= 0
  ) {
    throw new BadRequestException(
      category === 'Income'
        ? 'Income must be a positive amount.'
        : 'Spending must be a negative amount.',
    );
  }
  return {
    name: name(body.name),
    amount: amountValue,
    date: date(body.date),
    category,
  };
}
