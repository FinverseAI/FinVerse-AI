"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cents,
  fetchProfile,
  ProfileApiError,
  type FinancialGoal,
  type ProfileInput,
} from "../../../lib/profile";
import { budgetPlan, budgetCategories } from "../../../lib/onboarding";
import BudgetFields from "./budget-fields";
import { Icon, ProgressBar, type IconName } from "../dashboard/ui";

const steps: {
  label: string;
  title: string;
  description: string;
  icon: IconName;
}[] = [
  {
    label: "Your name",
    title: "What should we call you?",
    description: "This name shows up across your FinVerse experience.",
    icon: "user",
  },
  {
    label: "Monthly income",
    title: "What's your monthly income?",
    description:
      "Give your monthly plan a starting point, and tell us when you get paid.",
    icon: "wallet",
  },
  {
    label: "Budget split",
    title: "Split your budget",
    description:
      "Decide what share of your monthly income each category gets. The shares must add up to exactly 100%.",
    icon: "pie",
  },
  {
    label: "Goals",
    title: "Set your first goals",
    description:
      "What are you saving toward? Add at least one — you can add more later.",
    icon: "target",
  },
];
const blankSplit = () =>
  Object.fromEntries(budgetCategories.map(({ id }) => [id, 0]));
const validMoney = (value: string) =>
  /^\d{1,10}(\.\d{1,2})?$/.test(value) && cents(value) > 0;
function newGoal(): FinancialGoal & { key: string } {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return {
    key: crypto.randomUUID(),
    name: "",
    target_amount: "",
    target_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    priority: "medium",
  };
}

export default function OnboardingForm({
  initialName = "",
}: {
  initialName?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [income, setIncome] = useState("");
  const [payday, setPayday] = useState(1);
  const [split, setSplit] = useState(blankSplit);
  const [goals, setGoals] = useState<ReturnType<typeof newGoal>[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const total = Object.values(split).reduce((sum, value) => sum + value, 0);
  const normalizedIncome = income.replace(/,/g, "");
  const active = steps[step]!;

  function move(next: number) {
    setStep(next);
    setErrors({});
    setMessage("");
    requestAnimationFrame(() => heading.current?.focus());
  }
  function clear(key: string) {
    setErrors((current) => ({ ...current, [key]: "" }));
  }
  function errorFor(key: string) {
    return errors[key] ? (
      <p
        id={`error-${key}`}
        role="alert"
        className="mt-2 text-xs text-dash-red"
      >
        {errors[key]}
      </p>
    ) : null;
  }
  function fieldA11y(key: string) {
    return {
      "aria-invalid": Boolean(errors[key]),
      "aria-describedby": errors[key] ? `error-${key}` : undefined,
    };
  }
  function validate(index: number) {
    const result: Record<string, string> = {};
    if (index === 0 && (!name.trim() || name.trim().length > 80))
      result.display_name =
        "Please enter your name to continue (up to 80 characters).";
    if (index === 1) {
      if (!validMoney(normalizedIncome))
        result.monthly_income =
          "Enter an income greater than ₹0, up to ₹9,999,999,999.99, with at most two decimal places.";
      if (!Number.isInteger(payday) || payday < 1 || payday > 28)
        result.payday = "Choose a payday between 1 and 28.";
    }
    if (index === 2 && total !== 100)
      result.budget_split = "Your budget split must add up to exactly 100%.";
    if (index === 3) {
      if (!goals.length || goals.length > 50)
        result.goals = "Add at least one goal to finish setting up (up to 50).";
      goals.forEach((goal, i) => {
        if (!goal.name.trim() || goal.name.trim().length > 80)
          result[`goals.${i}.name`] =
            "Every goal needs a name of up to 80 characters.";
        if (!validMoney(goal.target_amount.replace(/,/g, "")))
          result[`goals.${i}.target_amount`] =
            "Enter a target greater than ₹0, with at most two decimal places.";
        const date = new Date(`${goal.target_date}T00:00:00.000Z`);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(goal.target_date) ||
          !Number.isFinite(date.getTime()) ||
          date.toISOString().slice(0, 10) !== goal.target_date ||
          date.getUTCFullYear() < 1900
        )
          result[`goals.${i}.target_date`] =
            "Pick a valid deadline (year 1900 onwards).";
      });
    }
    return result;
  }
  async function submit() {
    if (submitting.current) return;
    for (const index of step === 3 ? [0, 1, 2, 3] : [step]) {
      const nextErrors = validate(index);
      if (Object.keys(nextErrors).length) {
        move(index);
        setErrors(nextErrors);
        return;
      }
    }
    if (step < 3) {
      move(step + 1);
      return;
    }
    submitting.current = true;
    setSaving(true);
    setMessage("");
    const payload: ProfileInput = {
      display_name: name.trim(),
      payday,
      ...budgetPlan(normalizedIncome, split),
      employment_type: "salaried",
      monthly_income: normalizedIncome,
      other_monthly_income: null,
      existing_debt_total: null,
      current_savings: "0",
      investment_experience: "none",
      risk_tolerance: "low",
      already_investing: false,
      invested_amount: null,
      emergency_fund_months: "0",
      goals: goals.map((goal) => ({
        name: goal.name.trim(),
        target_amount: goal.target_amount.replace(/,/g, ""),
        target_date: goal.target_date,
        priority: goal.priority,
      })),
    };
    try {
      await fetchProfile("POST", payload);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      if (error instanceof ProfileApiError) {
        const key = Object.keys(error.fields)[0];
        if (key) {
          move(
            key === "display_name"
              ? 0
              : ["monthly_income", "payday"].includes(key)
                ? 1
                : key === "budget_split"
                  ? 2
                  : 3,
          );
          setErrors(error.fields);
        }
        setMessage(
          error.status === 401
            ? "Your session has expired. Log in again in another tab, then retry; your answers will remain here."
            : error.status === 409
              ? "Your setup is already saved. Open the dashboard to continue."
              : error.message,
        );
      } else
        setMessage(
          "Couldn't finish setup. Your answers are still here; please try again.",
        );
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="onboarding-layout">
      <aside className="onboarding-guide">
        <Link
          href="/"
          className="inline-flex items-center gap-3 text-lg font-semibold tracking-tight"
        >
          <span className="onboarding-brand">
            <Icon name="chart" className="size-5" />
          </span>
          FinVerse<span className="text-dash-accent">.</span>
        </Link>
        <div className="mt-10 hidden lg:block">
          <p className="dash-eyebrow text-dash-accent">
            A little clarity goes a long way
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-medium tracking-tight">
            Your money.
            <br />
            Your plans.
            <br />
            <span className="text-dash-accent">Your next chapter.</span>
          </h1>
          <p className="mt-5 max-w-xs text-sm leading-6 text-dash-muted">
            Four small steps to a financial picture that feels like you.
          </p>
        </div>
        <ol className="onboarding-step-list" aria-label="Setup steps">
          {steps.map((item, index) => (
            <li
              key={item.label}
              aria-current={index === step ? "step" : undefined}
              data-complete={index < step}
            >
              <span className="onboarding-step-number">
                {index < step ? "✓" : String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="hidden text-xs text-dash-muted lg:block">
                  {index < step
                    ? "Ready"
                    : index === step
                      ? "You are here"
                      : "Up next"}
                </span>
              </div>
            </li>
          ))}
        </ol>
        <div className="surface-inset mt-auto hidden border p-5 lg:block">
          <Icon name="bulb" className="mb-3 size-5 text-dash-accent" />
          <p className="text-sm">A starting point, not a forever plan.</p>
          <p className="mt-2 text-xs leading-5 text-dash-muted">
            You can update your financial details and goals from your dashboard
            anytime.
          </p>
        </div>
      </aside>
      <section
        className="dash-panel dash-highlight onboarding-card onboarding-workspace"
        aria-labelledby="onboarding-heading"
      >
        <form
          className="dash-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="mb-4">
            <div className="mb-3 flex justify-between text-xs text-dash-muted">
              <span>Getting started</span>
              <span>Step {step + 1} of 4</span>
            </div>
            <ProgressBar value={(step + 1) * 25} label="Onboarding progress" />
          </div>
          <div className="onboarding-step-icon">
            <Icon name={active.icon} className="size-6" />
          </div>
          <div className="mb-3">
            <h2
              id="onboarding-heading"
              ref={heading}
              tabIndex={-1}
              className="text-title leading-tight font-medium tracking-tight"
            >
              {active.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-dash-muted">
              {active.description}
            </p>
          </div>
          <fieldset disabled={saving} className="min-w-0 space-y-5">
            <legend className="sr-only">{active.label}</legend>
            {step === 0 && (
              <>
                <label>
                  Display name
                  <input
                    className="dash-input w-full"
                    autoComplete="name"
                    name="display_name"
                    placeholder="e.g. John Doe"
                    maxLength={80}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      clear("display_name");
                    }}
                    {...fieldA11y("display_name")}
                  />
                  {errorFor("display_name")}
                </label>
                <div className="onboarding-note">
                  <Icon
                    name="user"
                    className="size-5 shrink-0 text-dash-accent"
                  />
                  <p>
                    {name.trim()
                      ? `Welcome, ${name.trim()}. Let's make room for what matters to you.`
                      : "A familiar name. A fresh start for your finances."}
                  </p>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <label>
                  Monthly income (₹)
                  <input
                    className="dash-input onboarding-income-input w-full"
                    inputMode="decimal"
                    name="monthly_income"
                    placeholder="e.g. 50,000"
                    value={income}
                    onChange={(event) => {
                      setIncome(event.target.value);
                      clear("monthly_income");
                    }}
                    {...fieldA11y("monthly_income")}
                  />
                  {errorFor("monthly_income")}
                </label>
                <label>
                  Payday (day of month)
                  <select
                    className="dash-input w-full"
                    value={payday}
                    onChange={(event) => {
                      setPayday(Number(event.target.value));
                      clear("payday");
                    }}
                    {...fieldA11y("payday")}
                  >
                    {Array.from({ length: 28 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        Day {index + 1}
                      </option>
                    ))}
                  </select>
                  {errorFor("payday")}
                </label>
                <div className="onboarding-note">
                  <Icon
                    name="calendar"
                    className="size-5 shrink-0 text-dash-accent"
                  />
                  <p>
                    Your monthly income and payday become part of your financial
                    plan. Days 1–28 work in every month.
                  </p>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <BudgetFields
                  income={normalizedIncome}
                  split={split}
                  onChange={(next) => {
                    setSplit(next);
                    clear("budget_split");
                  }}
                />
                {errorFor("budget_split")}
              </>
            )}
            {step === 3 && (
              <>
                {!goals.length && (
                  <div className="onboarding-empty">
                    <Icon
                      name="target"
                      className="mx-auto mb-3 size-8 text-dash-accent"
                    />
                    <p className="text-sm">Give your next milestone a name.</p>
                    <p className="mt-2 text-xs leading-5 text-dash-muted">
                      An emergency fund, a dream trip, or a place of your own.
                    </p>
                  </div>
                )}
                {goals.map((goal, index) => {
                  const update = (
                    key: "name" | "target_amount" | "target_date",
                    value: string,
                  ) => {
                    setGoals((current) =>
                      current.map((item) =>
                        item.key === goal.key
                          ? { ...item, [key]: value }
                          : item,
                      ),
                    );
                    clear(`goals.${index}.${key}`);
                  };
                  return (
                    <fieldset
                      key={goal.key}
                      className="surface-inset min-w-0 space-y-4 border p-4 sm:p-5"
                    >
                      <legend className="sr-only">Goal {index + 1}</legend>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-dash-accent">
                          Goal {String(index + 1).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          className="dash-icon-button"
                          aria-label={`Remove ${goal.name || `goal ${index + 1}`}`}
                          onClick={() => {
                            setGoals((current) =>
                              current.filter((item) => item.key !== goal.key),
                            );
                            setErrors({});
                          }}
                        >
                          <Icon name="close" />
                        </button>
                      </div>
                      <label>
                        Goal name
                        <input
                          className="dash-input w-full"
                          placeholder="e.g. Emergency fund"
                          maxLength={80}
                          value={goal.name}
                          onChange={(event) =>
                            update("name", event.target.value)
                          }
                          {...fieldA11y(`goals.${index}.name`)}
                        />
                        {errorFor(`goals.${index}.name`)}
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                          Target (₹)
                          <input
                            className="dash-input w-full"
                            inputMode="decimal"
                            placeholder="e.g. 2,00,000"
                            value={goal.target_amount}
                            onChange={(event) =>
                              update("target_amount", event.target.value)
                            }
                            {...fieldA11y(`goals.${index}.target_amount`)}
                          />
                          {errorFor(`goals.${index}.target_amount`)}
                        </label>
                        <label>
                          Deadline
                          <input
                            className="dash-input w-full"
                            type="date"
                            min="1900-01-01"
                            max="9999-12-31"
                            value={goal.target_date}
                            onChange={(event) =>
                              update("target_date", event.target.value)
                            }
                            {...fieldA11y(`goals.${index}.target_date`)}
                          />
                          {errorFor(`goals.${index}.target_date`)}
                        </label>
                      </div>
                    </fieldset>
                  );
                })}
                {errorFor("goals")}
                <button
                  type="button"
                  className="dash-small-button min-h-11 w-full gap-2"
                  disabled={goals.length >= 50}
                  onClick={() => {
                    setGoals((current) => [...current, newGoal()]);
                    clear("goals");
                  }}
                >
                  <Icon name="plus" />
                  Add a goal
                </button>
              </>
            )}
          </fieldset>
          {message && (
            <div
              role="alert"
              className="rounded-2xl border border-dash-red/30 p-4 text-sm text-dash-red"
            >
              <p>{message}</p>
              <div className="mt-3 flex gap-4">
                <a
                  href="/auth/login"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Log in
                </a>
                <a href="/dashboard" className="underline">
                  Open dashboard
                </a>
              </div>
            </div>
          )}
          <div className="onboarding-actions">
            <button
              type="button"
              className="dash-small-button gap-1"
              disabled={step === 0 || saving}
              onClick={() => move(step - 1)}
            >
              <Icon name="left" />
              Back
            </button>
            <button
              type="submit"
              className="dash-primary min-h-12 min-w-40 gap-3"
              disabled={saving || (step === 2 && total !== 100)}
            >
              {saving ? "Finishing…" : step === 3 ? "Finish setup" : "Continue"}
              {!saving && <Icon name="right" />}
            </button>
          </div>
          <p className="text-center text-xs text-dash-muted" role="status">
            {saving
              ? "Saving your name, income, budgets, and goals…"
              : "Your answers are saved together when you finish setup."}
          </p>
        </form>
      </section>
    </div>
  );
}
