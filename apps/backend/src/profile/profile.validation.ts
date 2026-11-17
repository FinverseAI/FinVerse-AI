import { BadRequestException } from '@nestjs/common';
import {
  EmploymentType,
  EmergencyFundMonths,
  GoalPriority,
  InvestmentExperience,
  Prisma,
  RiskTolerance,
} from '@prisma/client';

const budgetCategoryIds = [
  'food',
  'groceries',
  'transport',
  'shopping',
  'bills',
  'rent',
  'health',
  'entertainment',
  'travel',
  'education',
  'investments',
  'others',
];

export function validateProfile(body: unknown) {
  const errors: Record<string, string> = {};
  const input =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const allowed = new Set([
    'employment_type',
    'monthly_income',
    'other_monthly_income',
    'fixed_expenses',
    'variable_expenses',
    'existing_debt_total',
    'current_savings',
    'monthly_savings_target',
    'investment_experience',
    'risk_tolerance',
    'already_investing',
    'invested_amount',
    'emergency_fund_months',
    'goals',
    'display_name',
    'payday',
    'budget_split',
  ]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) errors[key] = 'This field is not accepted.';
  }

  function amount(
    source: Record<string, unknown>,
    key: string,
    optional = false,
    path = key,
  ): Prisma.Decimal | null {
    const value = source[key];
    if (optional && (value === null || value === undefined || value === ''))
      return null;
    if (
      (typeof value !== 'string' && typeof value !== 'number') ||
      !/^\d{1,10}(\.\d{1,2})?$/.test(String(value))
    ) {
      errors[path] =
        'Enter an amount from 0 to 9,999,999,999.99 with at most two decimal places.';
      return null;
    }
    return new Prisma.Decimal(value);
  }

  function choice<T extends string>(
    key: string,
    choices: Record<string, T>,
  ): T {
    const value = input[key];
    if (typeof value !== 'string' || !Object.hasOwn(choices, value)) {
      errors[key] = 'Choose a valid option.';
      return Object.values(choices)[0];
    }
    return choices[value];
  }

  let displayName: string | undefined;
  if (input.display_name !== undefined) {
    displayName =
      typeof input.display_name === 'string' ? input.display_name.trim() : '';
    if (!displayName || displayName.length > 80)
      errors.display_name = 'Enter a display name of 1 to 80 characters.';
  }
  let payday: number | undefined;
  if (input.payday !== undefined) {
    if (
      typeof input.payday !== 'number' ||
      !Number.isInteger(input.payday) ||
      input.payday < 1 ||
      input.payday > 28
    )
      errors.payday = 'Choose a payday between 1 and 28.';
    else payday = input.payday;
  }
  let budgetSplit: Record<string, number> | undefined;
  if (input.budget_split !== undefined) {
    const raw = input.budget_split;
    if (
      !raw ||
      typeof raw !== 'object' ||
      Array.isArray(raw) ||
      Object.keys(raw).length !== budgetCategoryIds.length ||
      budgetCategoryIds.some(
        (key) =>
          !Object.hasOwn(raw, key) ||
          typeof (raw as Record<string, unknown>)[key] !== 'number' ||
          !Number.isInteger((raw as Record<string, unknown>)[key]) ||
          Number((raw as Record<string, unknown>)[key]) < 0 ||
          Number((raw as Record<string, unknown>)[key]) > 100,
      ) ||
      Object.values(raw).reduce(
        (sum: number, value) => sum + Number(value),
        0,
      ) !== 100
    ) {
      errors.budget_split =
        'Assign a whole percentage to every category, adding up to exactly 100%.';
    } else budgetSplit = raw as Record<string, number>;
  }

  const profile = {
    payday,
    budget_split: budgetSplit,
    employment_type: choice('employment_type', {
      salaried: EmploymentType.salaried,
      'self-employed': EmploymentType.self_employed,
      student: EmploymentType.student,
      other: EmploymentType.other,
    }),
    monthly_income: amount(input, 'monthly_income')!,
    other_monthly_income: amount(input, 'other_monthly_income', true),
    fixed_expenses: amount(input, 'fixed_expenses')!,
    variable_expenses: amount(input, 'variable_expenses')!,
    existing_debt_total: amount(input, 'existing_debt_total', true),
    current_savings: amount(input, 'current_savings')!,
    monthly_savings_target: amount(input, 'monthly_savings_target')!,
    investment_experience: choice(
      'investment_experience',
      InvestmentExperience,
    ),
    risk_tolerance: choice('risk_tolerance', RiskTolerance),
    already_investing: input.already_investing === true,
    invested_amount: amount(input, 'invested_amount', true),
    emergency_fund_months: choice('emergency_fund_months', {
      '0': EmergencyFundMonths.zero,
      '1-3': EmergencyFundMonths.one_to_three,
      '3-6': EmergencyFundMonths.three_to_six,
      '6+': EmergencyFundMonths.six_plus,
    }),
  };
  if (budgetSplit && profile.monthly_income) {
    const incomeCents = profile.monthly_income.times(100).toNumber();
    const allocations = budgetCategoryIds.map((key, index) => ({
      key,
      index,
      cents: Math.floor((incomeCents * budgetSplit[key]) / 100),
      remainder: (incomeCents * budgetSplit[key]) % 100,
    }));
    const remainder =
      incomeCents - allocations.reduce((sum, item) => sum + item.cents, 0);
    const ranked = [...allocations].sort(
      (a, b) => b.remainder - a.remainder || a.index - b.index,
    );
    for (let index = 0; index < remainder; index++) ranked[index].cents++;
    const amounts = Object.fromEntries(
      allocations.map((item) => [item.key, item.cents]),
    );
    const fixed = amounts.rent + amounts.bills;
    profile.fixed_expenses = new Prisma.Decimal(fixed).div(100);
    profile.monthly_savings_target = new Prisma.Decimal(
      amounts.investments,
    ).div(100);
    profile.variable_expenses = new Prisma.Decimal(
      incomeCents - fixed - amounts.investments,
    ).div(100);
  }
  if (typeof input.already_investing !== 'boolean')
    errors.already_investing = 'Choose whether you already invest.';
  if (!profile.already_investing && profile.invested_amount?.greaterThan(0))
    errors.invested_amount =
      'Select Yes for already investing, or leave this amount empty.';

  if (
    profile.monthly_income &&
    profile.fixed_expenses &&
    profile.variable_expenses &&
    profile.monthly_savings_target
  ) {
    const income = profile.monthly_income.plus(
      profile.other_monthly_income ?? 0,
    );
    const expenses = profile.fixed_expenses.plus(profile.variable_expenses);
    if (expenses.greaterThan(income))
      errors.variable_expenses =
        'Fixed and variable expenses cannot exceed total monthly income.';
    if (expenses.plus(profile.monthly_savings_target).greaterThan(income))
      errors.monthly_savings_target =
        'Expenses and savings target together cannot exceed total monthly income.';
  }

  const rawGoals = Array.isArray(input.goals) ? input.goals : [];
  if (!rawGoals.length || rawGoals.length > 50)
    errors.goals = 'Add between 1 and 50 goals.';
  const goals = rawGoals.slice(0, 50).map((raw: unknown, index: number) => {
    const goal =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    const prefix = `goals.${index}`;
    for (const key of Object.keys(goal)) {
      if (
        !['id', 'name', 'target_amount', 'target_date', 'priority'].includes(
          key,
        )
      )
        errors[`${prefix}.${key}`] = 'This field is not accepted.';
    }
    // The id is accepted so an existing goal keeps its identity (and its
    // contributions) across profile saves; it is never trusted for
    // creation — the service recreates goals without it when it matches
    // nothing owned by the user.
    const id =
      typeof goal.id === 'string' && goal.id.trim()
        ? goal.id.trim()
        : undefined;
    if (
      goal.id !== undefined &&
      (typeof goal.id !== 'string' || !goal.id.trim() || goal.id.length > 64)
    )
      errors[`${prefix}.id`] =
        'Goal IDs must be text of at most 64 characters.';
    const name = typeof goal.name === 'string' ? goal.name.trim() : '';
    if (!name || name.length > 100)
      errors[`${prefix}.name`] = 'Enter a goal name of 1 to 100 characters.';
    const target = amount(
      goal,
      'target_amount',
      false,
      `${prefix}.target_amount`,
    );
    if (target?.lessThanOrEqualTo(0))
      errors[`${prefix}.target_amount`] =
        'Goal target must be greater than zero.';
    const date =
      typeof goal.target_date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(goal.target_date)
        ? new Date(`${goal.target_date}T00:00:00.000Z`)
        : new Date(NaN);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== goal.target_date ||
      date.getUTCFullYear() < 1900
    ) {
      errors[`${prefix}.target_date`] =
        'Enter a valid target date (YYYY-MM-DD), from year 1900 onwards.';
    }
    if (
      typeof goal.priority !== 'string' ||
      !Object.hasOwn(GoalPriority, goal.priority)
    )
      errors[`${prefix}.priority`] = 'Choose low, medium, or high priority.';
    return {
      id,
      name,
      target_amount: target!,
      target_date: date,
      priority: goal.priority as GoalPriority,
    };
  });
  if (Object.keys(errors).length)
    throw new BadRequestException({
      message: 'Please correct the highlighted fields.',
      errors,
    });
  if (budgetSplit && profile.monthly_income.lessThanOrEqualTo(0))
    throw new BadRequestException({
      message: 'Please correct the highlighted fields.',
      errors: { monthly_income: 'Enter a monthly income greater than ₹0.' },
    });
  return { profile, goals, displayName };
}
