import { BadRequestException } from '@nestjs/common';
import { validateProfile } from './profile.validation';

export const validProfile = () => ({
  employment_type: 'self-employed',
  monthly_income: '60000.10',
  other_monthly_income: '0.20',
  fixed_expenses: '20000.10',
  variable_expenses: '10000.10',
  existing_debt_total: null,
  current_savings: '100000.00',
  monthly_savings_target: '30000.10',
  investment_experience: 'beginner',
  risk_tolerance: 'medium',
  already_investing: false,
  invested_amount: null,
  emergency_fund_months: '1-3',
  goals: [
    {
      name: ' Emergency fund ',
      target_amount: '180000.00',
      target_date: '2028-02-29',
      priority: 'high',
    },
  ],
});

describe('financial profile validation', () => {
  const split = {
    food: 10,
    groceries: 10,
    transport: 5,
    shopping: 5,
    bills: 10,
    rent: 30,
    health: 5,
    entertainment: 5,
    travel: 5,
    education: 5,
    investments: 5,
    others: 5,
  };
  it('accepts the reference onboarding categories and normalizes the display name', () => {
    const result = validateProfile({
      ...validProfile(),
      display_name: ' Alex ',
      payday: 31,
      budget_split: split,
    });
    expect(result.displayName).toBe('Alex');
    expect(result.profile.payday).toBe(31);
    expect(result.profile.budget_split).toEqual(split);
    expect(result.profile.fixed_expenses.toFixed(2)).toBe('24000.04');
    expect(result.profile.monthly_savings_target.toFixed(2)).toBe('3000.00');
    expect(
      result.profile.fixed_expenses
        .plus(result.profile.variable_expenses)
        .plus(result.profile.monthly_savings_target)
        .toFixed(2),
    ).toBe('60000.10');
  });
  it.each([
    { display_name: ' ' },
    { display_name: 123 },
    { display_name: 'a'.repeat(81) },
    { payday: 0 },
    { payday: 32 },
    { payday: 1.5 },
    { payday: '1' },
    { budget_split: { ...split, rent: 29 } },
    { budget_split: { ...split, rent: 31 } },
    { budget_split: { ...split, rent: 30.5, food: 9.5 } },
    { budget_split: { ...split, food: -1, rent: 41 } },
    { budget_split: { ...split, unknown: 0 } },
    { budget_split: {} },
    { budget_split: null },
  ])('rejects invalid onboarding details %p', (fields) => {
    expect(() => validateProfile({ ...validProfile(), ...fields })).toThrow(
      BadRequestException,
    );
  });
  it('handles exact decimal budgets and normalizes enum values and goal names', () => {
    const result = validateProfile(validProfile());
    expect(result.profile.employment_type).toBe('self_employed');
    expect(result.profile.emergency_fund_months).toBe('one_to_three');
    expect(result.profile.monthly_savings_target.toFixed(2)).toBe('30000.10');
    expect(result.goals[0].name).toBe('Emergency fund');
  });

  it.each(['-1', '1.001', '10000000000', '1e3', '', null, true, NaN, Infinity])(
    'rejects invalid money %p',
    (value) => {
      expect(() =>
        validateProfile({ ...validProfile(), monthly_income: value }),
      ).toThrow(BadRequestException);
    },
  );

  it('accepts a zero-income student with no monthly commitments', () => {
    expect(() =>
      validateProfile({
        ...validProfile(),
        employment_type: 'student',
        monthly_income: '0',
        other_monthly_income: null,
        fixed_expenses: '0',
        variable_expenses: '0',
        monthly_savings_target: '0',
      }),
    ).not.toThrow();
  });

  it.each([
    { user_id: 'another-user' },
    { onboarding_completed: true },
    { employment_type: 'toString' },
    { risk_tolerance: 'extreme' },
    { emergency_fund_months: '12' },
    { already_investing: 'yes' },
    { invested_amount: '100' },
    { goals: [] },
    { monthly_savings_target: '30000.11' },
    { fixed_expenses: '60001' },
  ])('rejects invalid fields %p', (fields) => {
    expect(() => validateProfile({ ...validProfile(), ...fields })).toThrow(
      BadRequestException,
    );
  });

  it.each(['2027-02-29', '2028-02-30', 'invalid', '2028-13-01', '0000-01-01'])(
    'rejects invalid dates %s',
    (date) => {
      const input = validProfile();
      input.goals[0].target_date = date;
      expect(() => validateProfile(input)).toThrow(BadRequestException);
    },
  );

  it('returns field-level errors and rejects zero goal targets', () => {
    const input = validProfile();
    input.goals[0].target_amount = '0';
    try {
      validateProfile(input);
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        errors: { 'goals.0.target_amount': expect.any(String) },
      });
    }
  });

  it('rejects a goal target date that is today or in the past (B39)', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const target_date of [today, '2020-01-01', '2026-11-25']) {
      const input = validProfile();
      input.goals[0].target_date = target_date;
      expect(() => validateProfile(input)).toThrow(BadRequestException);
    }
    const input = validProfile();
    input.goals[0].target_date = '2030-01-01';
    expect(() => validateProfile(input)).not.toThrow();
  });

  it('rejects duplicate goal ids in one payload (B43)', () => {
    const input = validProfile();
    const goals = input.goals as unknown as Array<{
      id?: string;
      name: string;
      target_amount: string;
      target_date: string;
      priority: string;
    }>;
    goals.push({
      id: 'goal-1',
      name: 'Holiday',
      target_amount: '50000.00',
      target_date: '2029-01-01',
      priority: 'medium',
    });
    goals[0] = { ...goals[0], id: 'goal-1' };
    expect(() => validateProfile(input)).toThrow(BadRequestException);
  });

  it('can keep an existing goal with a past deadline while editing a profile', () => {
    const input = validProfile();
    const goal = { ...input.goals[0], id: 'goal-1', target_date: '2020-01-01' };
    const dates = new Map([[goal.id, goal.target_date]]);
    expect(() =>
      validateProfile({ ...input, goals: [goal] }, dates),
    ).not.toThrow();
    expect(() =>
      validateProfile(
        { ...input, goals: [{ ...goal, target_date: '2020-01-02' }] },
        dates,
      ),
    ).toThrow(BadRequestException);
  });

  it('stores unasked enum/savings questions as unknown instead of false data (B47)', () => {
    const input = validProfile();
    delete (input as Record<string, unknown>).employment_type;
    delete (input as Record<string, unknown>).investment_experience;
    delete (input as Record<string, unknown>).risk_tolerance;
    delete (input as Record<string, unknown>).emergency_fund_months;
    (input as Record<string, unknown>).current_savings = null;
    (input as Record<string, unknown>).existing_debt_total = null;
    const result = validateProfile(input);
    expect(result.profile.employment_type).toBeNull();
    expect(result.profile.investment_experience).toBeNull();
    expect(result.profile.risk_tolerance).toBeNull();
    expect(result.profile.emergency_fund_months).toBeNull();
    expect(result.profile.current_savings).toBeNull();
    expect(result.profile.existing_debt_total).toBeNull();
    // A present-but-invalid value is still an error, not unknown.
    expect(() =>
      validateProfile({ ...validProfile(), employment_type: 'toString' }),
    ).toThrow(BadRequestException);
  });

  it('lets the budget split own the derived amounts and returns it (B42)', () => {
    // Submitted fixed/variable/savings deliberately disagree with
    // the split: the split wins and the amounts are recomputed.
    const result = validateProfile({
      ...validProfile(),
      fixed_expenses: '1',
      variable_expenses: '1',
      monthly_savings_target: '1',
      budget_split: split,
    });
    expect(result.profile.budget_split).toEqual(split);
    expect(result.profile.fixed_expenses.toFixed(2)).toBe('24000.04');
    expect(result.profile.monthly_savings_target.toFixed(2)).toBe('3000.00');
  });
});
