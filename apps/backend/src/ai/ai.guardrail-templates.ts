import type { ScreenResponse } from '../rag/rag.service';
import type { GuardrailChunk } from './ai.guardrail';
import type { AiClaim } from './ai.validation';

/**
 * Template fallback answers (Phase 3): when a model answer fails
 * verification twice, the user gets a template-generated answer built
 * ONLY from verified numbers — never the unverified model text.
 *
 * Every builder is pure and defensive (unknown input shapes degrade to
 * fewer sentences, never to invented numbers). Two structural rules
 * keep the output verifiable by construction:
 *
 * 1. The answer is the claim texts joined — so every number in the
 *    prose is in some claim's values.
 * 2. Every value in every claim is copied verbatim from the evidence
 *    with the tool's own field names — so the guardrail would pass
 *    this output if it were re-checked (pinned by the spec).
 *
 * Numbers that cannot be stated exactly are left out of the prose and
 * shown only in the claim values (evidence): a market cap in crores
 * would be a rounded restatement, so the prose states the P/E and the
 * 52-week range while the market cap rides in the evidence line.
 */

export interface TemplateAnswer {
  answer: string;
  claims: AiClaim[];
}

const inr0 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const inr2 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function asList(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

/** "+₹5,000" / "−₹3,000" — the sign stays with the number for matching. */
function signedMoney(value: number): string {
  return value < 0
    ? `−${inr0.format(Math.abs(value))}`
    : `+${inr0.format(value)}`;
}

/** "+0.78%" / "−0.78%" — signed, so the text matches the declared value. */
function signedPercent(value: number): string {
  return `${value < 0 ? '−' : '+'}${Math.abs(value)}%`;
}

function joinAnswer(claims: AiClaim[], empty: string): TemplateAnswer {
  if (claims.length === 0) return { answer: empty, claims: [] };
  return {
    answer: claims.map((claim) => claim.text).join(' '),
    claims,
  };
}

/**
 * The chat fallback: a summary of the snapshot metrics (budget, goals,
 * portfolio) the service already collects for the raw-metrics fallback.
 * Each section degrades independently; a missing section is skipped.
 */
export function chatTemplate(
  snapshot: Record<string, unknown>,
): TemplateAnswer {
  const claims: AiClaim[] = [];
  const budget = snapshot.getBudgetStatus;
  if (isRecord(budget) && budget.available !== false) {
    const totalSpent = asNumber(budget.totalSpent);
    const totalBudgeted = asNumber(budget.totalBudgeted);
    const totalRemaining = asNumber(budget.totalRemaining);
    const month = asString(budget.month);
    if (
      totalSpent !== null &&
      totalBudgeted !== null &&
      totalRemaining !== null
    ) {
      claims.push({
        text: `Your budget${month ? ` for ${month}` : ''}: ${inr0.format(totalSpent)} spent of ${inr0.format(totalBudgeted)} budgeted, leaving ${inr0.format(totalRemaining)}.`,
        source: {
          tool: 'getBudgetStatus',
          values: { totalSpent, totalBudgeted, totalRemaining },
        },
      });
    }
    for (const category of asList(budget.categories)) {
      if (category.overBudget !== true) continue;
      const name = asString(category.name);
      const spent = asNumber(category.spent);
      const budgeted = asNumber(category.budgeted);
      if (name === null || spent === null || budgeted === null) continue;
      claims.push({
        text: `${name} is over budget: ${inr0.format(spent)} spent of ${inr0.format(budgeted)} budgeted.`,
        source: {
          tool: 'getBudgetStatus',
          values: { category: name, spent, budgeted },
        },
      });
    }
  }
  const goals = snapshot.getGoalProgress;
  if (isRecord(goals)) {
    const totalSaved = asNumber(goals.totalSaved);
    const totalTarget = asNumber(goals.totalTarget);
    const list = asList(goals.goals);
    if (totalSaved !== null && totalTarget !== null && list.length > 0) {
      claims.push({
        text: `Your savings goals: ${inr0.format(totalSaved)} saved of ${inr0.format(totalTarget)} target across ${list.length} goals.`,
        source: {
          tool: 'getGoalProgress',
          values: { totalSaved, totalTarget },
        },
      });
      for (const goal of list.slice(0, 4)) {
        const name = asString(goal.name);
        const saved = asNumber(goal.saved);
        const target = asNumber(goal.target);
        const progress = asNumber(goal.progressPercent);
        if (
          name === null ||
          saved === null ||
          target === null ||
          progress === null
        ) {
          continue;
        }
        claims.push({
          text: `${name}: ${inr0.format(saved)} saved of ${inr0.format(target)} target (${progress}% complete).`,
          source: {
            tool: 'getGoalProgress',
            values: { name, saved, target, progressPercent: progress },
          },
        });
      }
    }
  }
  const portfolio = snapshot.getPortfolioSummary;
  if (isRecord(portfolio)) {
    const totals = isRecord(portfolio.totals) ? portfolio.totals : null;
    const holdings = asList(portfolio.holdings);
    const totalValue = totals ? asNumber(totals.totalValue) : null;
    const totalInvested = totals ? asNumber(totals.totalInvested) : null;
    const totalGainLoss = totals ? asNumber(totals.totalGainLoss) : null;
    const totalGainLossPercent = totals
      ? asNumber(totals.totalGainLossPercent)
      : null;
    if (
      holdings.length > 0 &&
      totalValue !== null &&
      totalInvested !== null &&
      totalGainLoss !== null &&
      totalGainLossPercent !== null
    ) {
      claims.push({
        text: `Your portfolio is worth ${inr0.format(totalValue)} (${inr0.format(totalInvested)} invested, gain/loss ${signedMoney(totalGainLoss)}, ${signedPercent(totalGainLossPercent)} overall).`,
        source: {
          tool: 'getPortfolioSummary',
          values: {
            totalValue,
            totalInvested,
            totalGainLoss,
            totalGainLossPercent,
          },
        },
      });
    }
  }
  return joinAnswer(
    claims,
    "Your numbers couldn't be loaded right now, so there's no summary to show. Please try again.",
  );
}

/** The explain-stock fallback: the computed figures in prose. */
export function explainStockTemplate(
  symbol: string,
  fundamentals: unknown,
): TemplateAnswer {
  const claims: AiClaim[] = [];
  if (!isRecord(fundamentals)) {
    return joinAnswer(
      claims,
      `No computed figures are available for ${symbol}.`,
    );
  }
  const name = asString(fundamentals.name);
  const price = asNumber(fundamentals.price);
  const previousClose = asNumber(fundamentals.previousClose);
  const changePercent = asNumber(fundamentals.changePercent);
  if (price !== null && previousClose !== null && changePercent !== null) {
    claims.push({
      text: `${symbol}${name ? ` (${name})` : ''} is trading at ${inr2.format(price)} (previous close ${inr2.format(previousClose)}, ${signedPercent(changePercent)}).`,
      source: {
        tool: 'getStockFundamentals',
        values: { price, previousClose, changePercent },
      },
    });
  } else if (price !== null) {
    claims.push({
      text: `${symbol}${name ? ` (${name})` : ''} is trading at ${inr2.format(price)}.`,
      source: { tool: 'getStockFundamentals', values: { price } },
    });
  }
  const technicals = isRecord(fundamentals.technicals)
    ? fundamentals.technicals
    : null;
  if (technicals) {
    const rsi14 = asNumber(technicals.rsi14);
    const sma20 = asNumber(technicals.sma20);
    const sma50 = asNumber(technicals.sma50);
    const change1mo = asNumber(technicals.change1moPercent);
    const parts: string[] = [];
    const values: Record<string, number> = {};
    if (rsi14 !== null) {
      parts.push(`the RSI (14) is ${rsi14}`);
      values.rsi14 = rsi14;
    }
    if (sma20 !== null) {
      parts.push(`the 20-day average is ${inr2.format(sma20)}`);
      values.sma20 = sma20;
    }
    if (sma50 !== null) {
      parts.push(`the 50-day average is ${inr2.format(sma50)}`);
      values.sma50 = sma50;
    }
    if (change1mo !== null) {
      parts.push(`the 1-month change is ${signedPercent(change1mo)}`);
      values.change1moPercent = change1mo;
    }
    if (parts.length > 0) {
      const joined =
        parts.length === 1
          ? parts[0]
          : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
      claims.push({
        text: `Technicals: ${joined}.`,
        source: { tool: 'getStockFundamentals', values },
      });
    }
  }
  const detail = isRecord(fundamentals.fundamentals)
    ? fundamentals.fundamentals
    : null;
  if (detail) {
    const trailingPE = asNumber(detail.trailingPE);
    const marketCap = asNumber(detail.marketCap);
    const high = asNumber(detail.fiftyTwoWeekHigh);
    const low = asNumber(detail.fiftyTwoWeekLow);
    const dividendYield = asNumber(detail.dividendYield);
    const parts: string[] = [];
    const values: Record<string, number> = {};
    if (trailingPE !== null) {
      parts.push(`the P/E ratio is ${trailingPE}`);
      values.trailingPE = trailingPE;
    }
    if (high !== null && low !== null) {
      parts.push(
        `the 52-week range is ${inr2.format(low)} – ${inr2.format(high)}`,
      );
      values.fiftyTwoWeekHigh = high;
      values.fiftyTwoWeekLow = low;
    }
    // Market cap and dividend yield ride in the evidence only: the
    // prose cannot restate a 14-digit market cap exactly, and a
    // rounded restatement would fail verification.
    if (marketCap !== null) values.marketCap = marketCap;
    if (dividendYield !== null) values.dividendYield = dividendYield;
    if (parts.length > 0) {
      claims.push({
        text: `Fundamentals: ${parts.join(' and ')}.`,
        source: { tool: 'getStockFundamentals', values },
      });
    } else if (Object.keys(values).length > 0) {
      claims.push({
        text: 'The fundamental figures are shown in the evidence below.',
        source: { tool: 'getStockFundamentals', values },
      });
    }
  }
  return joinAnswer(claims, `No computed figures are available for ${symbol}.`);
}

/** The explain-news fallback: the retrieved articles, listed. */
export function explainNewsTemplate(
  symbol: string,
  chunks: GuardrailChunk[],
): TemplateAnswer {
  const claims: AiClaim[] = [];
  const articles = chunks.filter((chunk) => chunk.title !== null).slice(0, 5);
  for (const article of articles) {
    const date = article.publishedAt;
    claims.push({
      text: `"${article.title}"${date ? ` (${date})` : ''}.`,
      source: {
        tool: 'searchKnowledge',
        values: {
          title: article.title as string,
          ...(date ? { date } : {}),
          ...(article.symbol ? { symbol: article.symbol } : {}),
        },
      },
    });
  }
  if (claims.length === 0) {
    return {
      answer: `No recent news was found for ${symbol}.`,
      claims: [],
    };
  }
  return {
    answer: `Recent news for ${symbol}: ${claims.map((claim) => claim.text).join(' ')}`,
    claims,
  };
}

/** The screener fallback: the matched stocks, listed with their figures. */
export function screenTemplate(screen: ScreenResponse): TemplateAnswer {
  const claims: AiClaim[] = [];
  if (screen.matches.length === 0) {
    return { answer: 'No stocks matched your filters.', claims: [] };
  }
  claims.push({
    text: `${screen.matches.length} stock${screen.matches.length === 1 ? '' : 's'} matched your filters.`,
    source: {
      tool: 'screenStocks',
      values: { matches: screen.matches.length },
    },
  });
  for (const stock of screen.matches.slice(0, 3)) {
    const parts: string[] = [];
    const values: Record<string, number | string> = {
      symbol: stock.symbol,
    };
    if (stock.price !== null) {
      parts.push(`at ${inr2.format(stock.price)}`);
      values.price = stock.price;
    }
    if (stock.rsi14 !== null) {
      parts.push(`RSI ${stock.rsi14}`);
      values.rsi14 = stock.rsi14;
    }
    if (stock.change1moPercent !== null) {
      parts.push(`1-month ${signedPercent(stock.change1moPercent)}`);
      values.change1moPercent = stock.change1moPercent;
    }
    claims.push({
      text:
        parts.length > 0
          ? `${stock.symbol} is trading ${parts.join(', ')}.`
          : `${stock.symbol} matched your filters.`,
      source: { tool: 'screenStocks', values },
    });
  }
  return joinAnswer(claims, 'No stocks matched your filters.');
}

/**
 * The readiness fallback: the computed score, every factor with its
 * measured number and points, and the deterministic suggestions. Every
 * number in the prose is copied verbatim from the assessment with the
 * tool's own field names, and every factor claim is scoped by the
 * factor name so the guardrail checks it against that factor's own
 * numbers. Percentages are stated with the stored 1-decimal value —
 * restating 33.3% as 33% would fail the ±0.1 text check.
 */
export function readinessTemplate(assessment: unknown): TemplateAnswer {
  const claims: AiClaim[] = [];
  if (!isRecord(assessment) || assessment.available !== true) {
    return joinAnswer(
      claims,
      'No readiness score is available — complete your financial profile first.',
    );
  }
  const score = asNumber(assessment.score);
  const scale = asNumber(assessment.scale);
  const maxScore = asNumber(assessment.maxScore);
  const band = asString(assessment.band);
  if (score !== null && scale !== null) {
    const values: Record<string, number> = { score, scale };
    if (maxScore !== null) values.maxScore = maxScore;
    let text = `Your investment readiness score is ${score} out of ${scale}${band ? ` (${band})` : ''}.`;
    if (maxScore !== null && maxScore < scale) {
      text += ` Only ${maxScore} of the ${scale} points could be measured from your data.`;
    }
    claims.push({
      text,
      source: { tool: 'getReadinessScore', values },
    });
  }
  for (const factor of asList(assessment.factors)) {
    const claim = readinessFactorClaim(factor);
    if (claim) claims.push(claim);
  }
  for (const suggestion of asList(assessment.suggestions)) {
    const claim = readinessSuggestionClaim(suggestion);
    if (claim) claims.push(claim);
  }
  return joinAnswer(
    claims,
    'No readiness score is available — complete your financial profile first.',
  );
}

function readinessFactorClaim(factor: Record<string, unknown>): AiClaim | null {
  const name = asString(factor.name);
  const points = asNumber(factor.points);
  const maxPoints = asNumber(factor.maxPoints);
  if (!name || points === null || maxPoints === null) return null;
  if (factor.available !== true) {
    // The factor's own detail says why (e.g. no priced holdings). A
    // "₹0" in a detail still verifies: the factor's points are 0, and
    // the scoped element's fields are part of the declared numbers.
    const detail = asString(factor.detail);
    const sentence = detail
      ? `${detail.charAt(0).toLowerCase()}${detail.slice(1)}`
      : 'could not be measured.';
    return {
      text: `${name}: ${sentence}`,
      source: { tool: 'getReadinessScore', values: { name } },
    };
  }
  // The factor name is the first value so the guardrail scopes the
  // numeric checks to this factor's own numbers.
  const metric = asString(factor.metric);
  switch (metric) {
    case 'emergencyFundMonths': {
      const months = asNumber(factor.months);
      if (months === null) break;
      return {
        text: `Emergency fund: ${months} months of expenses saved, worth ${points} of ${maxPoints} points.`,
        source: {
          tool: 'getReadinessScore',
          values: { name, months, points, maxPoints },
        },
      };
    }
    case 'debtToIncomeRatio': {
      const totalDebt = asNumber(factor.totalDebt);
      const annualIncome = asNumber(factor.annualIncome);
      const ratio = asNumber(factor.debtToIncomeRatio);
      if (totalDebt === null || annualIncome === null || ratio === null) break;
      return {
        text: `Debt-to-income: ${inr0.format(totalDebt)} of debt against ${inr0.format(annualIncome)} of annual income (ratio ${ratio}), worth ${points} of ${maxPoints} points.`,
        source: {
          tool: 'getReadinessScore',
          values: {
            name,
            totalDebt,
            annualIncome,
            debtToIncomeRatio: ratio,
            points,
            maxPoints,
          },
        },
      };
    }
    case 'surplusRatePercent': {
      const surplus = asNumber(factor.surplus);
      const rate = asNumber(factor.surplusRatePercent);
      if (surplus === null || rate === null) break;
      return {
        text: `Monthly surplus: ${inr0.format(surplus)} a month (${rate}% of income), worth ${points} of ${maxPoints} points.`,
        source: {
          tool: 'getReadinessScore',
          values: {
            name,
            surplus,
            surplusRatePercent: rate,
            points,
            maxPoints,
          },
        },
      };
    }
    case 'largestHoldingWeightPercent': {
      const largestHoldingSymbol = asString(factor.largestHoldingSymbol);
      const weight = asNumber(factor.largestHoldingWeightPercent);
      if (!largestHoldingSymbol || weight === null) break;
      return {
        text: `Portfolio concentration: your largest holding (${largestHoldingSymbol}) is ${weight}% of the portfolio, worth ${points} of ${maxPoints} points.`,
        source: {
          tool: 'getReadinessScore',
          values: {
            name,
            largestHoldingSymbol,
            largestHoldingWeightPercent: weight,
            points,
            maxPoints,
          },
        },
      };
    }
    case 'volatilityPercent': {
      const volatility = asNumber(factor.volatilityPercent);
      const holdingsWithHistory = asNumber(factor.holdingsWithHistory);
      if (volatility === null) break;
      return {
        text:
          holdingsWithHistory !== null
            ? `Portfolio volatility: ${volatility}% annualised across ${holdingsWithHistory} holding${holdingsWithHistory === 1 ? '' : 's'} with enough history, worth ${points} of ${maxPoints} points.`
            : `Portfolio volatility: ${volatility}% annualised, worth ${points} of ${maxPoints} points.`,
        source: {
          tool: 'getReadinessScore',
          values: {
            name,
            volatilityPercent: volatility,
            ...(holdingsWithHistory !== null ? { holdingsWithHistory } : {}),
            points,
            maxPoints,
          },
        },
      };
    }
    default:
      break;
  }
  return {
    text: `${name}: ${points} of ${maxPoints} points.`,
    source: {
      tool: 'getReadinessScore',
      values: { name, points, maxPoints },
    },
  };
}

function readinessSuggestionClaim(
  suggestion: Record<string, unknown>,
): AiClaim | null {
  // The action restates the factor's CURRENT numbers ("currently 50%")
  // as well as the target, so the claim is scoped to the factor by
  // name: the scoped element's fields then cover the current numbers
  // in the prose, while the target fields fall through to the global
  // scalars (the factor has no such fields).
  const text = asString(suggestion.action);
  const factorName = asString(suggestion.factor);
  if (!text || !factorName) return null;
  const values: Record<string, number | string> = { name: factorName };
  for (const key of [
    'pointsGain',
    'targetMonths',
    'targetDebt',
    'targetSurplus',
    'targetRatePercent',
    'targetWeightPercent',
    'targetVolatilityPercent',
  ]) {
    const value = asNumber(suggestion[key]);
    if (value !== null) values[key] = value;
  }
  if (Object.keys(values).length <= 1) return null;
  return {
    text,
    source: { tool: 'getReadinessScore', values },
  };
}
