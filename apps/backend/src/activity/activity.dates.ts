/**
 * Monthly recurrence math for bills. Adding one month clamps to the
 * last day of the target month (31 January -> 28 February, or 29 in
 * a leap year), so a monthly bill never lands on an impossible date
 * or skips a month. All math is in UTC: bill due dates are date-only
 * values, and local timezones must never shift them.
 */
export function nextMonthlyDue(dueDate: Date): Date {
  const year = dueDate.getUTCFullYear();
  const month = dueDate.getUTCMonth();
  const day = dueDate.getUTCDate();
  // Day 0 of the month after next is the last day of next month.
  const lastDayOfNextMonth = new Date(
    Date.UTC(year, month + 2, 0),
  ).getUTCDate();
  return new Date(Date.UTC(year, month + 1, Math.min(day, lastDayOfNextMonth)));
}
