/**
 * In-app notifications, derived from bills — no email, no new infra.
 * A bill becomes a notification while it is unpaid and its due date
 * is past, today, or within the next week. Fully paid bills never
 * appear. The list is recomputed from the bills on every render, so
 * there is no read/unread state to store: paying a bill (or its due
 * date passing out of the window) removes its notification.
 */

export type BillForNotification = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  paidTotal?: number;
};

export type BillNotification = {
  billId: string;
  billName: string;
  kind: "overdue" | "due-today" | "due-soon";
  dueDate: string;
  amountDue: number;
  /** Negative when overdue, 0 when due today. */
  daysUntilDue: number;
};

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
    .map(({ bill, amountDue, daysUntilDue }) => ({
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
