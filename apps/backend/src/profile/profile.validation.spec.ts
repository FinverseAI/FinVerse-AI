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
});
