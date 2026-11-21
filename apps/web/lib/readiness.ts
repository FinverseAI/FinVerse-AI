/**
 * Shared types and validators for the Investment Readiness score
 * (Phase 4). The backend computes the score in code
 * (apps/backend/src/readiness/readiness.formula.ts); the client
 * validates it with isReadinessResult before rendering, so a backend
 * drift fails loudly instead of rendering half a score.
 */

export interface ReadinessFactor {
  name: string;
  metric: string;
  points: number;
  maxPoints: number;
  available: boolean;
  detail: string;
  months?: number;
  monthsLabel?: string;
  debtToIncomeRatio?: number;
  totalDebt?: number;
  annualIncome?: number;
  surplus?: number;
  surplusRatePercent?: number;
  monthlyIncome?: number;
  largestHoldingSymbol?: string;
  largestHoldingWeightPercent?: number;
  holdingsCount?: number;
  volatilityPercent?: number;
  holdingsWithHistory?: number;
}

export interface ReadinessSuggestion {
  factor: string;
  action: string;
  pointsGain: number;
  targetMonths?: number;
  targetDebt?: number;
  targetSurplus?: number;
  targetRatePercent?: number;
  targetWeightPercent?: number;
  targetVolatilityPercent?: number;
  symbol?: string;
}

export interface ReadinessAssessment {
  available: true;
  score: number;
  band: "Not ready" | "Building" | "Ready";
  scale: 100;
  maxScore: number;
  factors: ReadinessFactor[];
  suggestions: ReadinessSuggestion[];
  context: {
    monthlyIncome: number;
    monthlySurplus: number;
    surplusRatePercent: number | null;
    totalDebt: number;
    debtToIncomeRatio: number | null;
    totalPortfolioValue: number;
    holdingsCount: number;
    pricedHoldingsCount: number;
    largestHolding: { symbol: string; weightPercent: number } | null;
    volatilityPercent: number | null;
  };
  stale: boolean;
  asOf: string | null;
}

export interface ReadinessUnavailable {
  available: false;
  reason: string;
  missing: string[];
}

export type ReadinessResult = ReadinessAssessment | ReadinessUnavailable;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFactor(value: unknown): value is ReadinessFactor {
  if (!isRecord(value)) return false;
  return (
    typeof value.name === "string" &&
    typeof value.metric === "string" &&
    isNumber(value.points) &&
    isNumber(value.maxPoints) &&
    typeof value.available === "boolean" &&
    typeof value.detail === "string"
  );
}

function isSuggestion(value: unknown): value is ReadinessSuggestion {
  if (!isRecord(value)) return false;
  return (
    typeof value.factor === "string" &&
    typeof value.action === "string" &&
    isNumber(value.pointsGain)
  );
}

export function isReadinessAssessment(
  value: unknown,
): value is ReadinessAssessment {
  if (!isRecord(value) || value.available !== true) return false;
  if (
    !isNumber(value.score) ||
    !isNumber(value.scale) ||
    !isNumber(value.maxScore)
  ) {
    return false;
  }
  if (
    value.band !== "Not ready" &&
    value.band !== "Building" &&
    value.band !== "Ready"
  ) {
    return false;
  }
  if (!Array.isArray(value.factors) || !value.factors.every(isFactor)) {
    return false;
  }
  if (
    !Array.isArray(value.suggestions) ||
    !value.suggestions.every(isSuggestion)
  ) {
    return false;
  }
  if (!isRecord(value.context)) return false;
  return typeof value.stale === "boolean";
}

export function isReadinessResult(value: unknown): value is ReadinessResult {
  if (isReadinessAssessment(value)) return true;
  if (!isRecord(value) || value.available !== false) return false;
  return (
    typeof value.reason === "string" &&
    Array.isArray(value.missing) &&
    value.missing.every((entry) => typeof entry === "string")
  );
}
