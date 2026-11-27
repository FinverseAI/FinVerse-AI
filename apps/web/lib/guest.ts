// TEMPORARY dev-only guest login bypass — remove before shipping.
//
// When GUEST_LOGIN_ENABLED=true, a visitor can continue as a guest and
// browse the dashboard with the demo fixtures below instead of signing
// in with Google. The gate is checked at EVERY trust point (the auth
// guard, getServerProfile, and each fixture-serving API route), so
// unsetting the variable — or never setting it — makes guest mode
// impossible even if the cookie is present or the button is clicked.
// The demo data is static, plausible Indian ₹ sample data; nothing is
// persisted and every mutation in guest mode is refused as read-only.
import "server-only";

import { cookies } from "next/headers";
import type { AuthUser } from "../auth/types";
import type { ProfileResponse } from "./profile";
import type {
  FiredAlert,
  HistoryResponse,
  Holding,
  MarketProfile,
  MarketQuote,
  OverviewResponse,
  PortfolioSummary,
  SearchResult,
  ValuedHolding,
  WatchlistItem,
} from "./market";
import type { AiChatResponse, AiStatus } from "./ai";
import type { NewsResponse, ScreenResponse, ScreenedStock } from "./rag";
import type {
  FilingCategoryBlock,
  FilingCategoryStatus,
  FilingsResponse,
} from "./filings";
import type { ReadinessAssessment } from "./readiness";
import { rsi, sma } from "./indicators";
import type { Transaction } from "../app/(module-one)/dashboard/data";
import type { Bill } from "../app/(module-one)/dashboard/upcoming-bills";

export const GUEST_COOKIE_NAME = "finverse-guest";

// Fixed cookie value. It is not a credential: the cookie is only
// trusted when GUEST_LOGIN_ENABLED=true, so the value alone grants
// nothing on a server where the gate is off.
const GUEST_COOKIE_VALUE = "guest-demo";

export const GUEST_USER: AuthUser = {
  name: "Guest (demo)",
  email: "guest@finverse.demo",
  image: null,
};

/** The env gate. Default OFF: unset or anything other than "true" disables guest mode. */
export function isGuestLoginEnabled(): boolean {
  return process.env.GUEST_LOGIN_ENABLED === "true";
}

function hasGuestCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader
    .split(";")
    .some(
      (part) => part.trim() === `${GUEST_COOKIE_NAME}=${GUEST_COOKIE_VALUE}`,
    );
}

/** Guest check for API route handlers, from the incoming request's cookies. */
export function isGuestRequest(request: Request): boolean {
  return isGuestLoginEnabled() && hasGuestCookie(request.headers.get("cookie"));
}

/** Guest check for server components / server functions, from next/headers. */
export async function getGuestSession(): Promise<AuthUser | null> {
  if (!isGuestLoginEnabled()) return null;
  const store = await cookies();
  return store.get(GUEST_COOKIE_NAME)?.value === GUEST_COOKIE_VALUE
    ? GUEST_USER
    : null;
}

/** Sets the guest cookie. Call only after checking isGuestLoginEnabled(). */
export async function setGuestCookie(): Promise<void> {
  const store = await cookies();
  store.set(GUEST_COOKIE_NAME, GUEST_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
}

/** Clears the guest cookie (guest sign-out). */
export async function clearGuestCookie(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_COOKIE_NAME);
}

/** JSON response for a guest fixture, never cached. */
export function guestJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

/**
 * Guest mode is read-only: demo data is static and nothing is saved,
 * so every mutation is refused instead of forwarded to the backend.
 */
export function guestReadOnly(): Response {
  return guestJson(
    {
      message: "Guest demo is read-only. Sign in with Google to make changes.",
    },
    // TEMPORARY dev-only guest demo — remove before shipping. A
    // refused mutation is a permissions failure (403), not a service
    // outage (503): the demo is working, the guest just may not write.
    403,
  );
}

// ---------------------------------------------------------------------------
// Demo fixtures. Dates are computed relative to today so the dashboard
// always shows a populated current month; amounts are chosen so the
// month sums sensibly against the demo profile below (income ₹90,000,
// planned expenses ₹72,250, savings target ₹12,750, plan surplus
// ₹5,000; demo month expenses ₹62,143, net ₹27,857) and every
// category stays inside its budget limit.
// ---------------------------------------------------------------------------

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function daysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

/** The given day-of-month in the current month (clamped to month length). */
function dayThisMonth(day: number): string {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return isoDate(
    new Date(now.getFullYear(), now.getMonth(), Math.min(day, lastDay)),
  );
}

/** The given day-of-month `monthsBack` months ago. */
function dayMonthsAgo(monthsBack: number, day: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  return isoDate(
    new Date(target.getFullYear(), target.getMonth(), Math.min(day, lastDay)),
  );
}

export function guestProfileResponse(): ProfileResponse {
  return {
    profile: {
      payday: 1,
      // Sums to 100. Limits on ₹85,000 income: rent ₹21,250, groceries
      // ₹12,750, food ₹5,950, transport ₹5,950, bills ₹5,100, health
      // ₹3,400, entertainment ₹3,400, shopping ₹4,250, education
      // ₹4,250, travel ₹2,550, investments ₹12,750, others ₹3,400.
      budget_split: {
        rent: 25,
        groceries: 15,
        food: 7,
        transport: 7,
        bills: 6,
        health: 4,
        entertainment: 4,
        shopping: 5,
        education: 5,
        travel: 3,
        investments: 15,
        others: 4,
      },
      employment_type: "salaried",
      monthly_income: "85000.00",
      other_monthly_income: "5000.00",
      // Fixed = rent + bills limits (21,250 + 5,100); variable = the
      // rest after fixed and the investments (savings) slice.
      fixed_expenses: "26350.00",
      variable_expenses: "45900.00",
      existing_debt_total: "0.00",
      current_savings: "150000.00",
      monthly_savings_target: "12750.00",
      investment_experience: "beginner",
      risk_tolerance: "medium",
      already_investing: true,
      // Matches the demo holdings' invested total in
      // guestHoldings()/guestPortfolioSummary() (₹1,29,700), so the
      // onboarding figure agrees with the portfolio the demo shows.
      invested_amount: "129700.00",
      emergency_fund_months: "3-6",
      created_at: "2026-11-01T00:00:00.000Z",
      updated_at: "2026-11-01T00:00:00.000Z",
    },
    goals: [
      {
        id: "guest-goal-emergency",
        name: "Emergency fund",
        target_amount: "300000.00",
        target_date: "2027-06-30",
        priority: "high",
        // Matches the three ₹50,000 contributions below.
        saved_amount: "150000.00",
      },
      {
        id: "guest-goal-goa",
        name: "Goa trip",
        target_amount: "60000.00",
        target_date: "2027-03-31",
        priority: "medium",
        // Matches the two ₹12,000 contributions below.
        saved_amount: "24000.00",
      },
      {
        id: "guest-goal-laptop",
        name: "New laptop",
        target_amount: "90000.00",
        target_date: "2027-09-30",
        priority: "low",
        // Matches the single ₹15,000 contribution below.
        saved_amount: "15000.00",
      },
    ],
    onboarding_completed: true,
  };
}

export function guestTransactions(): Transaction[] {
  const current: Transaction[] = [
    {
      id: "guest-tx-salary",
      name: "Salary – Acme Technologies",
      category: "Income",
      amount: 85000,
      date: dayThisMonth(1),
    },
    {
      id: "guest-tx-gym",
      name: "Gym membership",
      category: "Health",
      amount: -1500,
      date: dayThisMonth(1),
    },
    {
      id: "guest-tx-rent",
      name: "House rent",
      category: "Rent",
      amount: -18000,
      date: dayThisMonth(2),
    },
    {
      id: "guest-tx-metro",
      name: "Metro card recharge",
      category: "Transport",
      amount: -500,
      date: dayThisMonth(3),
    },
    {
      id: "guest-tx-bigbasket",
      name: "BigBasket groceries",
      category: "Groceries",
      amount: -3240,
      date: dayThisMonth(4),
    },
    {
      id: "guest-tx-sip",
      name: "SIP – index fund",
      category: "Investments",
      amount: -10000,
      date: dayThisMonth(5),
    },
    {
      id: "guest-tx-electricity",
      name: "Electricity bill – BSES",
      category: "Bills & Utilities",
      amount: -1850,
      date: dayThisMonth(5),
    },
    {
      id: "guest-tx-broadband",
      name: "Broadband – JioFiber",
      category: "Bills & Utilities",
      amount: -999,
      date: dayThisMonth(6),
    },
    {
      id: "guest-tx-mobile",
      name: "Mobile recharge",
      category: "Bills & Utilities",
      amount: -299,
      date: dayThisMonth(7),
    },
    {
      id: "guest-tx-swiggy",
      name: "Swiggy",
      category: "Food & Dining",
      amount: -640,
      date: dayThisMonth(8),
    },
    {
      id: "guest-tx-gifts",
      name: "Gifts for family",
      category: "Shopping",
      amount: -750,
      date: dayThisMonth(8),
    },
    {
      id: "guest-tx-amazon",
      name: "Amazon order",
      category: "Shopping",
      amount: -2499,
      date: dayThisMonth(9),
    },
    {
      id: "guest-tx-freelance",
      name: "Freelance design work",
      category: "Income",
      amount: 5000,
      date: dayThisMonth(10),
    },
    {
      id: "guest-tx-cleaning",
      name: "Home cleaning",
      category: "Others",
      amount: -2000,
      date: dayThisMonth(10),
    },
    {
      id: "guest-tx-dmart",
      name: "DMart groceries",
      category: "Groceries",
      amount: -2860,
      date: dayThisMonth(11),
    },
    {
      id: "guest-tx-uber",
      name: "Uber",
      category: "Transport",
      amount: -860,
      date: dayThisMonth(12),
    },
    {
      id: "guest-tx-pharmacy",
      name: "Pharmacy",
      category: "Health",
      amount: -780,
      date: dayThisMonth(13),
    },
    {
      id: "guest-tx-zomato",
      name: "Zomato",
      category: "Food & Dining",
      amount: -820,
      date: dayThisMonth(14),
    },
    {
      id: "guest-tx-netflix",
      name: "Netflix",
      category: "Entertainment",
      amount: -649,
      date: dayThisMonth(15),
    },
    {
      id: "guest-tx-udemy",
      name: "Udemy course",
      category: "Education",
      amount: -1499,
      date: dayThisMonth(15),
    },
    {
      id: "guest-tx-petrol",
      name: "Petrol",
      category: "Transport",
      amount: -1500,
      date: dayThisMonth(16),
    },
    {
      id: "guest-tx-spotify",
      name: "Spotify",
      category: "Entertainment",
      amount: -119,
      date: dayThisMonth(17),
    },
    {
      id: "guest-tx-blinkit",
      name: "Blinkit groceries",
      category: "Groceries",
      amount: -1240,
      date: dayThisMonth(18),
    },
    {
      id: "guest-tx-decathlon",
      name: "Decathlon – running shoes",
      category: "Shopping",
      amount: -999,
      date: dayThisMonth(19),
    },
    {
      id: "guest-tx-irctc",
      name: "IRCTC train tickets",
      category: "Travel",
      amount: -1240,
      date: dayThisMonth(20),
    },
    {
      id: "guest-tx-cafe",
      name: "Café Aaram",
      category: "Food & Dining",
      amount: -450,
      date: dayThisMonth(21),
    },
    {
      id: "guest-tx-bookmyshow",
      name: "BookMyShow",
      category: "Entertainment",
      amount: -700,
      date: dayThisMonth(22),
    },
    {
      id: "guest-tx-car",
      name: "Car service",
      category: "Transport",
      amount: -2800,
      date: dayThisMonth(23),
    },
    {
      id: "guest-tx-stationery",
      name: "Stationery & household",
      category: "Others",
      amount: -850,
      date: dayThisMonth(24),
    },
    {
      id: "guest-tx-water",
      name: "Water bill",
      category: "Bills & Utilities",
      amount: -450,
      date: dayThisMonth(25),
    },
    {
      id: "guest-tx-dinner",
      name: "Dinner with friends",
      category: "Food & Dining",
      amount: -950,
      date: dayThisMonth(26),
    },
    {
      id: "guest-tx-vegetables",
      name: "Fresh vegetables – local market",
      category: "Groceries",
      amount: -1100,
      date: dayThisMonth(26),
    },
  ];
  const previous: Transaction[] = [
    {
      id: "guest-tx-prev-salary",
      name: "Salary – Acme Technologies",
      category: "Income",
      amount: 85000,
      date: dayMonthsAgo(1, 1),
    },
    {
      id: "guest-tx-prev-gym",
      name: "Gym membership",
      category: "Health",
      amount: -1500,
      date: dayMonthsAgo(1, 1),
    },
    {
      id: "guest-tx-prev-rent",
      name: "House rent",
      category: "Rent",
      amount: -18000,
      date: dayMonthsAgo(1, 2),
    },
    {
      id: "guest-tx-prev-metro",
      name: "Metro card recharge",
      category: "Transport",
      amount: -1200,
      date: dayMonthsAgo(1, 3),
    },
    {
      id: "guest-tx-prev-sip",
      name: "SIP – index fund",
      category: "Investments",
      amount: -10000,
      date: dayMonthsAgo(1, 5),
    },
    {
      id: "guest-tx-prev-bigbasket",
      name: "BigBasket groceries",
      category: "Groceries",
      amount: -3400,
      date: dayMonthsAgo(1, 6),
    },
    {
      id: "guest-tx-prev-broadband",
      name: "Broadband – JioFiber",
      category: "Bills & Utilities",
      amount: -999,
      date: dayMonthsAgo(1, 6),
    },
    {
      id: "guest-tx-prev-electricity",
      name: "Electricity bill – BSES",
      category: "Bills & Utilities",
      amount: -1780,
      date: dayMonthsAgo(1, 7),
    },
    {
      id: "guest-tx-prev-freelance",
      name: "Freelance design work",
      category: "Income",
      amount: 4000,
      date: dayMonthsAgo(1, 12),
    },
    {
      id: "guest-tx-prev-food",
      name: "Swiggy & Zomato",
      category: "Food & Dining",
      amount: -1900,
      date: dayMonthsAgo(1, 14),
    },
    {
      id: "guest-tx-prev-dmart",
      name: "DMart groceries",
      category: "Groceries",
      amount: -2900,
      date: dayMonthsAgo(1, 15),
    },
    {
      id: "guest-tx-prev-amazon",
      name: "Amazon order",
      category: "Shopping",
      amount: -2600,
      date: dayMonthsAgo(1, 21),
    },
  ];
  // Newest first, matching the backend's ordering.
  return [...current, ...previous].sort((a, b) => b.date.localeCompare(a.date));
}

export function guestBills(): Bill[] {
  return [
    {
      id: "guest-bill-electricity",
      name: "Electricity – BSES",
      amount: 1850,
      dueDate: daysFromToday(-2),
      autoPay: false,
      recurrence: "monthly",
      paidTotal: 0,
    },
    {
      id: "guest-bill-broadband",
      name: "Broadband – JioFiber",
      amount: 999,
      dueDate: daysFromToday(1),
      autoPay: true,
      recurrence: "monthly",
      paidTotal: 0,
    },
    {
      id: "guest-bill-rent",
      name: "House rent",
      amount: 18000,
      dueDate: daysFromToday(5),
      autoPay: true,
      recurrence: "monthly",
      paidTotal: 0,
    },
    {
      id: "guest-bill-credit-card",
      name: "Credit card – HDFC",
      amount: 12450,
      dueDate: daysFromToday(8),
      autoPay: false,
      recurrence: null,
      paidTotal: 0,
    },
    {
      id: "guest-bill-gym",
      name: "Gym membership",
      amount: 1500,
      dueDate: daysFromToday(-7),
      autoPay: false,
      recurrence: "monthly",
      paidTotal: 1500,
      payments: [
        {
          id: "guest-pay-gym",
          amount: 1500,
          paidDate: daysFromToday(-7),
        },
      ],
    },
    {
      id: "guest-bill-netflix",
      name: "Netflix",
      amount: 649,
      dueDate: daysFromToday(-12),
      autoPay: true,
      recurrence: "monthly",
      paidTotal: 649,
      payments: [
        {
          id: "guest-pay-netflix",
          amount: 649,
          paidDate: daysFromToday(-12),
        },
      ],
    },
  ];
}

/** The recorded payments of one demo bill (empty when the bill is unpaid). */
export function guestBillPayments(billId: string) {
  return guestBills().find((bill) => bill.id === billId)?.payments ?? [];
}

/** No fired price alerts in the demo: the market watchlist is empty. */
export function guestAlerts(): FiredAlert[] {
  return [];
}

// TEMPORARY dev-only guest demo — remove before shipping.
//
// Demo readiness assessment, scored with the backend's own formula
// (apps/backend/src/readiness/readiness.formula.ts, inputs gathered
// the way apps/backend/src/readiness/readiness.service.ts gathers
// them) from the demo profile above and the demo holdings below:
// income ₹90,000 (₹85,000 + ₹5,000 other), expenses ₹72,250
// (₹26,350 fixed + ₹45,900 variable), surplus ₹17,750 (19.7%), no
// debt, emergency-fund band "3-6" (4.5 months), and the 4 priced
// guest holdings (₹1,39,194.50 value on ₹1,29,700 invested). The
// concentration and volatility factors are computed from those same
// fixtures — largest holding HDFC Bank 28.5%, value-weighted
// annualized volatility from each holding's 3-month demo history —
// so the score can never drift from the portfolio the demo shows.
// Emergency 18.8 + debt 20 + surplus 16.4 + concentration 13.4 +
// volatility 15 = 83.6 of 100 available, score 84 ("Ready"). The
// client validates this with isReadinessResult before rendering, so
// the shape must stay exact.

/** 1-decimal rounding, as the backend formula rounds factor points. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Annualized volatility from daily closes (backend formula:
 * stddev of daily log returns × √252). Null when there is too
 * little history (fewer than 30 closes) or the data is unusable —
 * never a made-up number.
 */
function guestAnnualizedVolatility(closes: number[]): number | null {
  if (closes.length < 30) return null;
  if (closes.some((close) => !Number.isFinite(close) || close <= 0)) {
    return null;
  }
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i]! / closes[i - 1]!));
  }
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

const guestInr0 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function guestReadiness(): ReadinessAssessment {
  // Cash-flow inputs from the demo profile above.
  const monthlyIncome = 90000;
  const monthlyExpenses = 26350 + 45900;
  const monthlySurplus = monthlyIncome - monthlyExpenses;
  const surplusRatePercent = round1((monthlySurplus / monthlyIncome) * 100);
  const totalDebt = 0;
  const annualIncome = monthlyIncome * 12;

  // Portfolio inputs from the same fixtures the market desk shows.
  const summary = guestPortfolioSummary();
  const priced = summary.holdings.filter(
    (holding) => holding.priced && holding.currentValue !== null,
  );
  const totalPortfolioValue = summary.totals.totalValue;
  const largest =
    priced.length > 0 && totalPortfolioValue > 0
      ? priced.reduce((a, b) =>
          (b.currentValue ?? 0) > (a.currentValue ?? 0) ? b : a,
        )
      : null;
  const largestWeight =
    largest === null
      ? null
      : (largest.currentValue ?? 0) / totalPortfolioValue;
  const largestWeightPercent =
    largestWeight === null ? null : round1(largestWeight * 100);

  // Volatility the backend way: 3 months of daily closes per priced
  // holding, value-weighted across the holdings with history.
  const holdingVolatilities: { symbol: string; volatility: number; currentValue: number }[] =
    [];
  for (const holding of priced) {
    const volatility = guestAnnualizedVolatility(
      guestMarketHistory(holding.symbol, "3mo").bars.map((bar) => bar.close),
    );
    if (volatility === null || holding.currentValue === null) continue;
    holdingVolatilities.push({
      symbol: holding.symbol,
      volatility,
      currentValue: holding.currentValue,
    });
  }
  const volatilityValue = holdingVolatilities.reduce(
    (sum, holding) => sum + holding.currentValue,
    0,
  );
  const weightedVolatility =
    holdingVolatilities.length > 0 && volatilityValue > 0
      ? holdingVolatilities.reduce(
          (sum, holding) => sum + holding.volatility * holding.currentValue,
          0,
        ) / volatilityValue
      : null;
  const volatilityPercent =
    weightedVolatility === null ? null : round1(weightedVolatility * 100);

  // The five factors, each scored linearly between its full-marks and
  // zero points exactly as the backend formula scores them.
  const factors: ReadinessAssessment["factors"] = [
    {
      name: "Emergency fund",
      metric: "emergencyFundMonths",
      points: round1(25 * Math.min(4.5 / 6, 1)),
      maxPoints: 25,
      available: true,
      detail:
        "Your emergency fund covers 3-6 months of expenses (6+ months is full marks).",
      months: 4.5,
      monthsLabel: "3-6 months",
    },
    {
      name: "Debt-to-income",
      metric: "debtToIncomeRatio",
      points: round1(20 * clamp01(1 - totalDebt / annualIncome / 1)),
      maxPoints: 20,
      available: true,
      detail: "You carry no debt.",
      debtToIncomeRatio: round2(totalDebt / annualIncome),
      totalDebt,
      annualIncome,
    },
    {
      name: "Monthly surplus",
      metric: "surplusRatePercent",
      points: round1(25 * clamp01(monthlySurplus / monthlyIncome / 0.3)),
      maxPoints: 25,
      available: true,
      detail: `Monthly surplus of ${guestInr0.format(monthlySurplus)} is ${surplusRatePercent}% of income (30% is full marks).`,
      surplus: monthlySurplus,
      surplusRatePercent,
      monthlyIncome,
    },
    largest === null || largestWeight === null || largestWeightPercent === null
      ? {
          name: "Portfolio concentration",
          metric: "largestHoldingWeightPercent",
          points: 0,
          maxPoints: 15,
          available: false,
          detail: "No priced holdings, so concentration cannot be measured.",
        }
      : {
          name: "Portfolio concentration",
          metric: "largestHoldingWeightPercent",
          points: round1(15 * clamp01((1 - largestWeight) / (1 - 0.2))),
          maxPoints: 15,
          available: true,
          detail: `Your largest holding, ${largest.symbol}, is ${largestWeightPercent}% of your portfolio (20% or less is full marks).`,
          largestHoldingSymbol: largest.symbol,
          largestHoldingWeightPercent: largestWeightPercent,
          holdingsCount: priced.length,
        },
    weightedVolatility === null || volatilityPercent === null
      ? {
          name: "Portfolio volatility",
          metric: "volatilityPercent",
          points: 0,
          maxPoints: 15,
          available: false,
          detail:
            "Not enough price history for your holdings yet, so volatility cannot be measured.",
        }
      : {
          name: "Portfolio volatility",
          metric: "volatilityPercent",
          points: round1(
            15 * clamp01((0.6 - weightedVolatility) / (0.6 - 0.15)),
          ),
          maxPoints: 15,
          available: true,
          detail: `Your portfolio's annualized volatility is ${volatilityPercent}% (value-weighted average across ${holdingVolatilities.length} holding${holdingVolatilities.length === 1 ? "" : "s"}; 15% or less is full marks).`,
          volatilityPercent,
          holdingsWithHistory: holdingVolatilities.length,
        },
  ];

  // Suggestions the backend way: for each available factor below
  // full marks, the target that would earn full marks and the points
  // it would gain, top 3 by points gained.
  const suggestions: ReadinessAssessment["suggestions"] = [];
  for (const factor of factors) {
    if (!factor.available || factor.points >= factor.maxPoints) continue;
    const gain = round1(factor.maxPoints - factor.points);
    switch (factor.metric) {
      case "emergencyFundMonths":
        suggestions.push({
          factor: factor.name,
          action: `Build your emergency fund to 6 months (currently ${factor.monthsLabel}) to gain ${gain} points.`,
          pointsGain: gain,
          targetMonths: 6,
        });
        break;
      case "surplusRatePercent": {
        const target = Math.round(monthlyIncome * 0.3);
        suggestions.push({
          factor: factor.name,
          action: `Raising your monthly surplus to ${guestInr0.format(target)} (30% of income) would add ${gain} points.`,
          pointsGain: gain,
          targetSurplus: target,
          targetRatePercent: 30,
        });
        break;
      }
      case "largestHoldingWeightPercent":
        suggestions.push({
          factor: factor.name,
          action: `Reducing ${factor.largestHoldingSymbol} below 20% of your portfolio (currently ${factor.largestHoldingWeightPercent}%) would add ${gain} points.`,
          pointsGain: gain,
          targetWeightPercent: 20,
          symbol: factor.largestHoldingSymbol,
        });
        break;
      case "volatilityPercent":
        suggestions.push({
          factor: factor.name,
          action: `Reducing your portfolio's volatility to 15% or below (currently ${factor.volatilityPercent}%) would add ${gain} points.`,
          pointsGain: gain,
          targetVolatilityPercent: 15,
        });
        break;
      default:
        break;
    }
  }
  suggestions.sort((a, b) => b.pointsGain - a.pointsGain);

  const availableFactors = factors.filter((factor) => factor.available);
  const maxScore = availableFactors.reduce(
    (sum, factor) => sum + factor.maxPoints,
    0,
  );
  const earned = availableFactors.reduce(
    (sum, factor) => sum + factor.points,
    0,
  );
  const score = Math.round((earned / maxScore) * 100);
  const band = score <= 39 ? "Not ready" : score <= 69 ? "Building" : "Ready";

  return {
    available: true,
    score,
    band,
    scale: 100,
    maxScore,
    factors,
    suggestions: suggestions.slice(0, 3),
    context: {
      monthlyIncome,
      monthlySurplus,
      surplusRatePercent,
      totalDebt,
      debtToIncomeRatio: round2(totalDebt / annualIncome),
      totalPortfolioValue,
      holdingsCount: priced.length,
      pricedHoldingsCount: priced.length,
      largestHolding:
        largest === null || largestWeightPercent === null
          ? null
          : {
              symbol: largest.symbol,
              weightPercent: largestWeightPercent,
            },
      volatilityPercent,
    },
    stale: false,
    asOf: summary.asOf,
  };
}

// TEMPORARY dev-only guest demo — remove before shipping.
//
// No model is configured for a guest, so the status honestly reports
// unconfigured: the dashboard shows its "AI isn't set up yet" note
// instead of an error, and the readiness card's "Explain my score"
// button explains that instead of calling the explain route. The
// chat itself is NOT gated on this flag, so asking still returns the
// canned demo reply below.
export function guestAiStatus(): AiStatus {
  return { configured: false, primaryModel: "", reasoningModel: "" };
}

// TEMPORARY dev-only guest demo — remove before shipping.
//
// Canned demo reply in the backend's own fallback shape (answer null,
// fallback true, verification "unavailable"), so the chat renders it
// through its normal fallback path instead of erroring. No model
// runs for a guest and no claim is made about real data.
export function guestAiChatResponse(reason: string): AiChatResponse {
  return {
    answer: null,
    claims: [],
    refused: false,
    refusalReason: null,
    fallback: true,
    fallbackReason: reason,
    metrics: null,
    model: null,
    toolsUsed: [],
    disclaimer:
      "FinVerse AI explains your data to support your decisions. It is not financial advice.",
    verification: { status: "unavailable", checksPassed: 0, checksFailed: 0 },
  };
}

type GoalContribution = {
  id: string;
  amount: number;
  date: string;
  note: string | null;
};

/**
 * Demo goal contributions. Each goal's contributions sum exactly to
 * its saved_amount in guestProfileResponse().
 */
export function guestContributions(goalId: string): GoalContribution[] {
  switch (goalId) {
    case "guest-goal-emergency":
      return [
        {
          id: "guest-contrib-emergency-1",
          amount: 50000,
          date: dayMonthsAgo(3, 5),
          note: "Monthly saving",
        },
        {
          id: "guest-contrib-emergency-2",
          amount: 50000,
          date: dayMonthsAgo(2, 5),
          note: "Monthly saving",
        },
        {
          id: "guest-contrib-emergency-3",
          amount: 50000,
          date: dayMonthsAgo(1, 5),
          note: "Monthly saving",
        },
      ];
    case "guest-goal-goa":
      return [
        {
          id: "guest-contrib-goa-1",
          amount: 12000,
          date: dayMonthsAgo(2, 12),
          note: "Salary day saving",
        },
        {
          id: "guest-contrib-goa-2",
          amount: 12000,
          date: dayMonthsAgo(1, 12),
          note: "Salary day saving",
        },
      ];
    case "guest-goal-laptop":
      return [
        {
          id: "guest-contrib-laptop-1",
          amount: 15000,
          date: dayMonthsAgo(1, 20),
          note: "Freelance payout",
        },
      ];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// TEMPORARY dev-only guest demo market fixtures — remove before shipping.
//
// Static, plausible Indian-market sample data so a guest admitted to
// /market sees a working desk instead of 401s from the backend
// SessionGuard. Prices are fixed demo values (not live quotes) and
// history is a deterministic seeded walk that ends at the quoted
// price, so the charts, optimizer and screener all agree with each
// other. Holdings are the demo persona's modest portfolio (₹1,29,700
// invested, ~₹1,39,195 current value); the portfolio summary is
// computed from those same holdings, never hardcoded separately.
// ---------------------------------------------------------------------------

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** One demo quote: the single source of truth for every market fixture. */
type GuestQuoteSeed = {
  name: string;
  price: number;
  previousClose: number;
  currency: string;
  sector: string | null;
};

// TEMPORARY dev-only guest demo — remove before shipping. Fixed demo
// prices: plausible late-November 2026 levels, not live market data.
const GUEST_QUOTES: Record<string, GuestQuoteSeed> = {
  "^NSEI": {
    name: "NIFTY 50",
    price: 26120.45,
    previousClose: 25980.1,
    currency: "INR",
    sector: null,
  },
  "^BSESN": {
    name: "SENSEX",
    price: 85240.3,
    previousClose: 84910.55,
    currency: "INR",
    sector: null,
  },
  "^NSEBANK": {
    name: "NIFTY Bank",
    price: 59480.2,
    previousClose: 59210.0,
    currency: "INR",
    sector: null,
  },
  "GC=F": {
    name: "Gold futures",
    price: 4182.3,
    previousClose: 4152.0,
    currency: "USD",
    sector: null,
  },
  "SI=F": {
    name: "Silver futures",
    price: 52.35,
    previousClose: 51.85,
    currency: "USD",
    sector: null,
  },
  "RELIANCE.NS": {
    name: "Reliance Industries Ltd",
    price: 1542.3,
    previousClose: 1528.75,
    currency: "INR",
    sector: "Energy",
  },
  "TCS.NS": {
    name: "Tata Consultancy Services Ltd",
    price: 3148.55,
    previousClose: 3120.0,
    currency: "INR",
    sector: "Information Technology",
  },
  "INFY.NS": {
    name: "Infosys Ltd",
    price: 1486.2,
    previousClose: 1472.1,
    currency: "INR",
    sector: "Information Technology",
  },
  "HDFCBANK.NS": {
    name: "HDFC Bank Ltd",
    price: 1985.4,
    previousClose: 1968.25,
    currency: "INR",
    sector: "Financial Services",
  },
  "SBIN.NS": {
    name: "State Bank of India",
    price: 812.65,
    previousClose: 804.9,
    currency: "INR",
    sector: "Financial Services",
  },
  "ITC.NS": {
    name: "ITC Ltd",
    price: 468.9,
    previousClose: 465.2,
    currency: "INR",
    sector: "Consumer Defensive",
  },
  "HINDUNILVR.NS": {
    name: "Hindustan Unilever Ltd",
    price: 2540.1,
    previousClose: 2522.35,
    currency: "INR",
    sector: "Consumer Defensive",
  },
  "TATAMOTORS.NS": {
    name: "Tata Motors Ltd",
    price: 978.45,
    previousClose: 965.3,
    currency: "INR",
    sector: "Consumer Cyclical",
  },
  "HCLTECH.NS": {
    name: "HCL Technologies Ltd",
    price: 1689.75,
    previousClose: 1674.2,
    currency: "INR",
    sector: "Information Technology",
  },
  "WIPRO.NS": {
    name: "Wipro Ltd",
    price: 542.8,
    previousClose: 538.15,
    currency: "INR",
    sector: "Information Technology",
  },
  "BAJFINANCE.NS": {
    name: "Bajaj Finance Ltd",
    price: 9124.3,
    previousClose: 9048.55,
    currency: "INR",
    sector: "Financial Services",
  },
  "MARUTI.NS": {
    name: "Maruti Suzuki India Ltd",
    price: 13482.6,
    previousClose: 13390.25,
    currency: "INR",
    sector: "Consumer Cyclical",
  },
  "SUNPHARMA.NS": {
    name: "Sun Pharmaceutical Industries Ltd",
    price: 1845.9,
    previousClose: 1828.4,
    currency: "INR",
    sector: "Healthcare",
  },
  "AXISBANK.NS": {
    name: "Axis Bank Ltd",
    price: 1187.35,
    previousClose: 1176.8,
    currency: "INR",
    sector: "Financial Services",
  },
  "KOTAKBANK.NS": {
    name: "Kotak Mahindra Bank Ltd",
    price: 2134.75,
    previousClose: 2118.6,
    currency: "INR",
    sector: "Financial Services",
  },
  "LT.NS": {
    name: "Larsen & Toubro Ltd",
    price: 3892.15,
    previousClose: 3856.4,
    currency: "INR",
    sector: "Industrials",
  },
  "ULTRACEMCO.NS": {
    name: "UltraTech Cement Ltd",
    price: 11845.2,
    previousClose: 11762.8,
    currency: "INR",
    sector: "Basic Materials",
  },
};

/** Demo quote in the backend's MarketQuote shape; unknown symbols are honestly unpriced, never zero. */
export function guestMarketQuote(symbolInput: string): MarketQuote {
  const symbol = symbolInput.toUpperCase();
  const seed = GUEST_QUOTES[symbol];
  const fetchedAt = new Date().toISOString();
  if (!seed) {
    return {
      symbol,
      name: null,
      price: null,
      previousClose: null,
      change: null,
      changePercent: null,
      currency: "INR",
      sector: null,
      fetchedAt,
      stale: false,
    };
  }
  const change = round2(seed.price - seed.previousClose);
  return {
    symbol,
    name: seed.name,
    price: seed.price,
    previousClose: seed.previousClose,
    change,
    changePercent: round2((change / seed.previousClose) * 100),
    currency: seed.currency,
    sector: seed.sector,
    fetchedAt,
    stale: false,
  };
}

/** FNV-1a hash, so the same symbol always gets the same demo history. */
function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic PRNG (mulberry32): demo history is stable across loads. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Trading-day dates (weekdays only) in the last `calendarDays`, oldest first. */
function tradingDatesInRange(calendarDays: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let back = 0; back < calendarDays; back++) {
    const day = new Date(today);
    day.setDate(today.getDate() - back);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    dates.unshift(isoDate(day));
  }
  return dates;
}

// TEMPORARY dev-only guest demo — remove before shipping. Typical daily
// volumes for the demo history bars; indices and futures report no
// single volume, so theirs is null.
const GUEST_VOLUMES: Record<string, number> = {
  "RELIANCE.NS": 9000000,
  "TCS.NS": 2100000,
  "INFY.NS": 6500000,
  "HDFCBANK.NS": 9500000,
  "SBIN.NS": 14000000,
  "ITC.NS": 11000000,
  "HINDUNILVR.NS": 2800000,
};

/** Demo history in the backend's HistoryResponse shape. */
export function guestMarketHistory(
  symbolInput: string,
  rangeInput: string,
): HistoryResponse {
  const symbol = symbolInput.toUpperCase();
  const range =
    rangeInput === "1mo" ||
    rangeInput === "3mo" ||
    rangeInput === "6mo" ||
    rangeInput === "1y" ||
    rangeInput === "5y"
      ? rangeInput
      : "1y";
  const calendarDays: Record<string, number> = {
    "1mo": 30,
    "3mo": 90,
    "6mo": 180,
    "1y": 365,
    "5y": 1825,
  };
  const quote = guestMarketQuote(symbol);
  const fetchedAt = new Date().toISOString();
  if (quote.price === null)
    return { symbol, range, bars: [], fetchedAt, stale: false };
  const dates = tradingDatesInRange(calendarDays[range]!);
  const rand = mulberry32(hashSeed(`${symbol}:${range}`));
  const dailyVol =
    symbol.startsWith("^") || symbol.endsWith("=F") ? 0.008 : 0.012;
  // Random walk from a nearby start, rescaled so the last close equals
  // the demo quote — history, quote and charts can never disagree.
  const closes: number[] = [];
  let price = quote.price * (1 - (rand() - 0.4) * 0.12);
  for (let i = 0; i < dates.length; i++) {
    const shock = (rand() + rand() + rand() - 1.5) / 1.5;
    price *= 1 + shock * dailyVol;
    closes.push(price);
  }
  const scale = quote.price / closes[closes.length - 1]!;
  const scaled = closes.map((close) => close * scale);
  const volumeBase = GUEST_VOLUMES[symbol] ?? 5000000;
  const hasVolume = !symbol.startsWith("^") && !symbol.endsWith("=F");
  const bars = dates.map((date, i) => {
    const close = round2(scaled[i]!);
    const prevClose =
      i === 0 ? close * (1 + (rand() - 0.5) * 0.004) : scaled[i - 1]!;
    const open = round2(prevClose * (1 + (rand() - 0.5) * 0.004));
    const high = round2(Math.max(open, close) * (1 + rand() * 0.004));
    const low = round2(Math.min(open, close) * (1 - rand() * 0.004));
    return {
      date,
      open,
      high,
      low,
      close,
      volume: hasVolume
        ? Math.round(volumeBase * (0.7 + rand() * 0.6))
        : null,
    };
  });
  return { symbol, range, bars, fetchedAt, stale: false };
}

/** Demo market overview: the backend's five indices plus the demo watchlist. */
export function guestMarketOverview(): OverviewResponse {
  return {
    indices: ["^NSEI", "^BSESN", "^NSEBANK", "GC=F", "SI=F"].map((symbol) =>
      guestMarketQuote(symbol),
    ),
    watchlist: [
      {
        id: "guest-watch-reliance",
        symbol: "RELIANCE.NS",
        name: "Reliance Industries Ltd",
        note: "Watching for a dip below ₹1,500.",
        alertDirection: "below",
        alertPrice: 1500,
        alertFiredAt: null,
        quote: guestMarketQuote("RELIANCE.NS"),
      },
      {
        id: "guest-watch-tcs",
        symbol: "TCS.NS",
        name: "Tata Consultancy Services Ltd",
        note: null,
        alertDirection: null,
        alertPrice: null,
        alertFiredAt: null,
        quote: guestMarketQuote("TCS.NS"),
      },
      {
        id: "guest-watch-sbin",
        symbol: "SBIN.NS",
        name: "State Bank of India",
        note: "PSU bank — dividend watch.",
        alertDirection: "above",
        alertPrice: 850,
        alertFiredAt: null,
        quote: guestMarketQuote("SBIN.NS"),
      },
      {
        id: "guest-watch-itc",
        symbol: "ITC.NS",
        name: "ITC Ltd",
        note: null,
        alertDirection: null,
        alertPrice: null,
        alertFiredAt: null,
        quote: guestMarketQuote("ITC.NS"),
      },
    ],
    alerts: [],
    unavailable: [],
  };
}

// TEMPORARY dev-only guest demo — remove before shipping. The searchable
// demo universe: the quoted equities plus the overview indices.
const GUEST_SEARCH_UNIVERSE: SearchResult[] = [
  ...Object.entries(GUEST_QUOTES).map(([symbol, seed]) => ({
    symbol,
    name: seed.name,
    exchange: symbol.startsWith("^") || symbol.endsWith("=F") ? undefined : "NSE",
    type: symbol.startsWith("^") || symbol.endsWith("=F") ? "INDEX" : "EQUITY",
  })),
];

/** Demo search: substring match on symbol or name; short/empty queries match nothing. */
export function guestMarketSearch(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return GUEST_SEARCH_UNIVERSE.filter(
    (item) =>
      item.symbol.toLowerCase().includes(q) ||
      (item.name ?? "").toLowerCase().includes(q),
  );
}

/**
 * Demo holdings (the plain Holding shape GET /api/holdings returns):
 * four modest positions, ₹1,29,700 invested — a beginner's direct-
 * equity slice for the demo persona.
 */
export function guestHoldings(): Holding[] {
  return [
    {
      id: "guest-holding-reliance",
      symbol: "RELIANCE.NS",
      name: "Reliance Industries Ltd",
      sector: "Energy",
      quantity: 20,
      buyPrice: 1420,
      buyDate: "2026-03-10",
      currency: "INR",
    },
    {
      id: "guest-holding-tcs",
      symbol: "TCS.NS",
      name: "Tata Consultancy Services Ltd",
      sector: "Information Technology",
      quantity: 10,
      buyPrice: 2980,
      buyDate: "2025-11-18",
      currency: "INR",
    },
    {
      id: "guest-holding-infy",
      symbol: "INFY.NS",
      name: "Infosys Ltd",
      sector: "Information Technology",
      quantity: 25,
      buyPrice: 1380,
      buyDate: "2026-06-02",
      currency: "INR",
    },
    {
      id: "guest-holding-hdfcbank",
      symbol: "HDFCBANK.NS",
      name: "HDFC Bank Ltd",
      sector: "Financial Services",
      quantity: 20,
      buyPrice: 1850,
      buyDate: "2025-08-21",
      currency: "INR",
    },
  ];
}

/** Demo holdings valued at the demo quotes (the ValuedHolding shape). */
export function guestValuedHoldings(): ValuedHolding[] {
  const fetchedAt = new Date().toISOString();
  return guestHoldings().map((holding) => {
    const quote = guestMarketQuote(holding.symbol);
    const investedValue = round2(holding.quantity * holding.buyPrice);
    const currentPrice = quote.price;
    const currentValue =
      currentPrice === null ? null : round2(holding.quantity * currentPrice);
    const gainLoss =
      currentValue === null ? null : round2(currentValue - investedValue);
    return {
      ...holding,
      currentPrice,
      currentValue,
      investedValue,
      gainLoss,
      gainLossPercent:
        gainLoss === null ? null : round2((gainLoss / investedValue) * 100),
      fetchedAt,
      stale: false,
      priced: currentPrice !== null,
    };
  });
}

/**
 * Demo portfolio summary, computed from guestValuedHoldings() so the
 * totals, per-currency totals and sector weights can never drift from
 * the holdings list: ₹1,39,194.50 value on ₹1,29,700 invested
 * (+₹9,494.50, +7.32%).
 */
export function guestPortfolioSummary(): PortfolioSummary {
  const holdings = guestValuedHoldings();
  const totalValue = round2(
    holdings.reduce((sum, h) => sum + (h.currentValue ?? 0), 0),
  );
  const totalInvested = round2(
    holdings.reduce((sum, h) => sum + h.investedValue, 0),
  );
  const totalGainLoss = round2(totalValue - totalInvested);
  const totalGainLossPercent =
    totalInvested === 0 ? 0 : round2((totalGainLoss / totalInvested) * 100);
  const bySector = new Map<string, number>();
  for (const holding of holdings) {
    if (holding.currentValue === null) continue;
    const sector = holding.sector ?? "Unknown";
    bySector.set(sector, (bySector.get(sector) ?? 0) + holding.currentValue);
  }
  const sectors = [...bySector.entries()]
    .map(([sector, value]) => ({
      sector,
      value: round2(value),
      weight:
        totalValue === 0 ? 0 : round2((value / totalValue) * 100),
    }))
    .sort((a, b) => b.value - a.value);
  return {
    holdings,
    totals: {
      totalValue,
      totalInvested,
      totalGainLoss,
      totalGainLossPercent,
    },
    totalsByCurrency: [
      {
        currency: "INR",
        totalValue,
        totalInvested,
        totalGainLoss,
        totalGainLossPercent,
      },
    ],
    sectors,
    unavailable: [],
    asOf: new Date().toISOString(),
    stale: false,
  };
}

/** Demo watchlist (the plain WatchlistItem shape GET /api/watchlist returns). */
export function guestWatchlist(): WatchlistItem[] {
  return [
    {
      id: "guest-watch-reliance",
      symbol: "RELIANCE.NS",
      name: "Reliance Industries Ltd",
    },
    {
      id: "guest-watch-tcs",
      symbol: "TCS.NS",
      name: "Tata Consultancy Services Ltd",
    },
    {
      id: "guest-watch-sbin",
      symbol: "SBIN.NS",
      name: "State Bank of India",
    },
    { id: "guest-watch-itc", symbol: "ITC.NS", name: "ITC Ltd" },
  ];
}

// TEMPORARY dev-only guest demo — remove before shipping. Demo
// fundamentals for the seven screener/profile stocks: plausible
// published-style levels (market caps in rupees), not live data.
// Other quoted symbols honestly report fundamentals unavailable.
const GUEST_FUNDAMENTALS: Record<
  string,
  NonNullable<MarketProfile["fundamentals"]>
> = {
  "RELIANCE.NS": {
    sector: "Energy",
    industry: "Oil & Gas — Integrated",
    marketCap: 20860000000000,
    trailingPE: 28.4,
    forwardPE: 26.1,
    dividendYield: 0.0055,
    fiftyTwoWeekHigh: 1608.75,
    fiftyTwoWeekLow: 1214.2,
    description:
      "Reliance Industries is an Indian multinational conglomerate with businesses in energy, petrochemicals, retail and telecom.",
    bookValue: 812.4,
    priceToBook: 1.9,
    returnOnEquity: 0.096,
    debtToEquity: 0.44,
    revenueGrowth: 0.082,
    earningsGrowth: 0.114,
    payoutRatio: 0.16,
    beta: 1.02,
    sharesOutstanding: 6766000000,
  },
  "TCS.NS": {
    sector: "Information Technology",
    industry: "IT Services & Consulting",
    marketCap: 11400000000000,
    trailingPE: 26.1,
    forwardPE: 24.3,
    dividendYield: 0.0168,
    fiftyTwoWeekHigh: 3485.0,
    fiftyTwoWeekLow: 2945.3,
    description:
      "Tata Consultancy Services is an Indian IT services and consulting company, part of the Tata group.",
    bookValue: 712.5,
    priceToBook: 4.42,
    returnOnEquity: 0.46,
    debtToEquity: 0.09,
    revenueGrowth: 0.058,
    earningsGrowth: 0.064,
    payoutRatio: 0.44,
    beta: 0.92,
    sharesOutstanding: 3620000000,
  },
  "INFY.NS": {
    sector: "Information Technology",
    industry: "IT Services & Consulting",
    marketCap: 6180000000000,
    trailingPE: 24.8,
    forwardPE: 23.1,
    dividendYield: 0.0245,
    fiftyTwoWeekHigh: 1612.4,
    fiftyTwoWeekLow: 1358.9,
    description:
      "Infosys is an Indian IT services company providing consulting, technology and outsourcing services.",
    bookValue: 402.1,
    priceToBook: 3.7,
    returnOnEquity: 0.31,
    debtToEquity: 0.12,
    revenueGrowth: 0.071,
    earningsGrowth: 0.083,
    payoutRatio: 0.61,
    beta: 0.98,
    sharesOutstanding: 4160000000,
  },
  "HDFCBANK.NS": {
    sector: "Financial Services",
    industry: "Banks — Private Sector",
    marketCap: 15100000000000,
    trailingPE: 19.6,
    forwardPE: 17.8,
    dividendYield: 0.0112,
    fiftyTwoWeekHigh: 2054.8,
    fiftyTwoWeekLow: 1678.35,
    description:
      "HDFC Bank is an Indian private-sector bank offering retail, wholesale and treasury banking services.",
    bookValue: 682.3,
    priceToBook: 2.91,
    returnOnEquity: 0.17,
    debtToEquity: 0.85,
    revenueGrowth: 0.094,
    earningsGrowth: 0.102,
    payoutRatio: 0.22,
    beta: 0.88,
    sharesOutstanding: 7620000000,
  },
  "SBIN.NS": {
    sector: "Financial Services",
    industry: "Banks — Public Sector",
    marketCap: 7280000000000,
    trailingPE: 11.2,
    forwardPE: 10.4,
    dividendYield: 0.0169,
    fiftyTwoWeekHigh: 845.2,
    fiftyTwoWeekLow: 698.4,
    description:
      "State Bank of India is India's largest public-sector bank, owned by the Government of India.",
    bookValue: 512.6,
    priceToBook: 1.59,
    returnOnEquity: 0.17,
    debtToEquity: 0.62,
    revenueGrowth: 0.088,
    earningsGrowth: 0.121,
    payoutRatio: 0.19,
    beta: 1.12,
    sharesOutstanding: 8960000000,
  },
  "ITC.NS": {
    sector: "Consumer Defensive",
    industry: "Tobacco & FMCG",
    marketCap: 5860000000000,
    trailingPE: 28.9,
    forwardPE: 27.4,
    dividendYield: 0.0295,
    fiftyTwoWeekHigh: 512.3,
    fiftyTwoWeekLow: 398.15,
    description:
      "ITC is an Indian conglomerate with businesses in cigarettes, FMCG, hotels, packaging and agri-business.",
    bookValue: 178.4,
    priceToBook: 2.63,
    returnOnEquity: 0.34,
    debtToEquity: 0.01,
    revenueGrowth: 0.064,
    earningsGrowth: 0.052,
    payoutRatio: 0.85,
    beta: 0.62,
    sharesOutstanding: 12500000000,
  },
  "HINDUNILVR.NS": {
    sector: "Consumer Defensive",
    industry: "Household & Personal Products",
    marketCap: 5960000000000,
    trailingPE: 54.2,
    forwardPE: 51.8,
    dividendYield: 0.0185,
    fiftyTwoWeekHigh: 2682.0,
    fiftyTwoWeekLow: 2198.5,
    description:
      "Hindustan Unilever is an Indian consumer-goods company, a subsidiary of Unilever.",
    bookValue: 214.3,
    priceToBook: 11.85,
    returnOnEquity: 0.22,
    debtToEquity: 0.03,
    revenueGrowth: 0.041,
    earningsGrowth: 0.038,
    payoutRatio: 0.97,
    beta: 0.45,
    sharesOutstanding: 2350000000,
  },
};

/** Demo stock profile: quote plus fundamentals when the demo knows them. */
export function guestMarketProfile(symbolInput: string): MarketProfile {
  const quote = guestMarketQuote(symbolInput);
  const fundamentals = GUEST_FUNDAMENTALS[quote.symbol] ?? null;
  return {
    ...quote,
    fundamentals,
    fundamentalsAvailable: fundamentals !== null,
  };
}

// TEMPORARY dev-only guest demo — remove before shipping. BSE scrip
// codes and URL slugs for the demo filings links (public identifiers).
const GUEST_FILING_COMPANIES: Record<
  string,
  { name: string; bseScripCode: string; bseSlug: string }
> = {
  "RELIANCE.NS": {
    name: "Reliance Industries Ltd",
    bseScripCode: "500325",
    bseSlug: "reliance-industries",
  },
  "TCS.NS": {
    name: "Tata Consultancy Services Ltd",
    bseScripCode: "532540",
    bseSlug: "tata-consultancy-services",
  },
  "INFY.NS": {
    name: "Infosys Ltd",
    bseScripCode: "500209",
    bseSlug: "infosys",
  },
  "HDFCBANK.NS": {
    name: "HDFC Bank Ltd",
    bseScripCode: "500180",
    bseSlug: "hdfc-bank",
  },
  "SBIN.NS": {
    name: "State Bank of India",
    bseScripCode: "500112",
    bseSlug: "state-bank-of-india",
  },
  "ITC.NS": {
    name: "ITC Ltd",
    bseScripCode: "500875",
    bseSlug: "itc",
  },
  "HINDUNILVR.NS": {
    name: "Hindustan Unilever Ltd",
    bseScripCode: "500696",
    bseSlug: "hindustan-unilever",
  },
};

function emptyFilingBlock(status: FilingCategoryStatus): FilingCategoryBlock {
  return { status, entries: [], links: [] };
}

/**
 * Demo filings: no invented documents — every category is links-only
 * to the real official source (NSE/BSE quote pages, SEBI, the rating
 * agencies), with no entries. Unknown symbols honestly report every
 * category unavailable.
 */
export function guestMarketFilings(symbolInput: string): FilingsResponse {
  const symbol = symbolInput.toUpperCase();
  const nseSymbol = symbol.replace(/\.NS$/, "");
  const asOf = new Date().toISOString();
  const company = GUEST_FILING_COMPANIES[symbol];
  if (!company) {
    return {
      symbol,
      nseSymbol,
      company: null,
      asOf,
      categories: {
        "annual-reports": emptyFilingBlock("unavailable"),
        "quarterly-results": emptyFilingBlock("unavailable"),
        "investor-presentations": emptyFilingBlock("unavailable"),
        announcements: emptyFilingBlock("unavailable"),
        drhp: emptyFilingBlock("unavailable"),
        ratings: emptyFilingBlock("unavailable"),
      },
    };
  }
  const nseQuote = `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(nseSymbol)}`;
  const bsePage = `https://www.bseindia.com/stock-share-price/${company.bseSlug}/${nseSymbol.toLowerCase()}/${company.bseScripCode}/`;
  const exchangeLinks = [
    { label: "NSE quote page", url: nseQuote, source: "NSE" },
    { label: "BSE stock page", url: bsePage, source: "BSE" },
  ];
  return {
    symbol,
    nseSymbol,
    company: { name: company.name, bseScripCode: company.bseScripCode },
    asOf,
    categories: {
      announcements: {
        status: "links-only",
        entries: [],
        links: exchangeLinks,
      },
      "annual-reports": {
        status: "links-only",
        entries: [],
        links: exchangeLinks,
      },
      "quarterly-results": {
        status: "links-only",
        entries: [],
        links: exchangeLinks,
      },
      "investor-presentations": {
        status: "links-only",
        entries: [],
        links: exchangeLinks,
      },
      drhp: {
        status: "links-only",
        entries: [],
        links: [
          {
            label: "SEBI public issues",
            url: "https://www.sebi.gov.in/filings/public-issues.html",
            source: "SEBI",
          },
        ],
      },
      ratings: {
        status: "links-only",
        entries: [],
        links: [
          {
            label: "CRISIL Ratings",
            url: "https://www.crisilratings.com/",
            source: "CRISIL",
          },
          { label: "ICRA", url: "https://www.icra.in/", source: "ICRA" },
          {
            label: "CARE Ratings",
            url: "https://www.careratings.com/",
            source: "CARE",
          },
        ],
      },
    },
  };
}

/**
 * Demo news: honestly unavailable — no articles are invented for the
 * demo, so the stock page shows the "not available in the guest demo"
 * note instead of fake headlines.
 */
export function guestNews(symbolInput: string): NewsResponse {
  return {
    symbol: symbolInput.toUpperCase(),
    articles: [],
    overall: {
      score: 0,
      label: "neutral",
      positive: 0,
      negative: 0,
      neutral: 0,
    },
    available: false,
    reason:
      "News isn't available in the guest demo — sign in with Google to read live news for this stock.",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Demo screener snapshot: the seven demo stocks, screened from their
 * own demo history — SMA/RSI/1-month change are computed from the same
 * seeded bars the charts draw, so the screener can never disagree
 * with the stock page.
 */
export function guestScreen(): ScreenResponse {
  const evaluatedAt = new Date().toISOString();
  const universe = Object.keys(GUEST_FUNDAMENTALS);
  const matches: ScreenedStock[] = universe.map((symbol) => {
    const quote = guestMarketQuote(symbol);
    const fundamentals = GUEST_FUNDAMENTALS[symbol]!;
    const closes = guestMarketHistory(symbol, "1y").bars.map(
      (bar) => bar.close,
    );
    const sma20Values = sma(closes, 20);
    const sma50Values = sma(closes, 50);
    const rsiValues = rsi(closes, 14);
    const monthAgoClose = closes[Math.max(0, closes.length - 22)]!;
    const lastClose = closes[closes.length - 1]!;
    return {
      symbol,
      name: quote.name,
      fiftyTwoWeekHigh: fundamentals.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: fundamentals.fiftyTwoWeekLow,
      currency: "INR",
      fetchedAt: evaluatedAt,
      price: quote.price,
      changePercent: quote.changePercent,
      marketCap: fundamentals.marketCap,
      trailingPE: fundamentals.trailingPE,
      sector: quote.sector,
      rsi14: rsiValues[rsiValues.length - 1] ?? null,
      sma20: sma20Values[sma20Values.length - 1] ?? null,
      sma50: sma50Values[sma50Values.length - 1] ?? null,
      change1moPercent: round2(
        ((lastClose - monthAgoClose) / monthAgoClose) * 100,
      ),
      stale: false,
    };
  });
  return {
    filters: {},
    universe,
    matches,
    unavailable: [],
    evaluatedAt,
  };
}
