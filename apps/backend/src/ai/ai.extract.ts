import {
  ExpenseExtractionSchema,
  type ExpenseExtraction,
} from './ai.validation';

/**
 * Expense extraction: the one funnel every entry input (typed text,
 * voice transcript, receipt OCR text) goes through.
 *
 * The model path lives in AiService; this file holds the parts that
 * must be deterministic and unit-testable: resolving a category string
 * to a canonical label, and the local extractor that runs when the
 * model is unavailable (no API key, provider error, unparseable
 * reply). The local extractor never invents an amount — when it finds
 * no number, it returns null and the caller says so.
 */

/** The categories an expense may be filed under (no Income — this is entry for spending). */
export const EXPENSE_CATEGORIES = [
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
] as const;

/** Labels saved before the categories were unified; they map to the canonical label. */
const LEGACY_CATEGORIES: Record<string, string> = {
  Housing: 'Rent',
  Transportation: 'Transport',
  Utilities: 'Bills & Utilities',
  Other: 'Others',
};

/** Keyword hints mapping words in the text to a category. First match wins. */
const CATEGORY_KEYWORDS: Array<{ category: string; words: string[] }> = [
  {
    category: 'Food & Dining',
    words: [
      'coffee',
      'tea',
      'chai',
      'lunch',
      'dinner',
      'breakfast',
      'brunch',
      'restaurant',
      'cafe',
      'pizza',
      'burger',
      'sandwich',
      'food',
      'snack',
      'swiggy',
      'zomato',
      'biryani',
      'dosa',
      'meal',
    ],
  },
  {
    category: 'Groceries',
    words: [
      'grocer',
      'vegetable',
      'milk',
      'bread',
      'fruit',
      'supermarket',
      'kirana',
      'dmart',
      'bigbasket',
      'blinkit',
      'zepto',
    ],
  },
  {
    category: 'Transport',
    words: [
      'cab',
      'taxi',
      'uber',
      'ola',
      'bus',
      'metro',
      'fuel',
      'petrol',
      'diesel',
      'parking',
      'toll',
      'auto',
      'rickshaw',
    ],
  },
  {
    category: 'Shopping',
    words: [
      'clothes',
      'shirt',
      'shoes',
      'amazon',
      'flipkart',
      'shopping',
      'dress',
      'jeans',
    ],
  },
  {
    category: 'Bills & Utilities',
    words: [
      'electricity',
      'internet',
      'wifi',
      'broadband',
      'phone',
      'recharge',
      'water bill',
      'gas bill',
      'bill',
    ],
  },
  { category: 'Rent', words: ['rent', 'landlord'] },
  {
    category: 'Health',
    words: [
      'doctor',
      'medicine',
      'pharmacy',
      'hospital',
      'clinic',
      'dentist',
      'health',
      'medical',
    ],
  },
  {
    category: 'Entertainment',
    words: [
      'movie',
      'cinema',
      'netflix',
      'spotify',
      'concert',
      'game',
      'gaming',
    ],
  },
  {
    category: 'Travel',
    words: ['flight', 'hotel', 'travel', 'trip', 'holiday', 'train', 'airbnb'],
  },
  {
    category: 'Education',
    words: [
      'course',
      'book',
      'school',
      'college',
      'tuition',
      'exam',
      'udemy',
      'coursera',
    ],
  },
  {
    category: 'Investments',
    words: ['mutual fund', 'sip', 'stock', 'invest', 'shares'],
  },
];

function categoryFromKeywords(text: string): string | null {
  const lower = text.toLowerCase();
  for (const { category, words } of CATEGORY_KEYWORDS) {
    if (words.some((word) => lower.includes(word))) return category;
  }
  return null;
}

/**
 * Resolve a category string — from the model, or an older saved label —
 * to one of the canonical expense categories. Unknown values fall back
 * to Others rather than failing the entry.
 */
export function resolveExpenseCategory(
  value: string | null | undefined,
): string {
  if (value === null || value === undefined) return 'Others';
  const trimmed = value.trim();
  if (!trimmed) return 'Others';
  if ((EXPENSE_CATEGORIES as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  const legacy = LEGACY_CATEGORIES[trimmed];
  if (legacy) return legacy;
  const lower = trimmed.toLowerCase();
  const exact = EXPENSE_CATEGORIES.find(
    (category) => category.toLowerCase() === lower,
  );
  if (exact) return exact;
  return categoryFromKeywords(trimmed) ?? 'Others';
}

const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/;
const SLASH_DATE = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
const TIME = /\b\d{1,2}:\d{2}\b/g;
/** An amount with an optional ₹/Rs marker, Indian grouping, and up to two decimals. */
const AMOUNT = /(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d{1,2})?)/gi;

/** The largest amount-like number in the text, or null when there is none. */
function findAmount(text: string): number | null {
  const withoutDates = text.replace(ISO_DATE, ' ').replace(SLASH_DATE, ' ');
  const cleaned = withoutDates.replace(TIME, ' ');
  let largest: number | null = null;
  for (const match of cleaned.matchAll(AMOUNT)) {
    const value = Number((match[1] ?? '').replace(/,/g, ''));
    if (!Number.isFinite(value) || value <= 0 || value > 100000000) continue;
    if (largest === null || value > largest) largest = value;
  }
  return largest;
}

function shiftDate(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + days));
  return date.toISOString().slice(0, 10);
}

function findDate(text: string, today: string): string {
  const iso = text.match(ISO_DATE);
  if (iso) {
    const parsed = new Date(`${iso[0]}T00:00:00Z`);
    // Reject impossible dates (2026-02-30 rolls over instead of failing).
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === iso[0]
    ) {
      return iso[0];
    }
  }
  if (/\byesterday\b/i.test(text)) return shiftDate(today, -1);
  return today;
}

/** A short name for the expense: the text with amounts, dates, and filler words removed. */
function findMerchant(text: string): string | null {
  const cleaned = text
    .replace(ISO_DATE, ' ')
    .replace(SLASH_DATE, ' ')
    .replace(TIME, ' ')
    .replace(/\b(?:yesterday|today)\b/gi, ' ')
    .replace(/(?:₹|rs\.?\s*)?\d[\d,]*(?:\.\d{1,2})?/gi, ' ')
    .replace(/^(?:paid|spent|bought)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+(?:on|for|at)$/i, '')
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '')
    .trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 80);
}

/**
 * Deterministic local extraction: the largest amount in the text, a
 * date (an ISO date in the text, yesterday, or today), a category from
 * keyword hints, and a merchant name. Returns null when no amount can
 * be found — the caller reports that instead of guessing.
 */
export function extractExpenseLocally(
  text: string,
  today: string,
): ExpenseExtraction | null {
  const amount = findAmount(text);
  if (amount === null) return null;
  const parsed = ExpenseExtractionSchema.safeParse({
    amount,
    category: categoryFromKeywords(text) ?? 'Others',
    date: findDate(text, today),
    merchant: findMerchant(text),
  });
  return parsed.success ? parsed.data : null;
}
