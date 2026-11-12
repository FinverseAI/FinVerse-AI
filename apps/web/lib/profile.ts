export type FinancialGoal = {
  id?: string;
  name: string;
  target_amount: string;
  target_date: string;
  priority: "low" | "medium" | "high";
};

export type FinancialProfile = {
  employment_type: "salaried" | "self-employed" | "student" | "other";
  monthly_income: string;
  other_monthly_income: string | null;
  fixed_expenses: string;
  variable_expenses: string;
  existing_debt_total: string | null;
  current_savings: string;
  monthly_savings_target: string;
  investment_experience: "none" | "beginner" | "intermediate" | "advanced";
  risk_tolerance: "low" | "medium" | "high";
  already_investing: boolean;
  invested_amount: string | null;
  emergency_fund_months: "0" | "1-3" | "3-6" | "6+";
};

export type ProfileInput = FinancialProfile & { goals: FinancialGoal[] };
export type ProfileResponse = {
  profile:
    (FinancialProfile & { created_at: string; updated_at: string }) | null;
  goals: FinancialGoal[];
  onboarding_completed: boolean;
};

export const profileKeys = [
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
      profileKeys.map((key) => [key, data.profile![key]]),
    ) as FinancialProfile),
    goals: data.goals.map(({ name, target_amount, target_date, priority }) => ({
      name,
      target_amount,
      target_date,
      priority,
    })),
  };
}

export function cents(value: string | null): number {
  const [whole = "0", fraction = ""] = (value || "0").split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
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
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
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
