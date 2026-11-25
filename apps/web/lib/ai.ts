import { formatMoney, formatPrice } from "./market.ts";

/**
 * Shared types and pure helpers for the FinVerse AI chat. The backend
 * answers in this shape (apps/backend/src/ai/ai.service.ts); the client
 * validates it with isAiChatResponse before rendering, so a backend drift
 * fails loudly instead of rendering half a response.
 */

export interface AiClaim {
  text: string;
  source: {
    tool: string;
    values: Record<string, unknown>;
  };
}

/**
 * Phase 3: how the backend verified this answer before it reached the
 * user. `verified` — every claim checked out; `template` — the model's
 * answer failed verification twice, so this summary was generated from
 * the verified numbers instead; `refused` — the model declined;
 * `unavailable` — no model answer was produced (raw metrics fallback).
 */
export interface VerificationState {
  status: "verified" | "template" | "refused" | "unavailable";
  checksPassed: number;
  checksFailed: number;
}

export interface AiChatResponse {
  answer: string | null;
  claims: AiClaim[];
  refused: boolean;
  refusalReason: string | null;
  fallback: boolean;
  fallbackReason: string | null;
  metrics: Record<string, unknown> | null;
  model: string | null;
  toolsUsed: string[];
  disclaimer: string;
  verification: VerificationState;
}

export interface AiStatus {
  configured: boolean;
  primaryModel: string;
  reasoningModel: string;
}

/**
 * One extracted expense, from the /api/ai/extract-expense endpoint.
 * `source` says which path produced it: the model, or the deterministic
 * local extractor that runs when the model is unavailable.
 */
export interface ExpenseExtraction {
  amount: number;
  category: string;
  date: string | null;
  merchant: string | null;
  source: "ai" | "local";
}

/** Human-readable labels for the tools a claim can cite. */
const TOOL_LABELS: Record<string, string> = {
  getPortfolioSummary: "Portfolio",
  getBudgetStatus: "Budget",
  getTransactions: "Transactions",
  getStockQuote: "Stock price",
  getStockFundamentals: "Stock fundamentals",
  getCategorySpending: "Category spending",
  getGoalProgress: "Goals",
  getReadinessScore: "Readiness score",
  searchKnowledge: "News & knowledge",
  screenStocks: "Stock screener",
};

export function claimToolLabel(tool: string): string {
  return TOOL_LABELS[tool] ?? tool;
}

const MONEY_KEYS = [
  "spent",
  "amount",
  "total",
  "budgeted",
  "saved",
  "target",
  "remaining",
  "price",
  "value",
  "invested",
  "income",
];

const grouped = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

/**
 * Format one evidence value: money-like keys get ₹, others get grouping.
 * Recorded amounts and totals render with 0 decimals via the canonical
 * formatter; a per-unit `price` keeps two decimals via formatPrice.
 */
export function formatEvidenceValue(key: string, value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const lower = key.toLowerCase();
    if (lower.includes("price")) return formatPrice(value);
    if (MONEY_KEYS.some((part) => lower.includes(part)))
      return formatMoney(value);
    return grouped.format(value);
  }
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (value === null || value === undefined) return "—";
  return JSON.stringify(value);
}

/** "category: Food & Dining · totalSpent: ₹8,200" — the evidence line. */
export function formatClaimValues(values: Record<string, unknown>): string {
  return Object.entries(values)
    .map(([key, value]) => `${key}: ${formatEvidenceValue(key, value)}`)
    .join(" · ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isExpenseExtraction(
  value: unknown,
): value is ExpenseExtraction {
  if (!isRecord(value)) return false;
  if (
    typeof value.amount !== "number" ||
    !Number.isFinite(value.amount) ||
    value.amount <= 0
  )
    return false;
  if (typeof value.category !== "string" || !value.category) return false;
  if (typeof value.date !== "string" && value.date !== null) return false;
  if (typeof value.merchant !== "string" && value.merchant !== null)
    return false;
  if (value.source !== "ai" && value.source !== "local") return false;
  return true;
}

export function isAiChatResponse(value: unknown): value is AiChatResponse {
  if (!isRecord(value)) return false;
  if (typeof value.answer !== "string" && value.answer !== null) return false;
  if (!Array.isArray(value.claims)) return false;
  if (typeof value.refused !== "boolean") return false;
  if (typeof value.refusalReason !== "string" && value.refusalReason !== null)
    return false;
  if (typeof value.fallback !== "boolean") return false;
  if (typeof value.fallbackReason !== "string" && value.fallbackReason !== null)
    return false;
  if (value.metrics !== null && !isRecord(value.metrics)) return false;
  if (typeof value.model !== "string" && value.model !== null) return false;
  if (!Array.isArray(value.toolsUsed)) return false;
  if (typeof value.disclaimer !== "string") return false;
  if (!isRecord(value.verification)) return false;
  if (
    value.verification.status !== "verified" &&
    value.verification.status !== "template" &&
    value.verification.status !== "refused" &&
    value.verification.status !== "unavailable"
  )
    return false;
  if (typeof value.verification.checksPassed !== "number") return false;
  if (typeof value.verification.checksFailed !== "number") return false;
  for (const claim of value.claims) {
    if (!isRecord(claim)) return false;
    if (typeof claim.text !== "string") return false;
    if (!isRecord(claim.source)) return false;
    if (typeof claim.source.tool !== "string") return false;
    if (!isRecord(claim.source.values)) return false;
  }
  return true;
}
