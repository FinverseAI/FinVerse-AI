"use client";

import { useState } from "react";
import { dateKey } from "./spending-data";
import { money, type Transaction } from "./data";
import { PanelHeading } from "./ui";
import { Modal } from "./modal";
import { TransactionForm } from "./dashboard-dialog";
import { aiErrorMessage, aiRequest, ReasoningIndicator } from "./ai-chat";
import { isExpenseExtraction, type ExpenseExtraction } from "../../../lib/ai";
import { extractionToTransaction } from "../../../lib/expense-entry";

/**
 * Add an expense in plain words: type (or, later, speak or photograph)
 * an expense, review what was understood, then save it like any other
 * transaction. The confirm step is the guardrail — nothing the model
 * or the local matcher extracts reaches the database unreviewed.
 */
export default function ExpenseEntry({
  onTransaction,
  disabled,
}: {
  onTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<ExpenseExtraction | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function extract(input: string) {
    const trimmed = input.trim();
    if (!trimmed || extracting) return;
    setError("");
    setNotice("");
    setExtracting(true);
    try {
      const data = await aiRequest<unknown>("/api/ai/extract-expense", {
        text: trimmed,
        today: dateKey(new Date()),
      });
      if (!isExpenseExtraction(data)) {
        throw new Error(
          "The AI service returned an unexpected response. Please try again.",
        );
      }
      setExtraction(data);
      setSourceText(trimmed);
    } catch (caught: unknown) {
      setError(aiErrorMessage(caught));
    } finally {
      setExtracting(false);
    }
  }

  function closeConfirm() {
    if (!saving) setExtraction(null);
  }

  const confirmed = extraction
    ? extractionToTransaction(extraction, dateKey(new Date()))
    : null;

  return (
    <>
      <section
        className="dash-panel p-5"
        aria-label="Add an expense in plain words"
        aria-busy={extracting}
      >
        <PanelHeading icon="edit" title="Add an expense in plain words" />
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            void extract(text);
          }}
        >
          <label htmlFor="expense-text" className="sr-only">
            Describe the expense
          </label>
          <div className="flex gap-2">
            <input
              id="expense-text"
              className="dash-input min-w-0 flex-1"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="e.g. coffee 250, or lunch Rs 1,250 yesterday"
              maxLength={500}
              autoComplete="off"
              disabled={disabled || extracting}
            />
            <button
              type="submit"
              className="dash-small-button shrink-0"
              disabled={disabled || extracting || !text.trim()}
            >
              {extracting ? "Reading…" : "Add expense"}
            </button>
          </div>
          <p className="mt-2 text-xs text-dash-muted">
            Type the expense as you would say it. You review everything before
            it is saved.
          </p>
        </form>
        <div className="mt-3" aria-live="polite">
          {extracting && <ReasoningIndicator />}
          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-dash-accent">
              {notice}
            </p>
          )}
        </div>
      </section>
      {extraction && confirmed && (
        <Modal title="Review this expense" onClose={closeConfirm} busy={saving}>
          <p className="mb-4 text-sm leading-7 text-dash-muted">
            From “{sourceText}” —{" "}
            {extraction.source === "ai"
              ? "read by FinVerse AI."
              : "matched on your device, because the AI is not set up yet."}{" "}
            Check the details before saving.
          </p>
          <p className="mb-4 text-sm text-dash-text">
            {money(Math.abs(confirmed.amount), 2)} · {confirmed.category} ·{" "}
            {confirmed.date}
          </p>
          <TransactionForm
            initial={{ ...confirmed, id: "extracted" }}
            submitLabel="Save expense"
            onSubmit={async (transaction) => {
              await onTransaction(transaction);
              setNotice(
                `${transaction.name} (${money(Math.abs(transaction.amount), 2)}) saved.`,
              );
              setText("");
              setExtraction(null);
            }}
            onClose={closeConfirm}
            onSavingChange={setSaving}
          />
        </Modal>
      )}
    </>
  );
}
