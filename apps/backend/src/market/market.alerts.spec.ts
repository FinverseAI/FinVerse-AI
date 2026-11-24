import { evaluateAlert, isAlertCrossed } from './market.alerts';

describe('isAlertCrossed', () => {
  it('fires above at or above the target, below at or below it', () => {
    expect(isAlertCrossed('above', 2501, 2500)).toBe(true);
    expect(isAlertCrossed('above', 2499, 2500)).toBe(false);
    expect(isAlertCrossed('below', 2499, 2500)).toBe(true);
    expect(isAlertCrossed('below', 2501, 2500)).toBe(false);
  });

  it('counts boundary equality as crossed (the UI promises "at or")', () => {
    expect(isAlertCrossed('above', 2500, 2500)).toBe(true);
    expect(isAlertCrossed('below', 2500, 2500)).toBe(true);
  });
});

describe('evaluateAlert', () => {
  const quote = (price: number | null, stale = false) => ({ price, stale });
  const item = (overrides: Record<string, unknown> = {}) => ({
    alert_direction: 'above',
    alert_price: 2500,
    alert_fired_at: null,
    ...overrides,
  });

  it('fires a crossed alert that has never fired', () => {
    expect(evaluateAlert(item(), quote(2600))).toBe('fire');
    expect(
      evaluateAlert(
        item({ alert_direction: 'below', alert_price: 2500 }),
        quote(2400),
      ),
    ).toBe('fire');
  });

  it('does not double-fire an alert that is already fired', () => {
    expect(
      evaluateAlert(
        item({ alert_fired_at: new Date('2026-11-24T10:00:00Z') }),
        quote(2600),
      ),
    ).toBe('none');
  });

  it('re-arms a fired alert once the price moves back across', () => {
    expect(
      evaluateAlert(
        item({ alert_fired_at: new Date('2026-11-24T10:00:00Z') }),
        quote(2400),
      ),
    ).toBe('rearm');
    expect(
      evaluateAlert(
        item({
          alert_direction: 'below',
          alert_price: 2500,
          alert_fired_at: new Date('2026-11-24T10:00:00Z'),
        }),
        quote(2600),
      ),
    ).toBe('rearm');
  });

  it('does nothing for an un-crossed alert that never fired', () => {
    expect(evaluateAlert(item(), quote(2400))).toBe('none');
  });

  it('does nothing without a configured alert', () => {
    expect(
      evaluateAlert(
        item({ alert_direction: null, alert_price: null }),
        quote(2600),
      ),
    ).toBe('none');
    expect(
      evaluateAlert(item({ alert_direction: 'sideways' }), quote(2600)),
    ).toBe('none');
    expect(evaluateAlert(item({ alert_price: null }), quote(2600))).toBe(
      'none',
    );
  });

  it('does nothing without a usable quote', () => {
    expect(evaluateAlert(item(), null)).toBe('none');
    expect(evaluateAlert(item(), undefined)).toBe('none');
    expect(evaluateAlert(item(), quote(null))).toBe('none');
  });

  it('never fires or re-arms on a stale quote', () => {
    expect(evaluateAlert(item(), quote(2600, true))).toBe('none');
    expect(
      evaluateAlert(
        item({ alert_fired_at: new Date('2026-11-24T10:00:00Z') }),
        quote(2400, true),
      ),
    ).toBe('none');
  });

  it('accepts the target as a Decimal-like value', () => {
    expect(
      evaluateAlert(
        item({ alert_price: { toString: () => '2500.00' } }),
        quote(2600),
      ),
    ).toBe('fire');
  });
});
