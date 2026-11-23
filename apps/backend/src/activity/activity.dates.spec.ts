import { nextMonthlyDue } from './activity.dates';

describe('nextMonthlyDue', () => {
  it.each([
    ['2026-01-15', '2026-02-15'],
    ['2026-11-28', '2026-12-28'],
    ['2026-12-15', '2027-01-15'],
    // Clamped to the last day of the shorter month.
    ['2026-01-31', '2026-02-28'],
    ['2026-03-31', '2026-04-30'],
    ['2026-08-31', '2026-09-30'],
    // Leap years keep 29 February.
    ['2028-01-31', '2028-02-29'],
    ['2024-01-30', '2024-02-29'],
    // A clamped February date stays clamped the next month: 28 Feb
    // -> 28 Mar, not 31 Mar.
    ['2026-02-28', '2026-03-28'],
  ])('moves %s to %s', (from, to) => {
    expect(
      nextMonthlyDue(new Date(`${from}T00:00:00.000Z`))
        .toISOString()
        .slice(0, 10),
    ).toBe(to);
  });
});
