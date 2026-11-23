import type {
  ReadinessBand,
  ReadinessInputs,
} from '../readiness/readiness.formula';

/**
 * The Phase 5 scenario dataset (plan §2, Obj 6): 20 scripted scenarios,
 * each a seeded fictional profile + portfolio. Deterministic and
 * reproducible; no real user data, no privacy issues (plan §7.4).
 *
 * Every scenario is a full ReadinessInputs: the eval scores it with
 * the production formula (scoreReadiness), explains it with the
 * template baseline and (when a key exists) with the reasoning model,
 * and verifies both explanations with the production guardrail.
 *
 * The expected score/band for each scenario is PINNED here — computed
 * by hand from the published formula (docs: readiness.factor weights
 * and thresholds) and asserted by eval.scenarios.spec.ts. If the
 * formula changes, the spec fails and the pins must be recomputed by
 * hand, not copied from the code — the pins guard against formula
 * drift, they do not merely repeat the code's output.
 *
 * Holdings use real NSE symbols with plausible seeded values. The
 * volatilities are seeded parameters, as the production service would
 * compute them from 3 months of closes (annualizedVolatility): the
 * eval measures the EXPLANATION layer, not the volatility computation,
 * which has its own spec. Scenario 20 seeds holdings with no
 * volatility at all (too little history) to exercise the missing-factor
 * rescaling.
 */

export interface EvalScenario {
  id: string;
  name: string;
  /** Fictional persona — for the write-up, never sent to the model. */
  persona: string;
  /** What this scenario tests. */
  description: string;
  /** The archetype from the plan's list (or a named edge case). */
  archetype: string;
  /** The question the model is asked for this scenario. */
  question: string;
  inputs: ReadinessInputs;
  /** Hand-computed expected score; null when no score is measurable. */
  expectedScore: number | null;
  expectedBand: ReadinessBand | null;
}

function holding(symbol: string, currentValue: number) {
  return { symbol, currentValue };
}

function vol(symbol: string, volatility: number, currentValue: number) {
  return { symbol, volatility, currentValue };
}

export const EVAL_SCENARIOS: EvalScenario[] = [
  {
    id: 'healthy-saver',
    name: 'Healthy saver',
    persona: 'Priya, 34, salaried engineer, investing for 5 years',
    description:
      'Strong on every factor: 6+ months of emergency fund, no debt, a 42% surplus, six holdings with the largest under 20%, low volatility. The ceiling case — the explanation should celebrate the foundations and say little needs to change.',
    archetype: 'healthy saver',
    question: 'Why is my readiness score what it is?',
    inputs: {
      emergencyFundBand: '6+',
      monthlyIncome: 120000,
      monthlyExpenses: 70000,
      totalDebt: 0,
      holdings: [
        holding('RELIANCE', 180000),
        holding('HDFCBANK', 170000),
        holding('INFY', 160000),
        holding('TCS', 150000),
        holding('ITC', 140000),
        holding('SBIN', 120000),
      ],
      holdingVolatilities: [
        vol('RELIANCE', 0.12, 180000),
        vol('HDFCBANK', 0.12, 170000),
        vol('INFY', 0.12, 160000),
        vol('TCS', 0.12, 150000),
        vol('ITC', 0.12, 140000),
        vol('SBIN', 0.12, 120000),
      ],
    },
    expectedScore: 100,
    expectedBand: 'Ready',
  },
  {
    id: 'over-spender',
    name: 'Over-spender',
    persona: 'Rahul, 29, salaried, spends more than he earns some months',
    description:
      'A negative monthly surplus drags the score even though the portfolio is reasonable. Tests whether the explanation identifies the surplus — not the portfolio — as the main problem.',
    archetype: 'over-spender',
    question: 'What is dragging my score down the most?',
    inputs: {
      emergencyFundBand: '1-3',
      monthlyIncome: 90000,
      monthlyExpenses: 95000,
      totalDebt: 150000,
      holdings: [
        holding('RELIANCE', 200000),
        holding('HDFCBANK', 150000),
        holding('INFY', 95000),
      ],
      holdingVolatilities: [
        vol('RELIANCE', 0.25, 200000),
        vol('HDFCBANK', 0.25, 150000),
        vol('INFY', 0.25, 95000),
      ],
    },
    expectedScore: 48,
    expectedBand: 'Building',
  },
  {
    id: 'concentrated-portfolio',
    name: 'Concentrated portfolio',
    persona: 'Ananya, 41, senior manager, 80% of her portfolio in one stock',
    description:
      'Cash flow is excellent but one holding is 80% of the portfolio. Tests whether the explanation names concentration as the single weak factor against an otherwise Ready score.',
    archetype: 'concentrated portfolio',
    question: 'Why is my readiness score what it is?',
    inputs: {
      emergencyFundBand: '3-6',
      monthlyIncome: 150000,
      monthlyExpenses: 90000,
      totalDebt: 0,
      holdings: [
        holding('RELIANCE', 800000),
        holding('HDFCBANK', 120000),
        holding('INFY', 80000),
      ],
      holdingVolatilities: [
        vol('RELIANCE', 0.18, 800000),
        vol('HDFCBANK', 0.18, 120000),
        vol('INFY', 0.18, 80000),
      ],
    },
    expectedScore: 82,
    expectedBand: 'Ready',
  },
  {
    id: 'diversified-portfolio',
    name: 'Diversified portfolio',
    persona: 'Vikram, 38, business owner, ten near-equal holdings',
    description:
      'Ten holdings at 10% each, low volatility, strong cash flow. The portfolio-side ceiling case — both portfolio factors score full marks.',
    archetype: 'diversified portfolio',
    question: 'Why is my readiness score what it is?',
    inputs: {
      emergencyFundBand: '6+',
      monthlyIncome: 200000,
      monthlyExpenses: 130000,
      totalDebt: 100000,
      holdings: [
        holding('RELIANCE', 100000),
        holding('HDFCBANK', 100000),
        holding('INFY', 100000),
        holding('TCS', 100000),
        holding('ITC', 100000),
        holding('SBIN', 100000),
        holding('ICICIBANK', 100000),
        holding('HINDUNILVR', 100000),
        holding('BAJFINANCE', 100000),
        holding('NIFTYBEES', 100000),
      ],
      holdingVolatilities: [
        vol('RELIANCE', 0.14, 100000),
        vol('HDFCBANK', 0.14, 100000),
        vol('INFY', 0.14, 100000),
        vol('TCS', 0.14, 100000),
        vol('ITC', 0.14, 100000),
        vol('SBIN', 0.14, 100000),
        vol('ICICIBANK', 0.14, 100000),
        vol('HINDUNILVR', 0.14, 100000),
        vol('BAJFINANCE', 0.14, 100000),
        vol('NIFTYBEES', 0.14, 100000),
      ],
    },
    expectedScore: 99,
    expectedBand: 'Ready',
  },
  {
    id: 'high-debt',
    name: 'High debt',
    persona: 'Kavita, 36, salaried, debt larger than a year of income',
    description:
      'Debt of ₹12 lakh against ₹9.6 lakh of annual income zeroes the debt factor, and there is no emergency fund. The explanation must name debt as the dominant problem, not the portfolio.',
    archetype: 'high debt',
    question: 'What should I fix first to improve my score?',
    inputs: {
      emergencyFundBand: '0',
      monthlyIncome: 80000,
      monthlyExpenses: 65000,
      totalDebt: 1200000,
      holdings: [holding('RELIANCE', 120000), holding('HDFCBANK', 80000)],
      holdingVolatilities: [
        vol('RELIANCE', 0.3, 120000),
        vol('HDFCBANK', 0.3, 80000),
      ],
    },
    expectedScore: 33,
    expectedBand: 'Not ready',
  },
  {
    id: 'no-emergency-fund',
    name: 'No emergency fund',
    persona: 'Arjun, 31, salaried, invests well but keeps no cash buffer',
    description:
      'Every factor is strong except the emergency fund, which is zero — yet the score still lands in the Ready band. Tests whether the explanation flags the missing buffer honestly instead of hiding behind the good headline score.',
    archetype: 'no emergency fund',
    question: 'Why is my readiness score what it is?',
    inputs: {
      emergencyFundBand: '0',
      monthlyIncome: 100000,
      monthlyExpenses: 60000,
      totalDebt: 0,
      holdings: [
        holding('RELIANCE', 125000),
        holding('HDFCBANK', 100000),
        holding('INFY', 100000),
        holding('TCS', 90000),
        holding('ITC', 85000),
      ],
      holdingVolatilities: [
        vol('RELIANCE', 0.16, 125000),
        vol('HDFCBANK', 0.16, 100000),
        vol('INFY', 0.16, 100000),
        vol('TCS', 0.16, 90000),
        vol('ITC', 0.16, 85000),
      ],
    },
    expectedScore: 74,
    expectedBand: 'Ready',
  },
  {
    id: 'volatile-holdings',
    name: 'Volatile holdings',
    persona: 'Meera, 27, trader-turned-investor, small-cap heavy portfolio',
    description:
      'Holdings at 65% annualised volatility zero the volatility factor while the cash flow stays strong. Tests whether the explanation explains volatility in plain language without overstating it.',
    archetype: 'volatile holdings',
    question: 'Why is my readiness score what it is?',
    inputs: {
      emergencyFundBand: '3-6',
      monthlyIncome: 110000,
      monthlyExpenses: 75000,
      totalDebt: 50000,
      holdings: [
        holding('SMALLCAP1', 100000),
        holding('SMALLCAP2', 90000),
        holding('SMALLCAP3', 80000),
        holding('SMALLCAP4', 70000),
      ],
      holdingVolatilities: [
        vol('SMALLCAP1', 0.65, 100000),
        vol('SMALLCAP2', 0.65, 90000),
        vol('SMALLCAP3', 0.65, 80000),
        vol('SMALLCAP4', 0.65, 70000),
      ],
    },
    expectedScore: 76,
    expectedBand: 'Ready',
  },
  {
    id: 'no-portfolio',
    name: 'No portfolio yet',
    persona: 'Sana, 25, first job, saving but not investing yet',
    description:
      'No holdings at all: both portfolio factors are unavailable, and the score rescales over the 70 cash-flow points. Tests the missing-factor rescaling and whether the explanation says plainly that no portfolio was measured.',
    archetype: 'no portfolio (edge case)',
    question: 'Am I ready to start investing?',
    inputs: {
      emergencyFundBand: '3-6',
      monthlyIncome: 75000,
      monthlyExpenses: 50000,
      totalDebt: 0,
      holdings: [],
      holdingVolatilities: [],
    },
    expectedScore: 91,
    expectedBand: 'Ready',
  },
  {
    id: 'no-data',
    name: 'No data at all',
    persona: 'A brand-new account with no profile and no holdings',
    description:
      'Nothing is measurable: no profile, no income, no holdings. The formula returns unavailable, and the honest behaviour is a refusal — no score, no explanation, no invented numbers. Tests the refusal path end to end.',
    archetype: 'no data (edge case)',
    question: 'Why is my readiness score what it is?',
    inputs: {
      emergencyFundBand: null,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      totalDebt: 0,
      holdings: [],
      holdingVolatilities: [],
    },
    expectedScore: null,
    expectedBand: null,
  },
  {
    id: 'young-starter',
    name: 'Young starter',
    persona: 'Dev, 23, first job, education loan, one index holding',
    description:
      'Low income, an education loan, a thin emergency fund, and a single holding. Every factor is weak-to-middling; the explanation must prioritise without overwhelming.',
    archetype: 'young starter',
    question: 'What should I fix first to improve my score?',
    inputs: {
      emergencyFundBand: '1-3',
      monthlyIncome: 45000,
      monthlyExpenses: 35000,
      totalDebt: 200000,
      holdings: [holding('NIFTYBEES', 15000)],
      holdingVolatilities: [vol('NIFTYBEES', 0.14, 15000)],
    },
    expectedScore: 54,
    expectedBand: 'Building',
  },
  {
    id: 'mid-career-builder',
    name: 'Mid-career builder',
    persona: 'Rohan, 37, mid-career, decent income but high spending and debt',
    description:
      'The middle of the distribution: no factor is zero, none is full. A Building score built from five middling factors — the explanation has no single villain, so it must rank the improvements.',
    archetype: 'mid-career builder',
    question: 'What should I fix first to improve my score?',
    inputs: {
      emergencyFundBand: '1-3',
      monthlyIncome: 180000,
      monthlyExpenses: 150000,
      totalDebt: 1000000,
      holdings: [
        holding('RELIANCE', 270000),
        holding('HDFCBANK', 180000),
        holding('INFY', 90000),
        holding('TCS', 60000),
      ],
      holdingVolatilities: [
        vol('RELIANCE', 0.28, 270000),
        vol('HDFCBANK', 0.28, 180000),
        vol('INFY', 0.28, 90000),
        vol('TCS', 0.28, 60000),
      ],
    },
    expectedScore: 54,
    expectedBand: 'Building',
  },
  {
    id: 'debt-free-high-surplus',
    name: 'Debt-free, high surplus',
    persona: 'Nina, 30, no debt, saves half her income, thin buffer',
    description:
      'No debt and a 50% surplus, but only 1–3 months of emergency fund and a concentrated portfolio. Tests whether the explanation balances two strong factors against two weak ones.',
    archetype: 'debt-free high surplus',
    question: 'Why is my readiness score what it is?',
    inputs: {
      emergencyFundBand: '1-3',
      monthlyIncome: 140000,
      monthlyExpenses: 70000,
      totalDebt: 0,
      holdings: [
        holding('RELIANCE', 250000),
        holding('HDFCBANK', 150000),
        holding('INFY', 100000),
      ],
      holdingVolatilities: [
        vol('RELIANCE', 0.19, 250000),
        vol('HDFCBANK', 0.19, 150000),
        vol('INFY', 0.19, 100000),
      ],
    },
    expectedScore: 76,
    expectedBand: 'Ready',
  },
  {
    id: 'single-stock-gambler',
    name: 'Single-stock gambler',
    persona: 'Karan, 26, all-in on one volatile stock, no buffer',
    description:
      'One holding at 70% volatility, no emergency fund, moderate debt. Both portfolio factors score zero. The explanation must be direct about the risk without giving buy/sell advice.',
    archetype: 'single-stock gambler',
    question: 'Why is my readiness score what it is?',
    inputs: {
      emergencyFundBand: '0',
      monthlyIncome: 95000,
      monthlyExpenses: 80000,
      totalDebt: 300000,
      holdings: [holding('RELIANCE', 500000)],
      holdingVolatilities: [vol('RELIANCE', 0.7, 500000)],
    },
    expectedScore: 28,
    expectedBand: 'Not ready',
  },
  {
    id: 'retiree-steady',
    name: 'Retiree, steady',
    persona: 'Lakshmi, 64, retired, pension income, diversified holdings',
    description:
      'A pension income with a 25% surplus, a full emergency fund, and six holdings at 20% or less. Tests the formula on a low-income, high-stability profile — the score should be high.',
    archetype: 'retiree steady',
    question: 'Why is my readiness score what it is?',
    inputs: {
      emergencyFundBand: '6+',
      monthlyIncome: 60000,
      monthlyExpenses: 45000,
      totalDebt: 0,
      holdings: [
        holding('RELIANCE', 200000),
        holding('HDFCBANK', 180000),
        holding('INFY', 170000),
        holding('TCS', 160000),
        holding('ITC', 150000),
        holding('SBIN', 140000),
      ],
      holdingVolatilities: [
        vol('RELIANCE', 0.11, 200000),
        vol('HDFCBANK', 0.11, 180000),
        vol('INFY', 0.11, 170000),
        vol('TCS', 0.11, 160000),
        vol('ITC', 0.11, 150000),
        vol('SBIN', 0.11, 140000),
      ],
    },
    expectedScore: 96,
    expectedBand: 'Ready',
  },
  {
    id: 'freelancer-irregular',
    name: 'Freelancer, irregular income',
    persona: 'Imran, 33, freelancer, good months and thin months',
    description:
      'High income but high expenses, moderate debt, a thin buffer, and a middling portfolio. Another Building case — the explanation must work with five partial factors.',
    archetype: 'freelancer irregular',
    question: 'What should I fix first to improve my score?',
    inputs: {
      emergencyFundBand: '1-3',
      monthlyIncome: 160000,
      monthlyExpenses: 130000,
      totalDebt: 400000,
      holdings: [
        holding('RELIANCE', 140000),
        holding('HDFCBANK', 110000),
        holding('INFY', 90000),
        holding('TCS', 80000),
        holding('ITC', 80000),
      ],
      holdingVolatilities: [
        vol('RELIANCE', 0.24, 140000),
        vol('HDFCBANK', 0.24, 110000),
        vol('INFY', 0.24, 90000),
        vol('TCS', 0.24, 80000),
        vol('ITC', 0.24, 80000),
      ],
    },
    expectedScore: 65,
    expectedBand: 'Building',
  },
  {
    id: 'new-investor',
    name: 'New investor',
    persona: 'Tara, 28, started investing this year, two holdings',
    description:
      'Strong cash flow, but only two holdings — one at 55%. The score is high on cash flow alone, which tests whether the explanation over-credits the portfolio or names its thinness.',
    archetype: 'new investor',
    question: 'Why is my readiness score what it is?',
    inputs: {
      emergencyFundBand: '3-6',
      monthlyIncome: 85000,
      monthlyExpenses: 55000,
      totalDebt: 0,
      holdings: [holding('RELIANCE', 55000), holding('NIFTYBEES', 45000)],
      holdingVolatilities: [
        vol('RELIANCE', 0.17, 55000),
        vol('NIFTYBEES', 0.17, 45000),
      ],
    },
    expectedScore: 87,
    expectedBand: 'Ready',
  },
  {
    id: 'emergency-only',
    name: 'Emergency fund only',
    persona: 'Farhan, 44, big cash buffer, big debt, no portfolio',
    description:
      'A full emergency fund but debt at 83% of annual income and no holdings: the score rescales over 70 points. Tests whether the explanation separates the strong buffer from the heavy debt.',
    archetype: 'emergency fund only',
    question: 'Am I ready to start investing?',
    inputs: {
      emergencyFundBand: '6+',
      monthlyIncome: 70000,
      monthlyExpenses: 55000,
      totalDebt: 700000,
      holdings: [],
      holdingVolatilities: [],
    },
    expectedScore: 66,
    expectedBand: 'Building',
  },
  {
    id: 'maxed-out',
    name: 'Maxed out',
    persona:
      'A profile at the floor: no buffer, debt over income, deficit spending, one volatile holding',
    description:
      'Every factor scores zero — the floor case. The explanation must stay honest and constructive at a score of 0, and the guardrail must still verify the (all-zero) numbers exactly.',
    archetype: 'maxed out (floor case)',
    question: 'What should I fix first to improve my score?',
    inputs: {
      emergencyFundBand: '0',
      monthlyIncome: 60000,
      monthlyExpenses: 62000,
      totalDebt: 900000,
      holdings: [holding('RELIANCE', 40000)],
      holdingVolatilities: [vol('RELIANCE', 0.75, 40000)],
    },
    expectedScore: 0,
    expectedBand: 'Not ready',
  },
  {
    id: 'balanced-ready',
    name: 'Balanced and ready',
    persona: 'Aditi, 39, high earner, eight balanced holdings, full buffer',
    description:
      'The second ceiling case: every factor at full marks, with a different composition from healthy-saver (higher income, eight holdings, 15% largest). The explanation should have almost nothing to fix.',
    archetype: 'balanced ready',
    question: 'Why is my readiness score what it is?',
    inputs: {
      emergencyFundBand: '6+',
      monthlyIncome: 250000,
      monthlyExpenses: 150000,
      totalDebt: 0,
      holdings: [
        holding('RELIANCE', 150000),
        holding('HDFCBANK', 140000),
        holding('INFY', 130000),
        holding('TCS', 120000),
        holding('ITC', 120000),
        holding('SBIN', 120000),
        holding('ICICIBANK', 110000),
        holding('NIFTYBEES', 110000),
      ],
      holdingVolatilities: [
        vol('RELIANCE', 0.13, 150000),
        vol('HDFCBANK', 0.13, 140000),
        vol('INFY', 0.13, 130000),
        vol('TCS', 0.13, 120000),
        vol('ITC', 0.13, 120000),
        vol('SBIN', 0.13, 120000),
        vol('ICICIBANK', 0.13, 110000),
        vol('NIFTYBEES', 0.13, 110000),
      ],
    },
    expectedScore: 100,
    expectedBand: 'Ready',
  },
  {
    id: 'partial-history',
    name: 'Partial price history',
    persona:
      'Neha, 30, holdings bought recently — too little history for volatility',
    description:
      'Four holdings with no volatility data at all: the volatility factor is unavailable and the score rescales over 85 points. Tests the missing-factor rescaling on the portfolio side.',
    archetype: 'partial history (edge case)',
    question: 'Why is my readiness score what it is?',
    inputs: {
      emergencyFundBand: '3-6',
      monthlyIncome: 130000,
      monthlyExpenses: 85000,
      totalDebt: 100000,
      holdings: [
        holding('RELIANCE', 150000),
        holding('HDFCBANK', 130000),
        holding('INFY', 110000),
        holding('TCS', 110000),
      ],
      holdingVolatilities: [],
    },
    expectedScore: 89,
    expectedBand: 'Ready',
  },
];

export function scenarioById(id: string): EvalScenario | undefined {
  return EVAL_SCENARIOS.find((scenario) => scenario.id === id);
}
