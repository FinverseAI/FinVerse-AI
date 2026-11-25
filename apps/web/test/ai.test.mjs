import assert from "node:assert/strict";
import test from "node:test";
import {
  claimToolLabel,
  formatClaimValues,
  formatEvidenceValue,
  isAiChatResponse,
} from "../lib/ai.ts";

test("claimToolLabel maps tools to readable names and passes unknown ones through", () => {
  assert.equal(claimToolLabel("getBudgetStatus"), "Budget");
  assert.equal(claimToolLabel("getCategorySpending"), "Category spending");
  assert.equal(claimToolLabel("getStockFundamentals"), "Stock fundamentals");
  assert.equal(claimToolLabel("getSomethingNew"), "getSomethingNew");
});

test("formatEvidenceValue formats money-like keys as rupees", () => {
  // Recorded amounts render with 0 decimals (canonical formatter);
  // a per-unit price keeps two decimals.
  assert.equal(formatEvidenceValue("totalSpent", 8200), "₹8,200");
  assert.equal(formatEvidenceValue("price", 1500.5), "₹1,500.50");
  assert.equal(formatEvidenceValue("count", 12), "12");
  assert.equal(formatEvidenceValue("changePercent", 1.234), "1.23");
  assert.equal(
    formatEvidenceValue("category", "Food & Dining"),
    "Food & Dining",
  );
  assert.equal(formatEvidenceValue("stale", false), "no");
  assert.equal(formatEvidenceValue("rsi", null), "—");
});

test("formatClaimValues joins labelled values", () => {
  assert.equal(
    formatClaimValues({ category: "Food & Dining", totalSpent: 8200 }),
    "category: Food & Dining · totalSpent: ₹8,200",
  );
  assert.equal(formatClaimValues({}), "");
});

const validResponse = {
  answer: "You spent more on food.",
  claims: [
    {
      text: "You spent ₹8,200 on Food & Dining.",
      source: {
        tool: "getCategorySpending",
        values: { totalSpent: 8200 },
      },
    },
  ],
  refused: false,
  refusalReason: null,
  fallback: false,
  fallbackReason: null,
  metrics: null,
  model: "qwen/qwen-2.5-72b-instruct",
  toolsUsed: ["getCategorySpending"],
  disclaimer: "Not financial advice.",
  verification: { status: "verified", checksPassed: 3, checksFailed: 0 },
};

test("isAiChatResponse accepts a well-formed answer, refusal, and fallback", () => {
  assert.equal(isAiChatResponse(validResponse), true);
  assert.equal(
    isAiChatResponse({
      ...validResponse,
      answer: "I cannot predict prices.",
      claims: [],
      refused: true,
      refusalReason: "I cannot predict prices.",
      verification: { status: "refused", checksPassed: 0, checksFailed: 0 },
    }),
    true,
  );
  assert.equal(
    isAiChatResponse({
      ...validResponse,
      answer: null,
      claims: [],
      fallback: true,
      fallbackReason: "AI unavailable.",
      metrics: { getBudgetStatus: { available: false } },
      model: null,
      verification: { status: "unavailable", checksPassed: 0, checksFailed: 0 },
    }),
    true,
  );
});

test("isAiChatResponse rejects malformed responses", () => {
  assert.equal(isAiChatResponse(null), false);
  assert.equal(isAiChatResponse("answer"), false);
  assert.equal(isAiChatResponse({ ...validResponse, answer: 42 }), false);
  assert.equal(isAiChatResponse({ ...validResponse, claims: "none" }), false);
  assert.equal(
    isAiChatResponse({
      ...validResponse,
      claims: [{ text: "claim", source: { tool: "x" } }],
    }),
    false,
  );
  assert.equal(isAiChatResponse({ ...validResponse, disclaimer: null }), false);
  assert.equal(isAiChatResponse({ ...validResponse, metrics: [] }), false);
});

test("isAiChatResponse validates the verification state", () => {
  for (const status of ["verified", "template", "refused", "unavailable"]) {
    assert.equal(
      isAiChatResponse({
        ...validResponse,
        verification: { status, checksPassed: 1, checksFailed: 0 },
      }),
      true,
    );
  }
  assert.equal(
    isAiChatResponse({
      ...validResponse,
      verification: {
        status: "maybe",
        checksPassed: 1,
        checksFailed: 0,
      },
    }),
    false,
  );
  assert.equal(
    isAiChatResponse({
      ...validResponse,
      verification: { status: "verified", checksPassed: "3", checksFailed: 0 },
    }),
    false,
  );
  assert.equal(
    isAiChatResponse({ ...validResponse, verification: null }),
    false,
  );
  const withoutVerification = { ...validResponse };
  delete withoutVerification.verification;
  assert.equal(isAiChatResponse(withoutVerification), false);
});
