/**
 * The Investment Readiness formula (Phase 4, Obj 5).
 *
 * The score is DETERMINISTIC and AUDITABLE: it is computed here, in code,
 * from the user's own data — never by the model. The model only explains
 * the score; the guardrail (Phase 3) checks its explanation against these
 * numbers. Same inputs → same score, always (pinned by the spec).
 *
 * ## The five factors (weights sum to 100)
 *
 * | Factor               | Weight | Measurement                                   | Full marks at              | Zero at                    |
 * |----------------------|--------|------------------------------------------------|------------------------------|----------------------------|
 * | Emergency fund       | 25     | Profile emergency-fund band, as months       | 6+ months                  | 0 months                   |
 * | Debt-to-income       | 20     | Total debt ÷ annual income                   | No debt (ratio 0)          | Debt ≥ 1 year of income    |
 * | Monthly surplus      | 25     | (Income − expenses) ÷ income                 | Surplus ≥ 30% of income    | No surplus (rate ≤ 0)      |
 * | Portfolio conc.      | 15     | Largest holding's weight by current value    | Largest holding ≤ 20%      | Single holding (100%)      |
 * | Portfolio volatility | 15     | Value-weighted avg annualized volatility     | Volatility ≤ 15%           | Volatility ≥ 60%           |
 *
 * Each factor scores linearly between its full-marks and zero points
 * (documented below per factor). Factor points are rounded to 1 decimal;
 * the total is computed from the rounded points and rounded to a whole
 * number, so the displayed numbers reconcile exactly.
 *
 * ## Missing data — never invented
 *
 * A factor whose inputs are missing is UNAVAILABLE, not zero: scoring
 * "no holdings" as maximally concentrated, or "no income" as maximally
 * indebted, would invent a bad grade for absent data. The total is
 * rescaled over the available factors only
 * (score = earned ÷ available weight × 100), and the response reports
 * `maxScore` (the available weight) plus which factors are missing, so
 * the reader can see exactly what the score rests on. A user with no
 * holdings gets a cash-flow readiness score (out of 70, rescaled) —
 * readiness to START investing is a cash-flow question. A user with no
 * financial profile at all gets no score: the three cash-flow factors
 * need the profile, and a portfolio-only score would mislead.
 *
 * ## Bands (published thresholds)
 *
 * - 0–39: "Not ready" — fix the cash-flow foundations before investing.
 * - 40–69: "Building" — on the way; the suggestions say what moves it.
 * - 70–100: "Ready" — the foundations and the portfolio both look sound.
 *
 * ## Volatility — documented simplification
 *
 * Portfolio volatility is the VALUE-WEIGHTED AVERAGE of the holdings'
 * individual annualized volatilities (daily log returns, 3 months,
 * × √252). Correlations between holdings are NOT modelled, so a
 * diversified portfolio's true volatility is somewhat lower than this
 * figure — the number is a conservative (pessimistic) estimate, and the
 * limitation is stated here rather than hidden. Holdings with fewer
 * than 30 closes are excluded (too little history to be meaningful).
 */

/** The score is always out of 100. */
export const READINESS_SCALE = 100;

/** Factor weights — the published formula. */
export const READINESS_WEIGHTS = {
  emergencyFund: 25,
  debtToIncome: 20,
  monthlySurplus: 25,
  concentration: 15,
  volatility: 15,
} as const;

/** Months of expenses at which the emergency fund scores full marks. */
export const EMERGENCY_FULL_MONTHS = 6;
/** Band midpoints: the profile stores a band, not months. */
export const EMERGENCY_BAND_MONTHS = {
  '0': 0,
  '1-3': 2,
  '3-6': 4.5,
  '6+': 6,
} as const;

/** Debt-to-income ratio at/above which the debt factor scores zero. */
export const DEBT_TO_INCOME_ZERO = 1;
/** Surplus rate (of income) at which the surplus factor scores full marks. */
export const SURPLUS_FULL_RATE = 0.3;
/** Largest-holding weight at/below which concentration scores full marks. */
export const CONCENTRATION_FULL_WEIGHT = 0.2;
/** Annualized volatility at/below which volatility scores full marks. */
export const VOLATILITY_FULL = 0.15;
/** Annualized volatility at/above which volatility scores zero. */
export const VOLATILITY_ZERO = 0.6;

/** Score bands with their published thresholds (inclusive upper bounds). */
export const READINESS_BANDS = [
  { max: 39, band: 'Not ready' },
  { max: 69, band: 'Building' },
  { max: 100, band: 'Ready' },
] as const;

/** Minimum daily closes for a holding's volatility to be meaningful. */
export const MIN_HISTORY_CLOSES = 30;
/** Trading days per year, for annualizing daily volatility. */
export const TRADING_DAYS_PER_YEAR = 252;

export type EmergencyFundBand = '0' | '1-3' | '3-6' | '6+';
export type ReadinessBand = 'Not ready' | 'Building' | 'Ready';

export interface ReadinessInputs {
  /** Emergency-fund band from the profile; null when there is no profile. */
  emergencyFundBand: EmergencyFundBand | null;
  /** Total monthly income (monthly + other), ₹. */
  monthlyIncome: number;
  /** Fixed + variable monthly expenses, ₹. */
  monthlyExpenses: number;
  /** Total existing debt, ₹ (0 when the profile reports none). */
  totalDebt: number;
  /** Priced holdings only — unpriced holdings cannot be valued. */
  holdings: Array<{ symbol: string; currentValue: number }>;
  /** Annualized volatility (fraction, e.g. 0.234) per holding with history. */
  holdingVolatilities: Array<{
    symbol: string;
    volatility: number;
    currentValue: number;
  }>;
  /** True when any market input behind the score was stale. */
  stale?: boolean;
  /** Latest quote fetch time (ISO), or null when nothing was priced. */
  asOf?: string | null;
}

export interface ReadinessFactor {
  /** Display name — also the guardrail element id for scoped claims. */
  name: string;
  /** Machine key for the factor, e.g. 'emergencyFundMonths'. */
  metric: string;
  /** Points earned (1 decimal; 0 when unavailable). */
  points: number;
  /** Points available (the factor's weight). */
  maxPoints: number;
  available: boolean;
  /** One line saying what was measured (or why it could not be). */
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
  /** The factor this suggestion improves. */
  factor: string;
  /** Plain-language action, shown in the UI. */
  action: string;
  /** Points gained by reaching the target (1 decimal). */
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
  /** Total score, integer 0–100, rescaled over available factors. */
  score: number;
  band: ReadinessBand;
  /** The scale the score is out of — always 100. */
  scale: 100;
  /** Sum of the available factors' weights (100 when all are available). */
  maxScore: number;
  factors: ReadinessFactor[];
  /** Top 3 improvements by points gained (deterministic, not from the model). */
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
  /** What is missing (factor names / inputs). */
  missing: string[];
}

export type ReadinessResult = ReadinessAssessment | ReadinessUnavailable;

const inr0 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Annualized volatility from daily closes: standard deviation of daily
 * log returns × √252. Returns null when there is too little history
 * (fewer than 30 closes) or the data is unusable (a non-positive close
 * has no log return) — never a made-up number.
 */
export function annualizedVolatility(closes: number[]): number | null {
  if (closes.length < MIN_HISTORY_CLOSES) return null;
  if (closes.some((close) => !Number.isFinite(close) || close <= 0)) {
    return null;
  }
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

export function bandForScore(score: number): ReadinessBand {
  for (const { max, band } of READINESS_BANDS) {
    if (score <= max) return band;
  }
  return 'Ready';
}

function emergencyFactor(band: EmergencyFundBand | null): ReadinessFactor {
  const maxPoints = READINESS_WEIGHTS.emergencyFund;
  if (band === null) {
    return {
      name: 'Emergency fund',
      metric: 'emergencyFundMonths',
      points: 0,
      maxPoints,
      available: false,
      detail: 'No financial profile, so the emergency fund cannot be measured.',
    };
  }
  const months = EMERGENCY_BAND_MONTHS[band];
  const points = round1(
    maxPoints * Math.min(months / EMERGENCY_FULL_MONTHS, 1),
  );
  return {
    name: 'Emergency fund',
    metric: 'emergencyFundMonths',
    points,
    maxPoints,
    available: true,
    detail: `Your emergency fund covers ${band === '0' ? '0 months' : `${band} months`} of expenses (6+ months is full marks).`,
    months,
    monthsLabel: band === '0' ? '0 months' : `${band} months`,
  };
}

function debtFactor(monthlyIncome: number, totalDebt: number): ReadinessFactor {
  const maxPoints = READINESS_WEIGHTS.debtToIncome;
  if (!(monthlyIncome > 0)) {
    return {
      name: 'Debt-to-income',
      metric: 'debtToIncomeRatio',
      points: 0,
      maxPoints,
      available: false,
      detail:
        'Your monthly income is ₹0, so debt-to-income cannot be measured.',
    };
  }
  const annualIncome = monthlyIncome * 12;
  const ratio = totalDebt / annualIncome;
  const points = round1(
    maxPoints * clamp(1 - ratio / DEBT_TO_INCOME_ZERO, 0, 1),
  );
  return {
    name: 'Debt-to-income',
    metric: 'debtToIncomeRatio',
    points,
    maxPoints,
    available: true,
    detail:
      totalDebt === 0
        ? 'You carry no debt.'
        : `Total debt of ${inr0.format(totalDebt)} is ${round2(ratio)}× your annual income of ${inr0.format(annualIncome)}.`,
    debtToIncomeRatio: round2(ratio),
    totalDebt,
    annualIncome,
  };
}

function surplusFactor(
  monthlyIncome: number,
  monthlyExpenses: number,
): ReadinessFactor {
  const maxPoints = READINESS_WEIGHTS.monthlySurplus;
  if (!(monthlyIncome > 0)) {
    return {
      name: 'Monthly surplus',
      metric: 'surplusRatePercent',
      points: 0,
      maxPoints,
      available: false,
      detail:
        'Your monthly income is ₹0, so the surplus rate cannot be measured.',
    };
  }
  const surplus = monthlyIncome - monthlyExpenses;
  const rate = surplus / monthlyIncome;
  const points = round1(maxPoints * clamp(rate / SURPLUS_FULL_RATE, 0, 1));
  return {
    name: 'Monthly surplus',
    metric: 'surplusRatePercent',
    points,
    maxPoints,
    available: true,
    detail: `Monthly surplus of ${inr0.format(surplus)} is ${round1(rate * 100)}% of income (30% is full marks).`,
    surplus,
    surplusRatePercent: round1(rate * 100),
    monthlyIncome,
  };
}

function concentrationFactor(
  holdings: Array<{ symbol: string; currentValue: number }>,
): ReadinessFactor {
  const maxPoints = READINESS_WEIGHTS.concentration;
  const totalValue = holdings.reduce(
    (sum, holding) => sum + holding.currentValue,
    0,
  );
  if (holdings.length === 0 || !(totalValue > 0)) {
    return {
      name: 'Portfolio concentration',
      metric: 'largestHoldingWeightPercent',
      points: 0,
      maxPoints,
      available: false,
      detail: 'No priced holdings, so concentration cannot be measured.',
    };
  }
  const largest = holdings.reduce((a, b) =>
    b.currentValue > a.currentValue ? b : a,
  );
  const weight = largest.currentValue / totalValue;
  const points = round1(
    maxPoints * clamp((1 - weight) / (1 - CONCENTRATION_FULL_WEIGHT), 0, 1),
  );
  return {
    name: 'Portfolio concentration',
    metric: 'largestHoldingWeightPercent',
    points,
    maxPoints,
    available: true,
    detail: `Your largest holding, ${largest.symbol}, is ${round1(weight * 100)}% of your portfolio (20% or less is full marks).`,
    largestHoldingSymbol: largest.symbol,
    largestHoldingWeightPercent: round1(weight * 100),
    holdingsCount: holdings.length,
  };
}

function volatilityFactor(
  holdingVolatilities: Array<{
    symbol: string;
    volatility: number;
    currentValue: number;
  }>,
): ReadinessFactor {
  const maxPoints = READINESS_WEIGHTS.volatility;
  const totalValue = holdingVolatilities.reduce(
    (sum, holding) => sum + holding.currentValue,
    0,
  );
  if (holdingVolatilities.length === 0 || !(totalValue > 0)) {
    return {
      name: 'Portfolio volatility',
      metric: 'volatilityPercent',
      points: 0,
      maxPoints,
      available: false,
      detail:
        'Not enough price history for your holdings yet, so volatility cannot be measured.',
    };
  }
  const weighted =
    holdingVolatilities.reduce(
      (sum, holding) => sum + holding.volatility * holding.currentValue,
      0,
    ) / totalValue;
  const points = round1(
    maxPoints *
      clamp(
        (VOLATILITY_ZERO - weighted) / (VOLATILITY_ZERO - VOLATILITY_FULL),
        0,
        1,
      ),
  );
  return {
    name: 'Portfolio volatility',
    metric: 'volatilityPercent',
    points,
    maxPoints,
    available: true,
    detail: `Your portfolio's annualized volatility is ${round1(weighted * 100)}% (value-weighted average across ${holdingVolatilities.length} holding${holdingVolatilities.length === 1 ? '' : 's'}; 15% or less is full marks).`,
    volatilityPercent: round1(weighted * 100),
    holdingsWithHistory: holdingVolatilities.length,
  };
}

/**
 * Deterministic suggestions: for each available factor below full marks,
 * the concrete target that would earn full marks, and the points it
 * would gain. Computed in code from the factor values — never by the
 * model. Sorted by points gained, top 3.
 */
function buildSuggestions(
  factors: ReadinessFactor[],
  inputs: ReadinessInputs,
): ReadinessSuggestion[] {
  const suggestions: ReadinessSuggestion[] = [];
  for (const factor of factors) {
    if (!factor.available || factor.points >= factor.maxPoints) continue;
    const gain = round1(factor.maxPoints - factor.points);
    switch (factor.metric) {
      case 'emergencyFundMonths':
        suggestions.push({
          factor: factor.name,
          action: `Build your emergency fund to 6 months (currently ${factor.monthsLabel}) to gain ${gain} points.`,
          pointsGain: gain,
          targetMonths: EMERGENCY_FULL_MONTHS,
        });
        break;
      case 'debtToIncomeRatio':
        suggestions.push({
          factor: factor.name,
          action: `Clearing your ${inr0.format(inputs.totalDebt)} debt would add ${gain} points.`,
          pointsGain: gain,
          targetDebt: 0,
        });
        break;
      case 'surplusRatePercent': {
        const target = Math.round(inputs.monthlyIncome * SURPLUS_FULL_RATE);
        suggestions.push({
          factor: factor.name,
          action: `Raising your monthly surplus to ${inr0.format(target)} (30% of income) would add ${gain} points.`,
          pointsGain: gain,
          targetSurplus: target,
          targetRatePercent: SURPLUS_FULL_RATE * 100,
        });
        break;
      }
      case 'largestHoldingWeightPercent':
        suggestions.push({
          factor: factor.name,
          action: `Reducing ${factor.largestHoldingSymbol} below 20% of your portfolio (currently ${factor.largestHoldingWeightPercent}%) would add ${gain} points.`,
          pointsGain: gain,
          targetWeightPercent: CONCENTRATION_FULL_WEIGHT * 100,
          symbol: factor.largestHoldingSymbol,
        });
        break;
      case 'volatilityPercent':
        suggestions.push({
          factor: factor.name,
          action: `Reducing your portfolio's volatility to 15% or below (currently ${factor.volatilityPercent}%) would add ${gain} points.`,
          pointsGain: gain,
          targetVolatilityPercent: VOLATILITY_FULL * 100,
        });
        break;
      default:
        break;
    }
  }
  suggestions.sort((a, b) => b.pointsGain - a.pointsGain);
  return suggestions.slice(0, 3);
}

/**
 * Score the inputs. Pure and deterministic: the same inputs always
 * produce the same assessment. Returns `available: false` when no
 * factor can be measured at all.
 */
export function scoreReadiness(inputs: ReadinessInputs): ReadinessResult {
  const factors: ReadinessFactor[] = [
    emergencyFactor(inputs.emergencyFundBand),
    debtFactor(inputs.monthlyIncome, inputs.totalDebt),
    surplusFactor(inputs.monthlyIncome, inputs.monthlyExpenses),
    concentrationFactor(inputs.holdings),
    volatilityFactor(inputs.holdingVolatilities),
  ];
  const availableFactors = factors.filter((factor) => factor.available);
  if (availableFactors.length === 0) {
    return {
      available: false,
      reason:
        'Not enough data to measure investment readiness yet. Complete your financial profile to get a score.',
      missing: factors.map((factor) => factor.name),
    };
  }
  const maxScore = availableFactors.reduce(
    (sum, factor) => sum + factor.maxPoints,
    0,
  );
  const earned = availableFactors.reduce(
    (sum, factor) => sum + factor.points,
    0,
  );
  const score = Math.round((earned / maxScore) * READINESS_SCALE);
  const totalPortfolioValue = inputs.holdings.reduce(
    (sum, holding) => sum + holding.currentValue,
    0,
  );
  const largest =
    inputs.holdings.length > 0 && totalPortfolioValue > 0
      ? inputs.holdings.reduce((a, b) =>
          b.currentValue > a.currentValue ? b : a,
        )
      : null;
  const volatility =
    inputs.holdingVolatilities.length > 0
      ? inputs.holdingVolatilities.reduce(
          (sum, holding) => sum + holding.volatility * holding.currentValue,
          0,
        ) /
        inputs.holdingVolatilities.reduce(
          (sum, holding) => sum + holding.currentValue,
          0,
        )
      : null;
  const monthlySurplus = inputs.monthlyIncome - inputs.monthlyExpenses;
  return {
    available: true,
    score,
    band: bandForScore(score),
    scale: READINESS_SCALE,
    maxScore,
    factors,
    suggestions: buildSuggestions(factors, inputs),
    context: {
      monthlyIncome: inputs.monthlyIncome,
      monthlySurplus,
      surplusRatePercent:
        inputs.monthlyIncome > 0
          ? round1((monthlySurplus / inputs.monthlyIncome) * 100)
          : null,
      totalDebt: inputs.totalDebt,
      debtToIncomeRatio:
        inputs.monthlyIncome > 0
          ? round2(inputs.totalDebt / (inputs.monthlyIncome * 12))
          : null,
      totalPortfolioValue,
      holdingsCount: inputs.holdings.length,
      pricedHoldingsCount: inputs.holdings.length,
      largestHolding:
        largest === null
          ? null
          : {
              symbol: largest.symbol,
              weightPercent: round1(
                (largest.currentValue / totalPortfolioValue) * 100,
              ),
            },
      volatilityPercent: volatility === null ? null : round1(volatility * 100),
    },
    stale: inputs.stale ?? false,
    asOf: inputs.asOf ?? null,
  };
}

/** Type guard for the assessment shape (used by the AI explain flow). */
export function isReadinessAssessment(
  value: unknown,
): value is ReadinessAssessment {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.available === true &&
    typeof record.score === 'number' &&
    typeof record.band === 'string' &&
    Array.isArray(record.factors) &&
    Array.isArray(record.suggestions)
  );
}
