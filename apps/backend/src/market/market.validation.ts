import { BadRequestException } from '@nestjs/common';

/**
 * A tradable symbol: letters, digits and the punctuation Yahoo uses for
 * indices (^NSEI), exchanges (RELIANCE.NS), share classes (BRK-B) and
 * currency pairs (USDINR=X). Normalised to upper case.
 */
const symbolPattern = /^[A-Z0-9.^=-]{1,20}$/;

export const historyRanges = ['1mo', '3mo', '6mo', '1y', '5y'] as const;
export type HistoryRange = (typeof historyRanges)[number];

export const rangeDays: Record<HistoryRange, number> = {
  '1mo': 30,
  '3mo': 90,
  '6mo': 180,
  '1y': 365,
  '5y': 1825,
};

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('Send a valid record.');
  }
  return input as Record<string, unknown>;
}

function optionalText(value: unknown, max: number, label: string) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.trim().length > max) {
    throw new BadRequestException(
      `Keep the ${label} to ${max} characters or fewer.`,
    );
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function price(value: unknown) {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    !/^-?\d+(\.\d{1,2})?$/.test(String(value)) ||
    !Number.isFinite(Number(value)) ||
    Math.abs(Number(value)) > 100000000 ||
    Number(value) <= 0
  ) {
    throw new BadRequestException(
      'Enter a valid price with at most two decimal places.',
    );
  }
  return Number(value).toFixed(2);
}

function quantity(value: unknown) {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    !/^\d+(\.\d{1,4})?$/.test(String(value)) ||
    !Number.isFinite(Number(value)) ||
    Number(value) <= 0 ||
    Number(value) > 1000000000
  ) {
    throw new BadRequestException(
      'Enter a quantity greater than zero with at most four decimal places.',
    );
  }
  return Number(value).toFixed(4);
}

function date(value: unknown, allowFuture: boolean) {
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
  if (!allowFuture) {
    // IST-pinned "today": the UTC date runs a day behind IST between
    // 00:00 and 05:30, so a UTC today would reject a legitimate
    // IST-today purchase late at night.
    if (value > todayIst()) {
      throw new BadRequestException('The date cannot be in the future.');
    }
  }
  return parsed;
}

/** Today's date in IST (Asia/Kolkata), as YYYY-MM-DD. */
function todayIst(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * The currency a holding's buy price is entered in. Defaults to INR for
 * holdings saved before the field existed; any three-letter code is
 * accepted so a holding can match its quote's currency.
 */
function currency(value: unknown) {
  if (value === undefined || value === null) return 'INR';
  if (typeof value !== 'string' || !/^[A-Za-z]{3}$/.test(value.trim())) {
    throw new BadRequestException(
      'Choose a three-letter currency code, for example INR or USD.',
    );
  }
  return value.trim().toUpperCase();
}

export function normalizeSymbol(value: unknown) {
  if (typeof value !== 'string') {
    throw new BadRequestException('Enter a valid symbol.');
  }
  const symbol = value.trim().toUpperCase();
  if (!symbolPattern.test(symbol)) {
    throw new BadRequestException('Enter a valid symbol.');
  }
  return symbol;
}

export function validateRange(value: unknown): HistoryRange {
  if (
    typeof value === 'string' &&
    (historyRanges as readonly string[]).includes(value)
  ) {
    return value as HistoryRange;
  }
  return '1y';
}

export function validateSearchQuery(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) {
    throw new BadRequestException('Enter a search query up to 100 characters.');
  }
  return value.trim();
}

export function validateHolding(input: unknown) {
  const body = record(input);
  return {
    symbol: normalizeSymbol(body.symbol),
    name: optionalText(body.name, 120, 'company name'),
    sector: optionalText(body.sector, 80, 'sector'),
    quantity: quantity(body.quantity),
    buy_price: price(body.buyPrice),
    buy_date: date(body.buyDate, false),
    currency: currency(body.currency),
  };
}

export function validateWatchlistItem(input: unknown) {
  const body = record(input);
  return {
    symbol: normalizeSymbol(body.symbol),
    name: optionalText(body.name, 120, 'company name'),
  };
}

export function validateWatchSettings(input: unknown) {
  const body = record(input);
  const note = optionalText(body.note, 500, 'watchlist note');
  if (body.alertDirection == null && body.alertPrice == null) {
    return { note, alert_direction: null, alert_price: null };
  }
  if (body.alertDirection !== 'above' && body.alertDirection !== 'below') {
    throw new BadRequestException('Choose an above or below price alert.');
  }
  return {
    note,
    alert_direction: body.alertDirection,
    alert_price: price(body.alertPrice),
  };
}
