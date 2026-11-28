export type FinancialGoal = {
  id?: string;
  name: string;
  target_amount: string;
  target_date: string;
  priority: "low" | "medium" | "high";
  // Total of the goal's contributions, as an exact-paise string ("0.00"
  // when none). Set by the server; the profile form never sends it.
  saved_amount?: string;
};

export type FinancialProfile = {
  payday?: number | null;
  budget_split?: Record<string, number> | null;
  employment_type: "salaried" | "self-employed" | "student" | "other" | null;
  monthly_income: string;
  other_monthly_income: string | null;
  fixed_expenses: string;
  variable_expenses: string;
  existing_debt_total: string | null;
  current_savings: string | null;
  monthly_savings_target: string;
  investment_experience:
    "none" | "beginner" | "intermediate" | "advanced" | null;
  risk_tolerance: "low" | "medium" | "high" | null;
  already_investing: boolean;
  invested_amount: string | null;
  emergency_fund_months: "0" | "1-3" | "3-6" | "6+" | null;
};

export type ProfileInput = FinancialProfile & {
  goals: FinancialGoal[];
  display_name?: string;
};
export type ProfileResponse = {
  profile:
    (FinancialProfile & { created_at: string; updated_at: string }) | null;
  goals: FinancialGoal[];
  onboarding_completed: boolean;
};

export const profileKeys = [
  "payday",
  "budget_split",
  "employment_type",
  "monthly_income",
  "other_monthly_income",
  "fixed_expenses",
  "variable_expenses",
  "existing_debt_total",
  "current_savings",
  "monthly_savings_target",
  "investment_experience",
  "risk_tolerance",
  "already_investing",
  "invested_amount",
  "emergency_fund_months",
] as const;

export function profileInput(data: ProfileResponse): ProfileInput {
  if (!data.profile) throw new Error("Financial profile is missing.");
  return {
    ...(Object.fromEntries(
      profileKeys
        .filter(
          (key) =>
            !["payday", "budget_split"].includes(key) ||
            data.profile![key] != null,
        )
        .map((key) => [key, data.profile![key]]),
    ) as FinancialProfile),
    // Goal ids are kept so a profile save updates goals in place instead
    // of recreating them (which would wipe their contributions). New
    // goals have no id and are created by the server.
    goals: data.goals.map(
      ({ id, name, target_amount, target_date, priority }) => ({
        ...(id ? { id } : {}),
        name,
        target_amount,
        target_date,
        priority,
      }),
    ),
  };
}

export function cents(value: string | null): number {
  // The sign is handled separately: "-5.50" is -(500 + 50), not
  // -500 + 50, and the fraction is truncated to two digits, so "10.125"
  // is 1012 paise — never 1125.
  const text = (value || "0").trim();
  const sign = text.startsWith("-") ? -1 : 1;
  const unsigned = text.replace(/^[+-]/, "");
  const [whole = "0", fraction = ""] = unsigned.split(".");
  return (
    sign * (Number(whole) * 100 + Number(fraction.slice(0, 2).padEnd(2, "0")))
  );
}

export function profileTotals(profile: FinancialProfile) {
  const income =
    cents(profile.monthly_income) + cents(profile.other_monthly_income);
  const expenses =
    cents(profile.fixed_expenses) + cents(profile.variable_expenses);
  const target = cents(profile.monthly_savings_target);
  return {
    income: income / 100,
    expenses: expenses / 100,
    target: target / 100,
    savings: cents(profile.current_savings) / 100,
    surplus: (income - expenses - target) / 100,
  };
}

export class ProfileApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(
    message: string,
    status: number,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function readProfileResponse(
  response: Response,
): Promise<ProfileResponse> {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ProfileApiError(
      "The server returned an invalid response. Please try again.",
      response.status,
    );
  }
  if (!response.ok) {
    throw new ProfileApiError(
      typeof data?.message === "string"
        ? data.message
        : "Unable to load or save your financial profile.",
      response.status,
      data?.errors ?? {},
    );
  }
  if (
    !data ||
    typeof data.onboarding_completed !== "boolean" ||
    !Array.isArray(data.goals) ||
    (!data.profile && data.profile !== null) ||
    (data.onboarding_completed && !data.profile)
  ) {
    throw new ProfileApiError(
      "The server returned an incomplete profile. Please try again.",
      502,
    );
  }
  return data as ProfileResponse;
}

export async function fetchProfile(
  method: "GET" | "POST" | "PUT" = "GET",
  body?: ProfileInput,
): Promise<ProfileResponse> {
  let response: Response;
  try {
    response = await fetch(
      method === "POST" ? "/api/onboarding" : "/api/profile",
      {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20000),
      },
    );
  } catch {
    throw new ProfileApiError(
      "Could not reach the server. Your answers are still here; please try again.",
      503,
    );
  }
  return readProfileResponse(response);
}
