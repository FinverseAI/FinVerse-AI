/**
 * Deterministic, lexicon-based sentiment for news headlines. This is the
 * numeric signal — auditable, reproducible, and cheap: every score can be
 * traced to the exact words that produced it (the `matched` lists).
 *
 * It deliberately does NOT try to understand negation, sarcasm, or
 * context. The consolidated narrative the user reads comes from the LLM
 * weighing the articles together (strategy doc §3.1); this score is the
 * deterministic input to that synthesis, not a replacement for it.
 *
 * Score: (positive − negative) / (positive + negative), in [-1, 1]; 0
 * when no lexicon word matches. Labels: >= 0.2 positive, <= -0.2
 * negative, otherwise neutral.
 */

const POSITIVE_WORDS = [
  'growth',
  'profit',
  'surge',
  'surges',
  'surged',
  'beat',
  'beats',
  'record',
  'strong',
  'rally',
  'rallies',
  'gain',
  'gains',
  'gained',
  'rise',
  'rises',
  'rising',
  'rose',
  'up',
  'jump',
  'jumps',
  'jumped',
  'soar',
  'soars',
  'soared',
  'bullish',
  'outperform',
  'outperforms',
  'upgrade',
  'upgrades',
  'upgraded',
  'buyback',
  'dividend',
  'expansion',
  'expand',
  'expands',
  'win',
  'wins',
  'won',
  'deal',
  'partnership',
  'launch',
  'launches',
  'approve',
  'approves',
  'approved',
  'approval',
  'recovery',
  'recover',
  'recovers',
  'boom',
  'booming',
  'higher',
  'best',
  'exceed',
  'exceeds',
  'exceeded',
];

const NEGATIVE_WORDS = [
  'loss',
  'losses',
  'fall',
  'falls',
  'fell',
  'fallen',
  'falling',
  'drop',
  'drops',
  'dropped',
  'decline',
  'declines',
  'declined',
  'miss',
  'misses',
  'missed',
  'slump',
  'slumps',
  'slumped',
  'crash',
  'crashes',
  'crashed',
  'plunge',
  'plunges',
  'plunged',
  'tumble',
  'tumbles',
  'tumbled',
  'bearish',
  'underperform',
  'underperforms',
  'downgrade',
  'downgrades',
  'downgraded',
  'debt',
  'default',
  'defaults',
  'defaulted',
  'fraud',
  'scam',
  'probe',
  'investigation',
  'fined',
  'penalty',
  'lawsuit',
  'layoff',
  'layoffs',
  'weak',
  'weakness',
  'slowdown',
  'slows',
  'volatile',
  'volatility',
  'down',
  'lower',
  'worst',
  'fail',
  'fails',
  'failed',
  'bankrupt',
  'bankruptcy',
];

export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export interface SentimentResult {
  score: number;
  label: SentimentLabel;
  matchedPositive: string[];
  matchedNegative: string[];
}

function matchWords(text: string, words: string[]): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const word of words) {
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    if (pattern.test(lower)) matched.push(word);
  }
  return matched;
}

/** Score one headline (or any short text). Pure and deterministic. */
export function scoreSentiment(text: string): SentimentResult {
  const matchedPositive = matchWords(text, POSITIVE_WORDS);
  const matchedNegative = matchWords(text, NEGATIVE_WORDS);
  const positive = matchedPositive.length;
  const negative = matchedNegative.length;
  const total = positive + negative;
  const score =
    total === 0 ? 0 : Math.round(((positive - negative) / total) * 100) / 100;
  return {
    score,
    label: score >= 0.2 ? 'positive' : score <= -0.2 ? 'negative' : 'neutral',
    matchedPositive,
    matchedNegative,
  };
}

export interface SentimentAggregate {
  score: number;
  label: SentimentLabel;
  positive: number;
  negative: number;
  neutral: number;
}

/**
 * Aggregate per-article scores into one overall reading. The score is the
 * mean of the article scores (rounded to 2dp); the counts show how the
 * articles split, so a "neutral" mean over a polarised set is visible
 * instead of hiding the disagreement.
 */
export function aggregateSentiment(
  scores: SentimentResult[],
): SentimentAggregate {
  const positive = scores.filter((s) => s.label === 'positive').length;
  const negative = scores.filter((s) => s.label === 'negative').length;
  const neutral = scores.length - positive - negative;
  const mean =
    scores.length === 0
      ? 0
      : Math.round(
          (scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 100,
        ) / 100;
  return {
    score: mean,
    label: mean >= 0.2 ? 'positive' : mean <= -0.2 ? 'negative' : 'neutral',
    positive,
    negative,
    neutral,
  };
}
