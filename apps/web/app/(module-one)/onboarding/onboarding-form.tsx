"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cents,
  fetchProfile,
  ProfileApiError,
  profileInput,
  type ProfileInput,
  type ProfileResponse,
} from "../../../lib/profile";
import { ProgressBar } from "../dashboard/ui";

const steps = ["Income", "Expenses", "Savings and goals", "Investing profile"];
const emptyGoal = () => ({
  name: "",
  target_amount: "",
  target_date: "",
  priority: "medium" as const,
});
const initial: ProfileInput = {
  employment_type: "salaried",
  monthly_income: "",
  other_monthly_income: null,
  fixed_expenses: "",
  variable_expenses: "",
  existing_debt_total: null,
  current_savings: "",
  monthly_savings_target: "",
  goals: [emptyGoal()],
  investment_experience: "none",
  risk_tolerance: "low",
  already_investing: false,
  invested_amount: null,
  emergency_fund_months: "0",
};
const moneyFields = [
  ["monthly_income", "Monthly income after tax", 0, false],
  ["other_monthly_income", "Other monthly income (optional)", 0, true],
  ["fixed_expenses", "Monthly fixed expenses", 1, false],
  ["variable_expenses", "Monthly variable expenses", 1, false],
  ["existing_debt_total", "Outstanding debt total (optional)", 1, true],
  ["current_savings", "Current savings", 2, false],
  ["monthly_savings_target", "Monthly savings target", 2, false],
  ["invested_amount", "Approximate invested amount (optional)", 3, true],
] as const;
const choiceFields = [
  [
    "employment_type",
    "Employment type",
    0,
    ["salaried", "self-employed", "student", "other"],
  ],
  [
    "investment_experience",
    "Investment experience",
    3,
    ["none", "beginner", "intermediate", "advanced"],
  ],
  ["risk_tolerance", "Risk tolerance", 3, ["low", "medium", "high"]],
  [
    "emergency_fund_months",
    "Emergency fund in months",
    3,
    ["0", "1-3", "3-6", "6+"],
  ],
] as const;

function validAmount(value: string | null, optional = false) {
  return (
    (optional && !value) ||
    (value !== null && /^\d{1,10}(\.\d{1,2})?$/.test(value))
  );
}

function validateStep(values: ProfileInput, step: number) {
  const errors: Record<string, string> = {};
  for (const [key, , fieldStep, optional] of moneyFields) {
    if (fieldStep === step && !validAmount(values[key], optional))
      errors[key] =
        "Enter 0 to 9,999,999,999.99, with at most two decimal places.";
  }
  const income =
    cents(values.monthly_income) + cents(values.other_monthly_income);
  const expenses =
    cents(values.fixed_expenses) + cents(values.variable_expenses);
  if (step === 1 && expenses > income)
    errors.variable_expenses =
      "Fixed and variable expenses cannot exceed total monthly income.";
  if (step === 2) {
    if (expenses + cents(values.monthly_savings_target) > income)
      errors.monthly_savings_target =
        "Expenses and savings target together cannot exceed total monthly income.";
    if (!values.goals.length || values.goals.length > 50)
      errors.goals = "Add between 1 and 50 goals.";
    values.goals.forEach((goal, index) => {
      const prefix = `goals.${index}`;
      if (!goal.name.trim() || goal.name.trim().length > 100)
        errors[`${prefix}.name`] = "Enter a goal name of 1 to 100 characters.";
      if (!validAmount(goal.target_amount) || cents(goal.target_amount) <= 0)
        errors[`${prefix}.target_amount`] =
          "Enter a target greater than zero, with at most two decimal places.";
      const date = new Date(`${goal.target_date}T00:00:00.000Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(goal.target_date) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== goal.target_date ||
        date.getUTCFullYear() < 1900
      )
        errors[`${prefix}.target_date`] =
          "Enter a valid date from year 1900 onwards.";
    });
  }
  return errors;
}

function stepForField(key: string) {
  if (key.startsWith("goals")) return 2;
  return (
    moneyFields.find(([name]) => name === key)?.[2] ??
    choiceFields.find(([name]) => name === key)?.[2] ??
    3
  );
}

export default function OnboardingForm({
  initialData,
  initialStep = 0,
  onSaved,
  onCancel,
}: {
  initialData?: ProfileResponse;
  initialStep?: number;
  onSaved?: (data: ProfileResponse) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileInput>(() =>
    initialData ? profileInput(initialData) : initial,
  );
  const [step, setStep] = useState(initialStep);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const editing = Boolean(initialData?.onboarding_completed);

  function move(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  function change<K extends keyof ProfileInput>(
    key: K,
    value: ProfileInput[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function errorFor(key: string) {
    return errors[key] ? (
      <span
        id={`error-${key}`}
        className="block text-xs text-dash-red"
        role="alert"
      >
        {errors[key]}
      </span>
    ) : null;
  }

  async function submit() {
    if (submitting.current) return;
    const nextErrors =
      step === 3
        ? (Object.assign(
            {},
            ...steps.map((_, index) => validateStep(values, index)),
          ) as Record<string, string>)
        : validateStep(values, step);
    setErrors(nextErrors);
    setMessage("");
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      move(stepForField(firstError));
      return;
    }
    if (step < 3) {
      move(step + 1);
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const result = await fetchProfile(editing ? "PUT" : "POST", values);
      if (onSaved) onSaved(result);
      else {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (error) {
      if (error instanceof ProfileApiError) {
        setErrors(error.fields);
        const field = Object.keys(error.fields)[0];
        if (field) move(stepForField(field));
        if (error.status === 401) {
          setMessage(
            "Your session has expired. Log in again in another tab, then retry; your answers will remain here.",
          );
        } else if (error.status === 409 && !editing) {
          setMessage(
            "Your profile was already saved. Open the dashboard to continue.",
          );
        } else setMessage(error.message);
      } else setMessage("Unable to save your profile. Please try again.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      className="dash-form space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="onboarding-progress">
        <p className="mb-2 text-xs text-dash-muted">Step {step + 1} of 4</p>
        <ProgressBar
          value={(step + 1) * 25}
          label="Financial profile progress"
        />
        <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dash-muted">
          {steps.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              className={index === step ? "text-dash-accent" : ""}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      </div>
      <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold">
        {steps[step]}
      </h2>
      <fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
        <legend className="sr-only">{steps[step]}</legend>
        {choiceFields
          .filter(([, , fieldStep]) => fieldStep === step)
          .map(([key, label, , options]) => (
            <label key={key} className="block text-sm">
              {label}
              <select
                className="dash-input mt-1 w-full"
                value={values[key]}
                onChange={(event) =>
                  change(key, event.target.value as ProfileInput[typeof key])
                }
                aria-invalid={Boolean(errors[key])}
                aria-describedby={errors[key] ? `error-${key}` : undefined}
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errorFor(key)}
            </label>
          ))}
        {step === 1 && (
          <p className="text-xs leading-5 text-dash-muted">
            Fixed expenses include rent, monthly EMIs, bills, and subscriptions.
            Variable expenses include food, travel, and shopping. Outstanding
            debt is informational; monthly EMIs are counted in fixed expenses.
          </p>
        )}
        {step === 3 && (
          <label className="block text-sm">
            Already investing?
            <select
              className="dash-input mt-1 w-full"
              value={values.already_investing ? "yes" : "no"}
              onChange={(event) => {
                const investing = event.target.value === "yes";
                setValues((current) => ({
                  ...current,
                  already_investing: investing,
                  invested_amount: investing ? current.invested_amount : null,
                }));
              }}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
            {errorFor("already_investing")}
          </label>
        )}
        {moneyFields
          .filter(
            ([key, , fieldStep]) =>
              fieldStep === step &&
              (key !== "invested_amount" || values.already_investing),
          )
          .map(([key, label, , optional]) => (
            <label key={key} className="block text-sm">
              {label} (₹)
              <input
                className="dash-input mt-1 w-full"
                name={key}
                type="number"
                inputMode="decimal"
                min="0"
                max="9999999999.99"
                step="0.01"
                required={!optional}
                value={values[key] ?? ""}
                onChange={(event) =>
                  change(
                    key,
                    event.target.value === "" && optional
                      ? null
                      : event.target.value,
                  )
                }
                aria-invalid={Boolean(errors[key])}
                aria-describedby={errors[key] ? `error-${key}` : undefined}
              />
              {errorFor(key)}
            </label>
          ))}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Goals</h3>
            {values.goals.map((goal, index) => (
              <fieldset
                key={index}
                className="clay-inset space-y-3 border border-dash-border p-5"
              >
                <legend className="px-1 text-xs">Goal {index + 1}</legend>
                {(
                  ["name", "target_amount", "target_date", "priority"] as const
                ).map((key) => {
                  const path = `goals.${index}.${key}`;
                  const update = (value: string) => {
                    change(
                      "goals",
                      values.goals.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, [key]: value } : item,
                      ),
                    );
                    setErrors((current) => ({ ...current, [path]: "" }));
                  };
                  return (
                    <label key={key} className="block text-sm">
                      {
                        {
                          name: "Goal name",
                          target_amount: "Target amount (₹)",
                          target_date: "Target date",
                          priority: "Priority",
                        }[key]
                      }
                      {key === "priority" ? (
                        <select
                          className="dash-input mt-1 w-full"
                          value={goal[key]}
                          onChange={(event) => update(event.target.value)}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      ) : (
                        <input
                          className="dash-input mt-1 w-full"
                          required
                          type={
                            key === "target_amount"
                              ? "number"
                              : key === "target_date"
                                ? "date"
                                : "text"
                          }
                          min={
                            key === "target_amount"
                              ? "0.01"
                              : key === "target_date"
                                ? "1900-01-01"
                                : undefined
                          }
                          max={
                            key === "target_amount"
                              ? "9999999999.99"
                              : key === "target_date"
                                ? "9999-12-31"
                                : undefined
                          }
                          maxLength={key === "name" ? 100 : undefined}
                          step={key === "target_amount" ? "0.01" : undefined}
                          value={goal[key]}
                          onChange={(event) => update(event.target.value)}
                          aria-invalid={Boolean(errors[path])}
                          aria-describedby={
                            errors[path] ? `error-${path}` : undefined
                          }
                        />
                      )}
                      {errorFor(path)}
                    </label>
                  );
                })}
                <button
                  className="dash-small-button"
                  type="button"
                  disabled={values.goals.length === 1}
                  onClick={() => {
                    change(
                      "goals",
                      values.goals.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    );
                    setErrors({});
                  }}
                >
                  Remove goal
                </button>
              </fieldset>
            ))}
            {errorFor("goals")}
            <button
              className="dash-small-button"
              type="button"
              disabled={values.goals.length >= 50}
              onClick={() => change("goals", [...values.goals, emptyGoal()])}
            >
              + Add goal
            </button>
          </div>
        )}
      </fieldset>
      {message && (
        <div role="alert" className="space-y-2 text-sm text-dash-red">
          <p>{message}</p>
          <div className="flex gap-4">
            <a
              href="/auth/login"
              target="_blank"
              rel="noreferrer"
              className="text-dash-accent underline"
            >
              Log in
            </a>
            <a href="/dashboard" className="text-dash-accent underline">
              Open dashboard
            </a>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            className="dash-small-button"
            type="button"
            disabled={step === 0 || saving}
            onClick={() => {
              setErrors({});
              setMessage("");
              move(step - 1);
            }}
          >
            Back
          </button>
          {onCancel && (
            <button
              className="dash-small-button"
              type="button"
              disabled={saving}
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
        <button
          className="dash-primary px-4 py-2 disabled:opacity-60"
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : step === 3
              ? editing
                ? "Save changes"
                : "Complete onboarding"
              : "Next"}
        </button>
      </div>
      {saving && (
        <p className="text-xs text-dash-muted" role="status">
          Saving your financial profile...
        </p>
      )}
    </form>
  );
}
