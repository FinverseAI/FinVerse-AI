// Stub for auth/profile-guard. The real guard reads the session cookie and
// the backend profile; the stub returns a signed-in user with a completed
// profile, or null for the auth destination (no session yet) — the two
// states the page tests need.
export const stubUser = {
  name: "Test User",
  email: "test@example.com",
  image: null,
};

export const stubProfile = {
  payday: 1,
  budget_split: {
    rent: 30,
    groceries: 15,
    food: 10,
    transport: 10,
    bills: 5,
    health: 5,
    entertainment: 5,
    shopping: 5,
    education: 5,
    travel: 5,
    investments: 5,
    others: 0,
  },
  employment_type: "salaried",
  monthly_income: "85000.00",
  other_monthly_income: "5000.00",
  fixed_expenses: "30000.00",
  variable_expenses: "20000.00",
  existing_debt_total: "0.00",
  current_savings: "150000.00",
  monthly_savings_target: "20000.00",
  investment_experience: "beginner",
  risk_tolerance: "medium",
  already_investing: true,
  invested_amount: "50000.00",
  emergency_fund_months: "3-6",
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-20T00:00:00.000Z",
};

export const stubGoals = [
  {
    id: "goal-1",
    name: "Emergency fund",
    target_amount: "300000.00",
    target_date: "2027-06-30",
    priority: "high",
    saved_amount: "150000.00",
  },
  {
    id: "goal-2",
    name: "New laptop",
    target_amount: "120000.00",
    target_date: "2027-03-31",
    priority: "medium",
    saved_amount: "40000.00",
  },
];

export const stubProfileData = {
  profile: stubProfile,
  goals: stubGoals,
  onboarding_completed: true,
};

export async function guardProfile(destination) {
  if (destination === "auth") return null;
  return { user: stubUser, data: stubProfileData };
}
