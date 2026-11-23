import assert from "node:assert/strict";
import test from "node:test";
import {
  extractionToTransaction,
  speechRecognitionSupported,
} from "../lib/expense-entry.ts";

test("an extraction becomes a negative expense transaction", () => {
  assert.deepEqual(
    extractionToTransaction(
      {
        amount: 250,
        category: "Food & Dining",
        date: "2026-11-23",
        merchant: "coffee",
        source: "ai",
      },
      "2026-11-23",
    ),
    {
      name: "coffee",
      category: "Food & Dining",
      amount: -250,
      date: "2026-11-23",
    },
  );
});

test("a missing merchant or date falls back to Expense and today", () => {
  assert.deepEqual(
    extractionToTransaction(
      {
        amount: 99,
        category: "Others",
        date: null,
        merchant: null,
        source: "local",
      },
      "2026-11-23",
    ),
    {
      name: "Expense",
      category: "Others",
      amount: -99,
      date: "2026-11-23",
    },
  );
});

test("speech support detects both constructor names", () => {
  assert.equal(speechRecognitionSupported({ SpeechRecognition: {} }), true);
  assert.equal(
    speechRecognitionSupported({ webkitSpeechRecognition: {} }),
    true,
  );
  assert.equal(speechRecognitionSupported({}), false);
});
