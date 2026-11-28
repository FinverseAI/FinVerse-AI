import { Injectable } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { ProfileService } from '../profile/profile.service';
import { MarketService } from '../market/market.service';
import { PortfolioService } from '../market/portfolio.service';
import { normalizeSymbol } from '../market/market.validation';
import { RagRetrievalService } from '../rag/rag.retrieval';
import { ReadinessService } from '../readiness/readiness.service';
import { SCREEN_FILTERS_JSON_SCHEMA } from '../rag/rag.validation';
import type { ToolDefinition } from './ai.provider';
import type { TemplateAnswer } from './ai.guardrail-templates';
import { macd, rsi, sma } from './indicators';
import {
  GetBudgetStatusArgsSchema,
  GetCategorySpendingArgsSchema,
  GetStockFundamentalsArgsSchema,
  GetStockQuoteArgsSchema,
  GetTransactionsArgsSchema,
  SearchKnowledgeArgsSchema,
  firstIssueMessage,
} from './ai.validation';

/**
 * The tools the model may call. Every tool reads from the deterministic
 * layer — the existing services — and returns plain JSON. The model never
 * computes a number itself; it only interprets what the tools return.
 *
 * All tools are owner-scoped: they receive the session userId and never a
 * user id from the model's arguments.
 *
 * Names are camelCase here; the strategy doc (§3.3) names the same tools
 * in snake_case (get_category_spending, get_portfolio_holdings,
 * get_budget_status).
 */

export const AI_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'getPortfolioSummary',
      description:
        'The user\u2019s investment portfolio valued at current prices: holdings, total value, total invested, gains and losses, and sector weights. Holdings whose price cannot be fetched are listed as unavailable and excluded from the totals.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getBudgetStatus',
      description:
        'The user\u2019s monthly budget: income, and for each budget category the budgeted amount, what has been spent so far this month, and what remains. Use it for questions about spending, overspending, and what is left to spend.',
      parameters: {
        type: 'object',
        properties: {
          month: {
            type: 'string',
            description: 'Month as YYYY-MM. Defaults to the current month.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTransactions',
      description:
        'The user\u2019s recorded transactions, most recent first. Filter by category (for example "Food & Dining") and by date range. Amounts are negative for expenses and positive for income.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Transaction category.' },
          startDate: {
            type: 'string',
            description: 'First date, as YYYY-MM-DD.',
          },
          endDate: { type: 'string', description: 'Last date, as YYYY-MM-DD.' },
          limit: {
            type: 'integer',
            description: 'How many to return, 1 to 50. Defaults to 20.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getStockQuote',
      description:
        'The current price of a stock or index, with its previous close and change. Symbols are Yahoo symbols: NSE stocks end in .NS (for example RELIANCE.NS), indices start with ^ (for example ^NSEI for NIFTY 50).',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'The stock symbol.' },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getStockFundamentals',
      description:
        'Everything known about one stock: current price, fundamentals (sector, market cap, P/E, dividend yield, 52-week range) and technicals computed from price history (RSI, moving averages, MACD, one-month change). Use it to explain why a stock moved or how it looks right now.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'The stock symbol.' },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCategorySpending',
      description:
        'How much the user spent in one category over a period: total spent, number of transactions, and the largest transactions. Use it for "why did I overspend on food" questions. Periods: "week" (last 7 days), "month" (this calendar month), "3months" (this month and the previous two).',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description:
              'The category, for example "Food & Dining" or "Transport".',
          },
          period: {
            type: 'string',
            enum: ['week', 'month', '3months'],
            description: 'Defaults to "month".',
          },
        },
        required: ['category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getGoalProgress',
      description:
        'The user\u2019s savings goals: target amount, amount saved so far, progress percentage, and deadline for each goal.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getReadinessScore',
      description:
        'The user\u2019s investment readiness score (0\u2013100) with its five factors — emergency fund, debt-to-income, monthly surplus, portfolio concentration, portfolio volatility — each with its measured number, its points, and what would move the score. The score is computed by code from the profile and the portfolio, never by the model: quote it exactly as returned, never recompute it. Use it for questions about whether the user is ready to invest and what to improve first.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchKnowledge',
      description:
        'Search the indexed knowledge for relevant context: recent news about a stock, company profile text, and the user\u2019s own transaction history. Use it when the question is about news, a stock\u2019s recent events, or past spending. Returns the matching chunks with their source title and date — cite those in the answer. An empty result means no relevant context was found: say so instead of answering from memory.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What to search for, in plain language.',
          },
          symbol: {
            type: 'string',
            description:
              'Optional stock symbol to limit the search to (e.g. RELIANCE.NS).',
          },
        },
        required: ['query'],
      },
    },
  },
];

/**
 * The one-shot NL screener tool (strategy doc §3.1): the model
 * translates a plain-language criterion into the screener's filter
 * object, which is then executed exactly like a manually configured
 * screen. It is NOT part of the chat tool loop — the AI service calls
 * it in a dedicated translation round.
 */
export const APPLY_SCREENER_FILTERS_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'applyScreenerFilters',
    description:
      'Apply screener filters translated from the user\u2019s investment criterion. Call it exactly once with the filters the criterion implies.',
    parameters: SCREEN_FILTERS_JSON_SCHEMA,
  },
};

/** The twelve budget categories, mirroring apps/web/lib/onboarding.ts. */
const BUDGET_CATEGORIES = [
  { id: 'food', label: 'Food & Dining' },
  { id: 'groceries', label: 'Groceries' },
  { id: 'transport', label: 'Transport' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'bills', label: 'Bills & Utilities' },
  { id: 'rent', label: 'Rent' },
  { id: 'health', label: 'Health' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'travel', label: 'Travel' },
  { id: 'education', label: 'Education' },
  { id: 'investments', label: 'Investments' },
  { id: 'others', label: 'Others' },
] as const;

/** Older transaction labels map to budget categories (as in spending-data.ts). */
const CATEGORY_ALIASES: Record<string, string> = {
  Housing: 'Rent',
  Transportation: 'Transport',
  Utilities: 'Bills & Utilities',
  Other: 'Others',
};

/** Map a saved category label to its canonical form. */
function normalizeCategoryLabel(category: string): string {
  return Object.hasOwn(CATEGORY_ALIASES, category)
    ? CATEGORY_ALIASES[category]
    : category;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * IST calendar date (Asia/Calcutta) for a moment, as YYYY-MM-DD.
 * B6: never `toISOString()` for a user-facing day — between 00:00
 * and 05:30 IST that is still yesterday in UTC, so the budget month
 * and "today" would be a day/month behind. Node resolves
 * Asia/Calcutta via ICU; the shell's missing zoneinfo does not apply.
 */
export function istDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Calcutta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** IST calendar month (YYYY-MM) for a moment. */
export function istMonthKey(date: Date): string {
  return istDateKey(date).slice(0, 7);
}

/** YYYY-MM-DD from calendar parts (Date.UTC normalises overflow). */
function dateKeyFromParts(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/**
 * Category matching for the model's (often partial) category names
 * (B16): exact, alias, then prefix/substring either way — "food"
 * finds "Food & Dining", "trans" finds "Transport". Short (1-char)
 * wants match exactly only, so "t" cannot match every category.
 */
function categoryMatches(transactionCategory: string, wanted: string): boolean {
  const label = normalizeCategoryLabel(transactionCategory).toLowerCase();
  const want = normalizeCategoryLabel(wanted).toLowerCase();
  if (label === want) return true;
  const aliased = Object.hasOwn(CATEGORY_ALIASES, transactionCategory)
    ? CATEGORY_ALIASES[transactionCategory]
    : undefined;
  if (aliased !== undefined && aliased.toLowerCase() === want) return true;
  if (want.length < 2) return false;
  return (
    label.startsWith(want) ||
    want.startsWith(label) ||
    label.includes(want) ||
    want.includes(label)
  );
}

function isBudgetSplit(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(
    (entry) => typeof entry === 'number' && Number.isFinite(entry),
  );
}

/**
 * Allocate whole paise across the budget split using largest remainders,
 * exactly as the web's allocateBudget does, so the totals stay exact.
 */
function allocateBudgetPaise(
  incomePaise: number,
  split: Record<string, number>,
): Record<string, number> {
  const rows = BUDGET_CATEGORIES.map(({ id }, index) => {
    const exact = incomePaise * (split[id] ?? 0);
    return {
      id,
      index,
      amount: Math.floor(exact / 100),
      remainder: exact % 100,
    };
  });
  const assigned = Object.values(split).reduce((sum, value) => sum + value, 0);
  const remaining =
    assigned === 100
      ? incomePaise - rows.reduce((sum, row) => sum + row.amount, 0)
      : 0;
  const ranked = [...rows].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  );
  for (let index = 0; index < Math.min(remaining, ranked.length); index++) {
    ranked[index].amount++;
  }
  return Object.fromEntries(rows.map((row) => [row.id, row.amount]));
}

function last<T>(values: (T | null)[]): T | null {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== null && values[i] !== undefined) return values[i];
  }
  return null;
}

@Injectable()
export class AiTools {
  constructor(
    private readonly profile: ProfileService,
    private readonly activity: ActivityService,
    private readonly market: MarketService,
    private readonly portfolio: PortfolioService,
    private readonly retrieval: RagRetrievalService,
    private readonly readiness: ReadinessService,
  ) {}

  async financeAnswer(
    userId: string,
    question: string,
  ): Promise<TemplateAnswer | null> {
    const message = question.trim().replace(/[.?!]+$/, '');
    const goalName = /^how can i reach my savings goal:\s*(.+)$/i.exec(
      message,
    )?.[1];
    const estimate = /^how much can i save next month$/i.test(message);
    const compare = /^compare this month with last month$/i.test(message);
    const category = /^how much did i spend on (.+?)(?: this month)?$/i.exec(
      message,
    )?.[1];
    const overview = /^where did my money go this month$/i.test(message);
    if (!goalName && !estimate && !compare && !category && !overview)
      return null;

    const currency = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const amount = (paise: number) => currency.format(paise / 100);
    const result = (
      text: string,
      tool?: string,
      values: Record<string, string | number> = {},
    ): TemplateAnswer => ({
      answer: text,
      claims: tool ? [{ text, source: { tool, values } }] : [],
    });
    const today = istDateKey(new Date());
    const [year, month, day] = today.split('-').map(Number);

    if (goalName) {
      const progress = await this.goalProgress(userId);
      const goal = progress.goals.find(
        ({ name }) => name.toLowerCase() === goalName.toLowerCase(),
      );
      if (!goal)
        return result('This savings goal could not be found in your account.');
      const remaining = Math.max(0, Math.round(goal.remaining * 100));
      if (!remaining)
        return result(
          `You’ve already reached your ${goal.name} savings target.`,
          'getGoalProgress',
          { name: goal.name, remaining: 0 },
        );
      const days = (Date.parse(goal.targetDate) - Date.parse(today)) / 86400000;
      const months = Math.max(1, Math.ceil(days / (365.25 / 12)));
      const pace = Math.ceil(remaining / months);
      return result(
        days <= 0
          ? `${goal.name} still needs ${amount(remaining)}. Its target date is ${goal.targetDate}.`
          : `${goal.name} needs another ${amount(remaining)} by ${goal.targetDate}. With equal contributions, the estimated pace is ${amount(pace)} a month for ${months} month${months === 1 ? '' : 's'}.`,
        'getGoalProgress',
        {
          name: goal.name,
          remaining: remaining / 100,
          targetDate: goal.targetDate,
          ...(days > 0 ? { monthlyContribution: pace / 100, months } : {}),
        },
      );
    }

    if (estimate) {
      const { profile } = await this.profile.get(userId);
      if (!profile)
        return result(
          'Set up your monthly income and expenses to estimate how much you could save.',
        );
      const income =
        Math.round(Number(profile.monthly_income) * 100) +
        Math.round(Number(profile.other_monthly_income ?? 0) * 100);
      const expenses =
        Math.round(Number(profile.fixed_expenses) * 100) +
        Math.round(Number(profile.variable_expenses) * 100);
      const net = income - expenses;
      return result(
        net >= 0
          ? `Your current plan leaves ${amount(net)} each month before contributions to goals. This is a planning estimate for next month.`
          : `Your planned expenses exceed planned income by ${amount(-net)} a month, so the current plan shows no room for savings.`,
        'getBudgetStatus',
        {
          plannedIncome: income / 100,
          plannedExpenses: expenses / 100,
          plannedNet: net / 100,
        },
      );
    }

    const transactions = await this.activity.transactions(userId);
    const monthStart = `${today.slice(0, 7)}-01`;
    const expenses = transactions.filter(
      (item) =>
        item.amount < 0 && item.date >= monthStart && item.date <= today,
    );
    const sum = (items: typeof expenses) =>
      items.reduce((total, item) => total + Math.round(-item.amount * 100), 0);
    const current = sum(expenses);
    if (compare) {
      const lastStart = dateKeyFromParts(year, month - 1, 1);
      const lastEnd = dateKeyFromParts(
        year,
        month - 1,
        Math.min(day, new Date(Date.UTC(year, month - 1, 0)).getUTCDate()),
      );
      const prior = transactions.filter(
        (item) =>
          item.amount < 0 && item.date >= lastStart && item.date <= lastEnd,
      );
      if (!expenses.length && !prior.length)
        return result(
          'There are no recorded expenses to compare across these two periods.',
        );
      const previous = sum(prior);
      const difference = current - previous;
      return result(
        `Recorded expenses total ${amount(current)} this month so far and ${amount(previous)} over the same part of last month. ${difference === 0 ? 'The totals are the same.' : `That is ${amount(Math.abs(difference))} ${difference > 0 ? 'more' : 'less'} this month.`}`,
        'getTransactions',
        {
          currentExpenses: current / 100,
          previousExpenses: previous / 100,
          difference: difference / 100,
          endDate: today,
          priorEndDate: lastEnd,
        },
      );
    }

    if (!expenses.length)
      return result('There are no recorded expenses for this month yet.');
    if (category) {
      const food = category.toLowerCase() === 'food';
      const matches = expenses.filter(
        (item) =>
          categoryMatches(item.category, category) ||
          (food && normalizeCategoryLabel(item.category) === 'Groceries'),
      );
      if (!matches.length)
        return result(
          `There are no recorded expenses for “${category}” this month.`,
        );
      const spent = sum(matches);
      return result(
        `You recorded ${amount(spent)} in ${category} expenses this month.`,
        'getCategorySpending',
        {
          category,
          totalSpent: spent / 100,
          count: matches.length,
          endDate: today,
        },
      );
    }

    const totals = new Map<string, number>();
    for (const item of expenses) {
      const label = normalizeCategoryLabel(item.category);
      totals.set(
        label,
        (totals.get(label) ?? 0) + Math.round(-item.amount * 100),
      );
    }
    const [name, spent] = [...totals].sort((a, b) => b[1] - a[1])[0];
    return result(
      `You recorded ${amount(current)} in expenses this month. Your largest category was ${name}, at ${amount(spent)}.`,
      'getTransactions',
      {
        totalSpent: current / 100,
        category: name,
        topCategorySpent: spent / 100,
        endDate: today,
      },
    );
  }

  /** Run one tool call from the model. Throws on unknown tools and bad args. */
  async execute(userId: string, name: string, args: unknown): Promise<unknown> {
    switch (name) {
      case 'getPortfolioSummary':
        return this.portfolio.portfolioSummary(userId);
      case 'getBudgetStatus':
        return this.budgetStatus(userId, args);
      case 'getTransactions':
        return this.transactions(userId, args);
      case 'searchKnowledge':
        return this.searchKnowledge(userId, args);
      case 'getStockQuote': {
        const parsed = GetStockQuoteArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(firstIssueMessage(parsed.error));
        }
        return this.market.quote(normalizeSymbol(parsed.data.symbol));
      }
      case 'getStockFundamentals': {
        const parsed = GetStockFundamentalsArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(firstIssueMessage(parsed.error));
        }
        return this.stockFundamentals(normalizeSymbol(parsed.data.symbol));
      }
      case 'getCategorySpending':
        return this.categorySpending(userId, args);
      case 'getGoalProgress':
        return this.goalProgress(userId);
      case 'getReadinessScore':
        return this.readiness.assess(userId);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async searchKnowledge(userId: string, args: unknown) {
    const parsed = SearchKnowledgeArgsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(firstIssueMessage(parsed.error));
    }
    const symbol = parsed.data.symbol
      ? normalizeSymbol(parsed.data.symbol)
      : undefined;
    const result = await this.retrieval.retrieve(userId, parsed.data.query, {
      symbol,
    });
    if (!result.available) {
      return { available: false, reason: result.reason, chunks: [] };
    }
    return {
      available: true,
      chunks: result.chunks.map((chunk) => ({
        sourceType: chunk.source_type,
        title: chunk.title,
        symbol: chunk.symbol,
        publishedAt: chunk.published_at
          ? chunk.published_at.toISOString().slice(0, 10)
          : null,
        url: chunk.url,
        similarity: Math.round(chunk.similarity * 100) / 100,
        content:
          chunk.content.length > 600
            ? `${chunk.content.slice(0, 600)}\u2026`
            : chunk.content,
      })),
    };
  }

  private async budgetStatus(userId: string, args: unknown) {
    const parsed = GetBudgetStatusArgsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(firstIssueMessage(parsed.error));
    }
    const month = parsed.data.month ?? istMonthKey(new Date());
    const data = await this.profile.get(userId);
    if (!data.profile || !isBudgetSplit(data.profile.budget_split)) {
      return {
        available: false,
        month,
        reason: 'No financial profile or budget has been set up yet.',
      };
    }
    const incomePaise = Math.round(Number(data.profile.monthly_income) * 100);
    const allocated = allocateBudgetPaise(
      incomePaise,
      data.profile.budget_split,
    );
    const transactions = await this.activity.transactions(userId);
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;
    const spentPaise = new Map<string, number>();
    for (const transaction of transactions) {
      if (
        transaction.amount >= 0 ||
        transaction.date < monthStart ||
        transaction.date > monthEnd
      ) {
        continue;
      }
      const label = normalizeCategoryLabel(transaction.category);
      spentPaise.set(
        label,
        (spentPaise.get(label) ?? 0) + Math.round(-transaction.amount * 100),
      );
    }
    // B2: a category with a zero budget but real spend is a row, not
    // a hole — flagged unbudgeted, counted in the totals. Spend under
    // a label outside the twelve categories is reported separately
    // (unbudgetedSpent) so totalSpent still reconciles with the ledger.
    const knownLabels: Set<string> = new Set(
      BUDGET_CATEGORIES.map(({ label }) => label),
    );
    const categories = BUDGET_CATEGORIES.filter(
      ({ id, label }) =>
        (allocated[id] ?? 0) > 0 || (spentPaise.get(label) ?? 0) > 0,
    ).map(({ id, label }) => {
      const budgeted = allocated[id] ?? 0;
      const spent = spentPaise.get(label) ?? 0;
      return {
        name: label,
        budgeted: budgeted / 100,
        spent: spent / 100,
        remaining: (budgeted - spent) / 100,
        overBudget: spent > budgeted,
        ...(budgeted === 0 ? { unbudgeted: true } : {}),
      };
    });
    const unbudgetedSpentPaise = [...spentPaise]
      .filter(([label]) => !knownLabels.has(label))
      .reduce((sum, [, paise]) => sum + paise, 0);
    const totalBudgeted = categories.reduce(
      (sum, category) => sum + Math.round(category.budgeted * 100),
      0,
    );
    const totalSpent =
      categories.reduce(
        (sum, category) => sum + Math.round(category.spent * 100),
        0,
      ) + unbudgetedSpentPaise;
    return {
      available: true,
      month,
      monthlyIncome: incomePaise / 100,
      categories,
      totalBudgeted: totalBudgeted / 100,
      totalSpent: totalSpent / 100,
      totalRemaining: (totalBudgeted - totalSpent) / 100,
      unbudgetedSpent: unbudgetedSpentPaise / 100,
    };
  }

  private async transactions(userId: string, args: unknown) {
    const parsed = GetTransactionsArgsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(firstIssueMessage(parsed.error));
    }
    const { category, startDate, endDate } = parsed.data;
    const limit = parsed.data.limit ?? 20;
    const all = await this.activity.transactions(userId);
    const filtered = all
      .filter((transaction) => {
        if (category && !categoryMatches(transaction.category, category)) {
          return false;
        }
        if (startDate && transaction.date < startDate) return false;
        if (endDate && transaction.date > endDate) return false;
        return true;
      })
      // Most recent first, regardless of the service's ordering.
      .sort((a, b) => b.date.localeCompare(a.date));
    return {
      count: filtered.length,
      returned: Math.min(limit, filtered.length),
      transactions: filtered.slice(0, limit).map((transaction) => ({
        name: transaction.name,
        amount: transaction.amount,
        category: transaction.category,
        date: transaction.date,
      })),
    };
  }

  private async categorySpending(userId: string, args: unknown) {
    const parsed = GetCategorySpendingArgsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(firstIssueMessage(parsed.error));
    }
    const category = parsed.data.category;
    const period = parsed.data.period ?? 'month';
    // B6: "today" and the period start are IST calendar dates, never
    // UTC — toISOString() is yesterday until 05:30 IST.
    const todayKey = istDateKey(new Date());
    const [year, month, day] = todayKey.split('-').map(Number) as [
      number,
      number,
      number,
    ];
    let start: string;
    if (period === 'week') {
      start = dateKeyFromParts(year, month, day - 6);
    } else if (period === '3months') {
      start = dateKeyFromParts(year, month - 2, 1);
    } else {
      start = dateKeyFromParts(year, month, 1);
    }
    const allTransactions = await this.activity.transactions(userId);
    // B16: when nothing the user ever recorded matches the category
    // at all, say so — a confident zero would be invented data.
    if (
      !allTransactions.some((transaction) =>
        categoryMatches(transaction.category, category),
      )
    ) {
      return {
        available: false,
        category,
        period,
        reason: `No such category "${category}" was found in the user's transactions.`,
      };
    }
    const transactions = allTransactions.filter(
      (transaction) =>
        transaction.amount < 0 &&
        transaction.date >= start &&
        transaction.date <= todayKey &&
        categoryMatches(transaction.category, category),
    );
    const totalPaise = transactions.reduce(
      (sum, transaction) => sum + Math.round(-transaction.amount * 100),
      0,
    );
    const largest = [...transactions]
      .sort((a, b) => a.amount - b.amount)
      .slice(0, 5)
      .map((transaction) => ({
        name: transaction.name,
        amount: -transaction.amount,
        date: transaction.date,
      }));
    return {
      available: true,
      category,
      period,
      startDate: start,
      endDate: todayKey,
      totalSpent: totalPaise / 100,
      count: transactions.length,
      largest,
    };
  }

  private async goalProgress(userId: string) {
    const data = await this.profile.get(userId);
    const goals = data.goals.map((goal) => {
      const target = Number(goal.target_amount);
      const saved = Number(goal.saved_amount);
      return {
        name: goal.name,
        target,
        saved,
        remaining: round2(target - saved),
        progressPercent: target > 0 ? round2((saved / target) * 100) : 0,
        targetDate: goal.target_date,
        priority: goal.priority,
      };
    });
    const totalTarget = goals.reduce(
      (sum, goal) => sum + Math.round(goal.target * 100),
      0,
    );
    const totalSaved = goals.reduce(
      (sum, goal) => sum + Math.round(goal.saved * 100),
      0,
    );
    return {
      goals,
      totalTarget: totalTarget / 100,
      totalSaved: totalSaved / 100,
    };
  }

  private async stockFundamentals(symbol: string) {
    const profile = await this.market.profile(symbol);
    const history = await this.market.history(symbol, '3mo');
    const closes = history.bars.map((bar) => bar.close);
    const rsiValues = closes.length > 1 ? rsi(closes) : [];
    const sma20Values = closes.length > 1 ? sma(closes, 20) : [];
    const sma50Values = closes.length > 1 ? sma(closes, 50) : [];
    const macdValues = closes.length > 1 ? macd(closes) : [];
    const latestRsi = last(rsiValues);
    const latestSma20 = last(sma20Values);
    const latestSma50 = last(sma50Values);
    const latestMacd = last(macdValues);
    const first = closes[0];
    const latest = closes[closes.length - 1];
    const monthAgo =
      closes.length > 21 ? closes[closes.length - 22] : closes[0];
    const notes: string[] = [];
    if (closes.length < 15) {
      notes.push('Not enough price history for reliable indicators.');
    }
    if (history.stale) {
      notes.push(
        'The price history may be out of date (live data was unavailable).',
      );
    }
    return {
      ...profile,
      technicals: {
        barsUsed: closes.length,
        rsi14: latestRsi === null ? null : round2(latestRsi),
        sma20: latestSma20 === null ? null : round2(latestSma20),
        sma50: latestSma50 === null ? null : round2(latestSma50),
        macd:
          latestMacd === null
            ? null
            : {
                macd: round2(latestMacd.macd),
                signal: round2(latestMacd.signal),
                histogram: round2(latestMacd.histogram),
              },
        change1moPercent:
          // B7: with fewer than 22 closes there is no 1-month-ago bar
          // — the old fallback (closes[0]) labelled the whole
          // available history as "1 month". Null, like the screener.
          closes.length >= 22 && monthAgo && latest && monthAgo !== 0
            ? round2(((latest - monthAgo) / monthAgo) * 100)
            : null,
        change3moPercent:
          first && latest && first !== 0
            ? round2(((latest - first) / first) * 100)
            : null,
        note: notes.length > 0 ? notes.join(' ') : null,
      },
    };
  }
}
