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
}

export interface AiStatus {
  configured: boolean;
  primaryModel: string;
  reasoningModel: string;
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

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const grouped = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

/** Format one evidence value: money-like keys get ₹, others get grouping. */
export function formatEvidenceValue(key: string, value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const lower = key.toLowerCase();
    if (MONEY_KEYS.some((part) => lower.includes(part)))
      return inr.format(value);
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
  for (const claim of value.claims) {
    if (!isRecord(claim)) return false;
    if (typeof claim.text !== "string") return false;
    if (!isRecord(claim.source)) return false;
    if (typeof claim.source.tool !== "string") return false;
    if (!isRecord(claim.source.values)) return false;
  }
  return true;
}
