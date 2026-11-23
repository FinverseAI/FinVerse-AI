"use client";

import { useEffect, useRef, useState } from "react";
import { dateKey } from "./spending-data";
import { money, type Transaction } from "./data";
import { Icon, PanelHeading } from "./ui";
import { Modal } from "./modal";
import { TransactionForm } from "./dashboard-dialog";
import { aiErrorMessage, aiRequest, ReasoningIndicator } from "./ai-chat";
import { isExpenseExtraction, type ExpenseExtraction } from "../../../lib/ai";
import {
  extractionToTransaction,
  getSpeechRecognitionConstructor,
  startListening,
} from "../../../lib/expense-entry";
import { readReceiptText } from "../../../lib/receipt-ocr";

/**
 * Add an expense in plain words: type it, speak it, or photograph a
 * receipt. The text is understood (by the model, or by a local
 * matcher when the model is unavailable), the user reviews what was
 * understood, then saves it like any other transaction. The confirm
 * step is the guardrail — nothing extracted reaches the database
 * unreviewed. Receipt photos never leave the device: the text is read
 * in the browser.
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
  const [listening, setListening] = useState(false);
  const [readingReceipt, setReadingReceipt] = useState(false);
  const stopListeningRef = useRef<(() => void) | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  // A listening session never outlives the panel.
  useEffect(
    () => () => {
      stopListeningRef.current?.();
    },
    [],
  );

  function toggleListening() {
    if (listening) {
      stopListeningRef.current?.();
      stopListeningRef.current = null;
      setListening(false);
      return;
    }
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setError(
        "Voice entry isn't available in this browser — type the expense instead. Chrome, Edge, and Safari support voice entry.",
      );
      return;
    }
    setError("");
    setNotice("");
    setListening(true);
    try {
      stopListeningRef.current = startListening(Recognition, {
        onTranscript: (transcript) => {
          setText(transcript);
        },
        onError: (code) => {
          if (code === "not-allowed") {
            setError(
              "Microphone access was denied. Allow microphone access in your browser to use voice entry.",
            );
          } else if (code !== "aborted") {
            setError(
              "Couldn't hear that clearly — please try again or type the expense.",
            );
          }
        },
        onEnd: () => {
          stopListeningRef.current = null;
          setListening(false);
        },
      });
    } catch {
      stopListeningRef.current = null;
      setListening(false);
      setError("Voice entry couldn't start — please try again.");
    }
  }

  async function extract(input: string): Promise<boolean> {
    const trimmed = input.trim();
    if (!trimmed || extracting) return false;
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
      return true;
    } catch (caught: unknown) {
      setError(aiErrorMessage(caught));
      return false;
    } finally {
      setExtracting(false);
    }
  }

  async function readReceipt(file: File | undefined) {
    if (!file || readingReceipt) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image. Choose a photo of the receipt.");
      return;
    }
    setError("");
    setNotice("");
    setReadingReceipt(true);
    try {
      const ocrText = await readReceiptText(file);
      if (!ocrText.trim()) {
        setError(
          "Couldn't read any text from that photo — try a clearer, well-lit photo of the receipt.",
        );
        return;
      }
      // The extraction endpoint caps text at 2,000 characters; receipts
      // longer than that are trimmed to the first 2,000.
      const understood = await extract(ocrText.slice(0, 2000));
      if (!understood) {
        // Show what was read so the user can fix it by hand.
        setText(ocrText.replace(/\s+/g, " ").trim().slice(0, 500));
      }
    } catch {
      setError(
        "Couldn't read that receipt — the text recognition couldn't load. Check your connection and try again.",
      );
    } finally {
      setReadingReceipt(false);
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
              type="button"
              className={`dash-icon-button shrink-0 ${listening ? "!text-dash-red" : ""}`}
              aria-label={listening ? "Stop listening" : "Speak the expense"}
              title={
                listening
                  ? "Stop listening"
                  : "Speak the expense (Chrome, Edge, Safari)"
              }
              onClick={toggleListening}
              disabled={disabled || extracting || readingReceipt}
            >
              <Icon name="mic" className="size-4" />
            </button>
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Choose a receipt photo"
              disabled={disabled || extracting || readingReceipt}
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Reset so picking the same photo twice still fires.
                event.target.value = "";
                void readReceipt(file);
              }}
            />
            <button
              type="button"
              className="dash-icon-button shrink-0"
              aria-label="Photograph a receipt"
              title="Photograph a receipt — the photo never leaves your device"
              onClick={() => receiptInputRef.current?.click()}
              disabled={disabled || extracting || readingReceipt}
            >
              <Icon name="image" className="size-4" />
            </button>
            <button
              type="submit"
              className="dash-small-button shrink-0"
              disabled={
                disabled || extracting || readingReceipt || !text.trim()
              }
            >
              {extracting ? "Reading…" : "Add expense"}
            </button>
          </div>
          <p className="mt-2 text-xs text-dash-muted">
            Type, speak, or photograph a receipt. Voice is transcribed in your
            browser and receipt photos never leave your device — FinVerse does
            not store any audio or photos. You review everything before it is
            saved.
          </p>
        </form>
        <div className="mt-3" aria-live="polite">
          {extracting && <ReasoningIndicator />}
          {readingReceipt && !extracting && (
            <p role="status" className="text-sm text-dash-muted">
              Reading the receipt… this takes a few seconds the first time.
            </p>
          )}
          {listening && !extracting && (
            <p role="status" className="text-sm text-dash-muted">
              Listening… speak now, then tap the microphone to stop.
            </p>
          )}
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
