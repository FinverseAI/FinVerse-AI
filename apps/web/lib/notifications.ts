/**
 * In-app notifications — no email, no new infra. Two sources feed the
 * notification centre, both rendered the same way:
 *
 * - Bills: a bill becomes a notification while it is unpaid and its due
 *   date is past, today, or within the next week. Fully paid bills never
 *   appear. The list is recomputed from the bills on every render, so
 *   there is no read/unread state to store: paying a bill (or its due
 *   date passing out of the window) removes its notification.
 * - Price alerts: a watchlist alert that fired (the price crossed its
 *   target on a market-overview load) stays in the centre until the
 *   price moves back across the threshold and the alert re-arms. The
 *   fired list comes from GET /api/market/alerts; evaluation happens
 *   on the market overview, not here.
 */

export type BillForNotification = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  paidTotal?: number;
};

export type BillNotification = {
  source: "bill";
  billId: string;
  billName: string;
  kind: "overdue" | "due-today" | "due-soon";
  dueDate: string;
  amountDue: number;
  /** Negative when overdue, 0 when due today. */
  daysUntilDue: number;
};

/** A fired price alert, as served by GET /api/market/alerts. */
export type FiredAlertForNotification = {
  id: string;
  symbol: string;
  name: string | null;
  alertDirection: "above" | "below" | null;
  alertPrice: number | null;
  currency?: string | null;
  firedAt: string | null;
};

export type PriceAlertNotification = {
  source: "price-alert";
  alertId: string;
  symbol: string;
  name: string | null;
  alertDirection: "above" | "below";
  alertPrice: number;
  // Null when the currency is unknown (B26) — never a guessed ₹.
  currency: string | null;
  firedAt: string;
};

export type BudgetNotification = {
  source: "budget";
  category: string;
  spent: number;
  limit: number;
};

export type DashboardNotification =
  BillNotification | PriceAlertNotification | BudgetNotification;

export function budgetNotifications(
  budgets: { name: string; spent: number; limit: number }[],
): BudgetNotification[] {
  return budgets
    .filter(
      ({ spent, limit }) =>
        limit > 0 &&
        Math.round(spent * 100) * 10 >= Math.round(limit * 100) * 9,
    )
    .map(({ name, spent, limit }) => ({
      source: "budget",
      category: name,
      spent,
      limit,
    }));
}

/**
 * Maps fired alerts to notifications. A row missing its direction,
 * target or fired time is dropped — a notification that cannot say
 * what crossed, or when, would be worse than none.
 */
export function priceAlertNotifications(
  alerts: FiredAlertForNotification[],
): PriceAlertNotification[] {
  return alerts
    .filter(
      (alert) =>
        (alert.alertDirection === "above" ||
          alert.alertDirection === "below") &&
        alert.alertPrice != null &&
        alert.firedAt != null,
    )
    .map((alert) => ({
      source: "price-alert" as const,
      alertId: alert.id,
      symbol: alert.symbol,
      name: alert.name,
      alertDirection: alert.alertDirection as "above" | "below",
      alertPrice: alert.alertPrice as number,
      currency: alert.currency ?? null,
      firedAt: alert.firedAt as string,
    }));
}

export const DUE_SOON_DAYS = 7;

function dayCount(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86400000);
}

export function billNotifications(
  bills: BillForNotification[],
  today: string,
): BillNotification[] {
  const todayCount = dayCount(today);
  return bills
    .map((bill) => {
      const paidTotal = bill.paidTotal ?? 0;
      const amountDue = Math.round((bill.amount - paidTotal) * 100) / 100;
      const daysUntilDue = dayCount(bill.dueDate) - todayCount;
      return { bill, amountDue, daysUntilDue };
    })
    .filter(
      ({ bill, amountDue, daysUntilDue }) =>
        // Unpaid (with a paise of tolerance for float dust) and due
        // within the window: overdue, today, or the next week.
        amountDue > 0.005 &&
        daysUntilDue <= DUE_SOON_DAYS &&
        bill.dueDate !== "",
    )
    .map(({ bill, amountDue, daysUntilDue }): BillNotification => ({
      source: "bill",
      billId: bill.id,
      billName: bill.name,
      kind:
        daysUntilDue < 0
          ? "overdue"
          : daysUntilDue === 0
            ? "due-today"
            : "due-soon",
      dueDate: bill.dueDate,
      amountDue,
      daysUntilDue,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
