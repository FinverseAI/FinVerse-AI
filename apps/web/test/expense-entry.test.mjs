import assert from "node:assert/strict";
import test from "node:test";
import {
  extractionToTransaction,
  getSpeechRecognitionConstructor,
  speechRecognitionSupported,
  startListening,
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
  assert.equal(
    getSpeechRecognitionConstructor({ webkitSpeechRecognition: "ctor" }),
    "ctor",
  );
  assert.equal(getSpeechRecognitionConstructor({}), null);
});

class FakeRecognition {
  static instances = [];

  constructor() {
    FakeRecognition.instances.push(this);
    this.started = false;
    this.stopped = false;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
  }

  start() {
    this.started = true;
  }

  stop() {
    this.stopped = true;
  }

  emitResult(transcript) {
    this.onresult({ results: [[{ transcript }]] });
  }

  emitError(error) {
    this.onerror({ error });
  }

  emitEnd() {
    this.onend();
  }
}

test("listening delivers the transcript and stops on request", () => {
  FakeRecognition.instances = [];
  const transcripts = [];
  const errors = [];
  let ended = 0;
  const stop = startListening(FakeRecognition, {
    onTranscript: (text) => transcripts.push(text),
    onError: (error) => errors.push(error),
    onEnd: () => ended++,
  });
  const recognition = FakeRecognition.instances[0];
  assert.equal(recognition.started, true);
  assert.equal(recognition.lang, "en-IN");
  recognition.emitResult("  coffee 250  ");
  recognition.emitResult("   ");
  assert.deepEqual(transcripts, ["coffee 250"]);
  recognition.emitError("not-allowed");
  assert.deepEqual(errors, ["not-allowed"]);
  recognition.emitEnd();
  assert.equal(ended, 1);
  stop();
  assert.equal(recognition.stopped, true);
});
