"use client";

import { useRef, useState } from "react";
import {
  budgetCategories,
  budgetPlan,
  validBudgetSplit,
} from "../../../lib/onboarding";
import {
  fetchProfile,
  profileInput,
  type ProfileResponse,
} from "../../../lib/profile";
import BudgetFields from "../onboarding/budget-fields";
import { activityError } from "./use-activity";
import { Modal } from "./modal";

export default function BudgetEditor({
  data,
  onSaved,
  onClose,
}: {
  data: ProfileResponse;
  onSaved: (data: ProfileResponse) => void;
  onClose: () => void;
}) {
  const [split, setSplit] = useState(() =>
    Object.fromEntries(
      budgetCategories.map(({ id }) => [
        id,
        data.profile?.budget_split?.[id] ?? 0,
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const income = data.profile!.monthly_income;
  const validSplit = validBudgetSplit(split);
  return (
    <Modal title="Manage budget percentages" onClose={onClose} busy={saving}>
      <form
        className="dash-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting.current || !validSplit || Number(income) <= 0) return;
          submitting.current = true;
          setSaving(true);
          setError("");
          try {
            const updated = await fetchProfile("PUT", {
              ...profileInput(data),
              ...budgetPlan(income, split),
            });
            onSaved(updated);
          } catch (error) {
            setError(activityError(error));
          } finally {
            submitting.current = false;
            setSaving(false);
          }
        }}
      >
        <fieldset disabled={saving} className="min-w-0">
          <legend className="sr-only">Budget percentages</legend>
          <BudgetFields income={income} split={split} onChange={setSplit} />
        </fieldset>
        {Number(income) <= 0 && (
          <p role="alert" className="text-sm text-dash-warning">
            Set a monthly income greater than zero in your financial profile
            before allocating a budget.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-dash-red">
            {error}
          </p>
        )}
        <button
          className="dash-primary"
          disabled={saving || !validSplit || Number(income) <= 0}
        >
          {saving ? "Saving…" : "Save budget"}
        </button>
      </form>
    </Modal>
  );
}
