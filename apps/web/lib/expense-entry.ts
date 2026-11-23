import type { ExpenseExtraction } from "./ai";

export type TransactionInput = {
  name: string;
  category: string;
  amount: number;
  date: string;
};

/**
 * Turn a confirmed extraction into the transaction it saves as:
 * expenses are negative, the merchant becomes the name (or "Expense"
 * when there is none), and a missing date falls back to today.
 */
export function extractionToTransaction(
  extraction: ExpenseExtraction,
  today: string,
): TransactionInput {
  return {
    name: extraction.merchant?.trim() || "Expense",
    category: extraction.category,
    amount: -Math.abs(extraction.amount),
    date: extraction.date ?? today,
  };
}

type SpeechScope = {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
};

/**
 * Whether this browser can transcribe speech in-page (Chrome, Edge,
 * and Safari expose it; Firefox does not). The scope parameter exists
 * so tests can pass a fake window; in the app it defaults to the real
 * one.
 */
export function speechRecognitionSupported(
  scope: SpeechScope = globalThis as unknown as SpeechScope,
): boolean {
  return Boolean(scope.SpeechRecognition ?? scope.webkitSpeechRecognition);
}
