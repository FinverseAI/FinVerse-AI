import type { RetrievedChunk } from '../rag/rag.repository';
import type { ScreenResponse } from '../rag/rag.service';
import type { AiAnswer, AiClaim } from './ai.validation';

/**
 * The Phase 3 guardrail: deterministic verification of every LLM claim
 * before the user sees it. The model reasons; the code calculates — and
 * this module is the code double-checking the model's arithmetic and
 * citations against the deterministic layer.
 *
 * Verification is PURE (verifyAnswer has no I/O): it compares a parsed
 * structured answer against the evidence collected during the request
 * (tool results, retrieved chunks, the screen). Persistence of the
 * check log lives in the GuardrailService wrapper.
 *
 * What is checked, per claim:
 * - SOURCE: the cited tool is a real citation tool AND was actually
 *   used in this request (catches fake citations and invented tools).
 * - VALUE: every numeric value in the claim matches the tool result
 *   (exact for money, small tolerance for percentages/ratios). Values
 *   are matched by field name — never by "the number appears somewhere"
 *   — so swapped numbers are caught. When the claim names an element
 *   (a category, symbol, or goal), the numbers are checked against
 *   THAT element only (catches category/symbol swaps).
 * - TEXT: every significant number in the claim text itself (amounts,
 *   percentages, decimals) must agree with the claim's own declared
 *   values or the element it is about — the narrative cannot
 *   contradict the cited values, and it cannot smuggle in a number
 *   from elsewhere in the tool result (a swapped number would match
 *   the wrong field if the whole result were searched). The same
 *   check runs on the ANSWER text itself, against the union of all
 *   declared values, scoped elements, and cited articles — the user
 *   reads the answer, not the claims, so an unclaimed number in the
 *   prose is a failure even when every claim checks out.
 * - CITATION: for searchKnowledge claims, the cited title/date/symbol
 *   must match a chunk actually retrieved in this request.
 *
 * Tolerances (documented choice):
 * - MONEY is compared EXACTLY, to the paise. The tools return rupee
 *   values rounded to 2 decimals and the model is instructed to copy
 *   them exactly, so any difference is a real error. (A ₹1 error on
 *   ₹8,200 is a wrong number, not a rounding artefact.)
 * - PERCENTAGES, RATIOS and index values (RSI, P/E, yields) are
 *   compared within ±0.1 absolute points. The tools round these to 2
 *   decimals and the model legitimately restates them to 1 decimal
 *   (55.55 → 55.6); 0.1 absorbs that restatement while still catching
 *   a genuinely wrong figure (55.55 → 56.5 fails).
 */

export type GuardrailFeature =
  'chat' | 'explain-stock' | 'explain-news' | 'screen' | 'explain-readiness';

export type GuardrailCheckType = 'source' | 'value' | 'text' | 'citation';

/** Money must match exactly, to the paise. */
export const MONEY_TOLERANCE_PAISE = 0;
/** Percentages, ratios and index values: ±0.1 absolute points. */
export const PERCENT_TOLERANCE = 0.1;

/** Tools a claim may legitimately cite as its evidence source. */
export const CITATION_TOOLS = [
  'getPortfolioSummary',
  'getBudgetStatus',
  'getTransactions',
  'getStockQuote',
  'getStockFundamentals',
  'getCategorySpending',
  'getGoalProgress',
  'getReadinessScore',
  'searchKnowledge',
  'screenStocks',
] as const;

/**
 * One retrieved chunk, normalised from either the raw retrieval shape
 * (snake_case) or the searchKnowledge tool shape (camelCase, truncated
 * content). The model only ever saw the truncated content in chat, so
 * the guardrail checks against the same text the model saw.
 */
export interface GuardrailChunk {
  title: string | null;
  symbol: string | null;
  publishedAt: string | null;
  sourceType: string;
  content: string;
}

/**
 * The evidence collected during one request. The AI service builds it
 * from the tool results and retrievals it already has — the guardrail
 * never re-fetches data itself, so verification runs on exactly the
 * numbers the model was shown.
 */
export interface GuardrailContext {
  requestId: string;
  userId: string;
  feature: GuardrailFeature;
  /** Tool results from this request, per tool name (a tool may run twice). */
  toolResults: Map<string, unknown[]>;
  /** Chunks actually retrieved during this request. */
  chunks: GuardrailChunk[];
  /** The deterministic screen (screen path only). */
  screen?: ScreenResponse;
}

export interface GuardrailCheckRow {
  claimIndex: number;
  claimText: string;
  sourceTool: string;
  checkType: GuardrailCheckType;
  /** The verified value as text, for the log and the correction prompt. */
  expected: string | null;
  /** The claimed value as text. */
  actual: string | null;
  passed: boolean;
  detail: string;
}

export interface GuardrailResult {
  passed: boolean;
  checks: GuardrailCheckRow[];
  failures: GuardrailCheckRow[];
  checksPassed: number;
  checksFailed: number;
}

/**
 * The verification state carried on every AI response, so the UI can
 * show whether the answer was checked, templated, refused, or served
 * without a model at all.
 */
export interface VerificationState {
  status: 'verified' | 'template' | 'refused' | 'unavailable';
  checksPassed: number;
  checksFailed: number;
}

/** Normalise a field name for matching: totalSpent → totalspent. */
export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Normalise free text for matching: case and punctuation ignored. */
function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Labels the model plausibly uses that differ from the tool's field
 * names. Only consulted when the literal key is NOT in the evidence,
 * so an alias can never override a real field — and 'total' is
 * deliberately absent (it is ambiguous between totals).
 */
const KEY_ALIASES: Record<string, string[]> = {
  pe: ['trailingpe', 'forwardpe', 'peratio'],
  peratio: ['trailingpe', 'forwardpe'],
  change: ['changepercent'],
  pctchange: ['changepercent'],
  divyield: ['dividendyield'],
  rsi: ['rsi14'],
  '52weekhigh': ['fiftytwoweekhigh'],
  '52weeklow': ['fiftytwoweeklow'],
  '52whigh': ['fiftytwoweekhigh'],
  '52wlow': ['fiftytwoweeklow'],
  spent: ['totalspent'],
  invested: ['totalinvested'],
  gain: ['totalgainloss'],
  loss: ['totalgainloss'],
  gainloss: ['totalgainloss'],
  saved: ['totalsaved'],
  count: ['matches', 'matchcount'],
  matches: ['matchcount'],
};

function kindOfKey(normalized: string): 'money' | 'percent' {
  if (
    normalized.includes('percent') ||
    normalized.includes('pct') ||
    normalized === 'rsi14' ||
    normalized === 'rsi' ||
    normalized.includes('ratio') ||
    normalized === 'pe' ||
    normalized.includes('trailingpe') ||
    normalized.includes('forwardpe') ||
    normalized.includes('yield')
  ) {
    return 'percent';
  }
  return 'money';
}

function numbersMatch(
  kind: 'money' | 'percent',
  claimed: number,
  actual: number,
): boolean {
  if (kind === 'money') {
    return (
      Math.round(claimed * 100) + MONEY_TOLERANCE_PAISE ===
      Math.round(actual * 100)
    );
  }
  return Math.abs(claimed - actual) <= PERCENT_TOLERANCE;
}

function formatValue(value: number | string | null): string | null {
  if (value === null) return null;
  return typeof value === 'number' ? String(value) : value;
}

interface FlatElement {
  id: string;
  rawId: string;
  fields: Map<string, number[]>;
}

interface FlatData {
  scalars: Map<string, number[]>;
  elements: FlatElement[];
  text: string;
}

function addNumber(map: Map<string, number[]>, key: string, value: number) {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
}

/** The identifying field of an array element: name, symbol, category, title. */
function elementId(record: Record<string, unknown>): string | null {
  for (const key of ['name', 'symbol', 'category', 'title']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function flattenInto(
  value: unknown,
  scalars: Map<string, number[]>,
  elements: FlatElement[],
) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry !== null && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        const id = elementId(record);
        const fields = new Map<string, number[]>();
        // One element's own leaves, flattened recursively.
        const collect = (node: unknown) => {
          if (Array.isArray(node)) {
            for (const item of node) collect(item);
            return;
          }
          if (node !== null && typeof node === 'object') {
            for (const [key, child] of Object.entries(node)) {
              if (typeof child === 'number' && Number.isFinite(child)) {
                addNumber(fields, normalizeKey(key), child);
              } else {
                collect(child);
              }
            }
          }
        };
        collect(record);
        if (id !== null) {
          elements.push({ id: normalizeText(id), rawId: id, fields });
        }
        // Element leaves are ALSO global scalars: an unscoped claim
        // ("spent ₹8,600", no category named) can still match. Scoped
        // matching takes precedence whenever an identifier is present.
        for (const [key, values] of fields) {
          for (const number of values) addNumber(scalars, key, number);
        }
      }
    }
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === 'number' && Number.isFinite(child)) {
        addNumber(scalars, normalizeKey(key), child);
      } else {
        flattenInto(child, scalars, elements);
      }
    }
  }
}

function flattenToolResults(results: unknown[]): FlatData {
  const scalars = new Map<string, number[]>();
  const elements: FlatElement[] = [];
  for (const result of results) flattenInto(result, scalars, elements);
  const text = results
    .map((result) => {
      try {
        return JSON.stringify(result) ?? '';
      } catch {
        return '';
      }
    })
    .join(' ')
    .toLowerCase();
  return { scalars, elements, text };
}

/** The screen's evidence: only the matched rows, never the filters. */
function flattenScreen(screen: ScreenResponse): FlatData {
  const scalars = new Map<string, number[]>();
  addNumber(scalars, 'matchcount', screen.matches.length);
  addNumber(scalars, 'count', screen.matches.length);
  addNumber(scalars, 'matches', screen.matches.length);
  addNumber(scalars, 'universe', screen.universe.length);
  const elements: FlatElement[] = screen.matches.map((stock) => {
    const fields = new Map<string, number[]>();
    const record = stock as unknown as Record<string, unknown>;
    for (const [key, child] of Object.entries(record)) {
      if (typeof child === 'number' && Number.isFinite(child)) {
        addNumber(fields, normalizeKey(key), child);
      }
    }
    return {
      id: normalizeText(stock.symbol),
      rawId: stock.symbol,
      fields,
    };
  });
  for (const element of elements) {
    for (const [key, values] of element.fields) {
      for (const number of values) addNumber(scalars, key, number);
    }
  }
  const text = JSON.stringify({
    matches: screen.matches,
    unavailable: screen.unavailable,
  }).toLowerCase();
  return { scalars, elements, text };
}

export interface ExtractedNumber {
  value: number;
  raw: string;
  unit: 'plain' | 'percent' | 'crore' | 'lakh' | 'thousand';
}

const UNIT_MULTIPLIERS: Record<string, number> = {
  crore: 10_000_000,
  lakh: 100_000,
  thousand: 1_000,
};

/**
 * Significant numbers in claim text: amounts (₹/Rs), percentages,
 * decimals, and integers of 3+ digits. Small bare integers (counts,
 * periods, "RSI (14)", "20-day") and years are skipped — they are
 * labels, not values. Indian grouping (1,20,000) and "lakh crore"
 * are handled.
 */
export function extractTextNumbers(text: string): ExtractedNumber[] {
  const withoutDates = text
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    // A sign before the currency marker ("−₹1,200") moves after it so
    // the number pattern below sees it.
    .replace(/([−–-])\s*(₹|Rs\.?|INR)/g, '$2$1');
  const found: ExtractedNumber[] = [];
  const pattern =
    /(₹|Rs\.?|INR)?\s*([-−–]?\d[\d,]*(?:\.\d+)?)\s*(lakh crore|crore|lakh|thousand|%|percent)?/gi;
  for (const match of withoutDates.matchAll(pattern)) {
    const marker = match[1] ?? '';
    const rawNumber = (match[2] ?? '').replace(/,/g, '');
    const unitWord = (match[3] ?? '').toLowerCase();
    if (rawNumber === '' || rawNumber === '-' || rawNumber === '−') continue;
    const parsed = Number.parseFloat(rawNumber.replace(/−/g, '-'));
    if (!Number.isFinite(parsed)) continue;
    const hasMarker = marker !== '' || unitWord !== '';
    const isDecimal = rawNumber.includes('.');
    // Bare small integers and bare years are labels, not values.
    if (!hasMarker && !isDecimal) {
      if (Math.abs(parsed) < 100) continue;
      if (parsed >= 1900 && parsed <= 2100) continue;
    }
    let value = parsed;
    let unit: ExtractedNumber['unit'] = 'plain';
    if (unitWord === 'lakh crore') {
      value = parsed * 100_000 * 10_000_000;
      unit = 'crore';
    } else if (unitWord === '%' || unitWord === 'percent') {
      unit = 'percent';
    } else if (unitWord !== '') {
      value = parsed * (UNIT_MULTIPLIERS[unitWord] ?? 1);
      unit = unitWord as ExtractedNumber['unit'];
    }
    found.push({ value, raw: match[0].trim(), unit });
  }
  return found;
}

/** A symbol comparison that ignores the exchange suffix (.NS/.BO). */
function sameSymbol(a: string, b: string): boolean {
  const strip = (value: string) =>
    value
      .trim()
      .toUpperCase()
      .replace(/\.(NS|BO|NSE)$/, '');
  return strip(a) === strip(b) && strip(a) !== '';
}

function dateToDay(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/**
 * Normalise raw retrieved chunks (snake_case) into guardrail chunks.
 */
export function chunksFromRetrieved(
  chunks: RetrievedChunk[],
): GuardrailChunk[] {
  return chunks.map((chunk) => ({
    title: chunk.title,
    symbol: chunk.symbol,
    publishedAt: chunk.published_at
      ? chunk.published_at.toISOString().slice(0, 10)
      : null,
    sourceType: chunk.source_type,
    content: chunk.content,
  }));
}

/**
 * Normalise searchKnowledge tool results (camelCase, truncated
 * content) into guardrail chunks. The model only saw the truncated
 * text, so the guardrail checks against that same text.
 */
export function chunksFromToolResults(results: unknown[]): GuardrailChunk[] {
  const chunks: GuardrailChunk[] = [];
  for (const result of results) {
    if (!isRecord(result)) continue;
    const list = result.chunks;
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (!isRecord(entry)) continue;
      chunks.push({
        title: asString(entry.title),
        symbol: asString(entry.symbol),
        publishedAt: asString(entry.publishedAt ?? entry.published_at),
        sourceType: asString(entry.sourceType ?? entry.source_type) ?? 'news',
        content: asString(entry.content) ?? '',
      });
    }
  }
  return chunks;
}

function checkRow(
  claimIndex: number,
  claim: AiClaim,
  checkType: GuardrailCheckType,
  passed: boolean,
  detail: string,
  expected: number | string | null = null,
  actual: number | string | null = null,
): GuardrailCheckRow {
  return {
    claimIndex,
    claimText: claim.text,
    sourceTool: claim.source.tool,
    checkType,
    expected: formatValue(expected),
    actual: formatValue(actual),
    passed,
    detail,
  };
}

/**
 * Find the array element the claim is about (a category, symbol, goal,
 * or stock): an exact identifier match wins; a unique prefix match
 * ("food" → "Food & Dining") is accepted; ambiguous prefixes do not
 * scope (an ambiguous scope would check against the wrong element).
 */
function findScopedElement(claim: AiClaim, flat: FlatData): FlatElement | null {
  for (const value of Object.values(claim.source.values)) {
    if (typeof value !== 'string') continue;
    const norm = normalizeText(value);
    if (norm.length < 3) continue;
    const exact = flat.elements.find((element) => element.id === norm);
    if (exact) return exact;
    const prefixed = flat.elements.filter(
      (element) => element.id.startsWith(norm) || norm.startsWith(element.id),
    );
    if (prefixed.length === 1) return prefixed[0] as FlatElement;
  }
  return null;
}

function checkNumericValue(
  claimIndex: number,
  claim: AiClaim,
  key: string,
  claimed: number,
  flat: FlatData,
  scoped: FlatElement | null,
): GuardrailCheckRow {
  const normalized = normalizeKey(key);
  const candidates = [normalized, ...(KEY_ALIASES[normalized] ?? [])];
  // A scoped claim checks against ITS element first: the element is
  // what the claim is about, so a key that exists there is authoritative.
  // Only keys the element does not have at all (e.g. a portfolio total
  // on a holding-scoped claim) fall through to the global scalars.
  const sources: Array<{ values: number[] | undefined; where: string }> = [];
  if (scoped) {
    for (const candidate of candidates) {
      const values = scoped.fields.get(candidate);
      if (values !== undefined) {
        sources.push({ values, where: scoped.rawId });
        break;
      }
    }
  }
  if (sources.length === 0) {
    for (const candidate of candidates) {
      const values = flat.scalars.get(candidate);
      if (values !== undefined) {
        sources.push({ values, where: 'tool result' });
        break;
      }
    }
  }
  const found = sources[0];
  if (!found || !found.values || found.values.length === 0) {
    return checkRow(
      claimIndex,
      claim,
      'value',
      false,
      `'${key}' was not returned by ${claim.source.tool} — the value cannot be verified.`,
      null,
      claimed,
    );
  }
  const kind = kindOfKey(normalized);
  const match = found.values.find((actual) =>
    numbersMatch(kind, claimed, actual),
  );
  if (match !== undefined) {
    return checkRow(
      claimIndex,
      claim,
      'value',
      true,
      `'${key}' matches the ${found.where} (${match}).`,
      match,
      claimed,
    );
  }
  const expected = found.values[0] as number;
  return checkRow(
    claimIndex,
    claim,
    'value',
    false,
    `'${key}' was ${claimed} but the ${found.where} says ${expected}.`,
    expected,
    claimed,
  );
}

function checkStringValue(
  claimIndex: number,
  claim: AiClaim,
  key: string,
  claimed: string,
  flat: FlatData,
): GuardrailCheckRow {
  const needle = claimed.toLowerCase();
  if (needle.trim().length < 3) {
    return checkRow(
      claimIndex,
      claim,
      'citation',
      true,
      `'${key}' is too short to check and is passed through.`,
      null,
      claimed,
    );
  }
  if (flat.text.includes(needle)) {
    return checkRow(
      claimIndex,
      claim,
      'citation',
      true,
      `'${claimed}' appears in the ${claim.source.tool} result.`,
      claimed,
      claimed,
    );
  }
  return checkRow(
    claimIndex,
    claim,
    'citation',
    false,
    `'${claimed}' does not appear in the ${claim.source.tool} result — it may be invented.`,
    null,
    claimed,
  );
}

/**
 * Text-number matching: ±0.1 absolute, widened by a relative term for
 * very large magnitudes — unit expansion ("17.6 lakh crore") and the
 * literal (17,600,000,000,000) differ by float noise at 1e13, so a
 * purely absolute tolerance would fail a correct market-cap restatement.
 * The relative term (1e-9) only absorbs representation noise: a genuinely
 * wrong figure differs by far more.
 */
function textNumbersMatch(claimed: number, actual: number): boolean {
  return (
    Math.abs(claimed - actual) <=
    Math.max(PERCENT_TOLERANCE, Math.abs(actual) * 1e-9)
  );
}

function checkTextNumber(
  claimIndex: number,
  claim: AiClaim,
  extracted: ExtractedNumber,
  numbers: number[],
  where = 'the claim text',
): GuardrailCheckRow {
  const match = numbers.find((actual) =>
    textNumbersMatch(extracted.value, actual),
  );
  if (match !== undefined) {
    return checkRow(
      claimIndex,
      claim,
      'text',
      true,
      `The number ${extracted.raw} in ${where} matches the evidence (${match}).`,
      match,
      extracted.value,
    );
  }
  return checkRow(
    claimIndex,
    claim,
    'text',
    false,
    `The number ${extracted.raw} in ${where} does not match any value in the cited evidence.`,
    null,
    extracted.value,
  );
}

/**
 * A searchKnowledge claim is verified against the retrieved chunks,
 * not the tool's numeric fields: the citation (title/date/symbol) must
 * match a chunk actually retrieved, and any number in the claim must
 * appear in that chunk's content (the article is the number's source).
 */
interface ClaimVerification {
  rows: GuardrailCheckRow[];
  /** Numbers the answer text may restate for this claim. */
  numbers: number[];
}

function verifySearchKnowledgeClaim(
  claimIndex: number,
  claim: AiClaim,
  chunks: GuardrailChunk[],
): ClaimVerification {
  const rows: GuardrailCheckRow[] = [];
  if (chunks.length === 0) {
    rows.push(
      checkRow(
        claimIndex,
        claim,
        'citation',
        false,
        'The claim cites retrieved knowledge, but nothing was retrieved in this request.',
      ),
    );
    return { rows, numbers: [] };
  }
  const values = claim.source.values;
  const title = asString(values.title ?? values.article ?? values.headline);
  const date = asString(
    values.date ?? values.publishedAt ?? values.published_at,
  );
  const symbol = asString(values.symbol);
  let matched: GuardrailChunk | null = null;
  if (title !== null) {
    const normTitle = normalizeText(title);
    matched =
      chunks.find((chunk) => {
        if (!chunk.title) return false;
        const normChunk = normalizeText(chunk.title);
        if (normTitle.length < 10 || normChunk.length < 10) return false;
        return normChunk.includes(normTitle) || normTitle.includes(normChunk);
      }) ?? null;
    rows.push(
      checkRow(
        claimIndex,
        claim,
        'citation',
        matched !== null,
        matched !== null
          ? `The cited article "${title}" was retrieved in this request.`
          : `The cited article "${title}" was not retrieved in this request — it may be invented.`,
        matched?.title ?? null,
        title,
      ),
    );
  }
  if (date !== null) {
    const day = dateToDay(date);
    const pool = matched !== null ? [matched] : chunks;
    const dateMatch = pool.some(
      (chunk) => chunk.publishedAt !== null && chunk.publishedAt === day,
    );
    rows.push(
      checkRow(
        claimIndex,
        claim,
        'citation',
        dateMatch,
        dateMatch
          ? `The cited date ${date} matches the retrieved article.`
          : `The cited date ${date} does not match any retrieved article.`,
        matched?.publishedAt ?? null,
        date,
      ),
    );
  }
  if (symbol !== null) {
    const pool = matched !== null ? [matched] : chunks;
    const symbolMatch = pool.some(
      (chunk) => chunk.symbol !== null && sameSymbol(chunk.symbol, symbol),
    );
    rows.push(
      checkRow(
        claimIndex,
        claim,
        'citation',
        symbolMatch,
        symbolMatch
          ? `The cited symbol ${symbol} matches the retrieved context.`
          : `The cited symbol ${symbol} does not match any retrieved article.`,
        matched?.symbol ?? null,
        symbol,
      ),
    );
  }
  if (title === null && date === null && symbol === null) {
    // No structured citation: fall back to content matching on any
    // string value, so a claim quoting article text can still pass.
    const strings = Object.values(values).filter(
      (value): value is string =>
        typeof value === 'string' && normalizeText(value).length >= 10,
    );
    const contentMatch = strings.some((value) =>
      chunks.some((chunk) =>
        normalizeText(chunk.content).includes(normalizeText(value)),
      ),
    );
    rows.push(
      checkRow(
        claimIndex,
        claim,
        'citation',
        contentMatch,
        contentMatch
          ? 'The cited text appears in the retrieved articles.'
          : 'The claim cites retrieved knowledge but names no retrievable article, date, or symbol.',
      ),
    );
  }
  // Numbers in a knowledge claim come from the article prose: they
  // must appear in the matched chunk's content (or any retrieved chunk
  // when no title matched — the citation check above already failed
  // then, so these rows only add detail).
  const evidence = matched !== null ? [matched] : chunks;
  const contentNumbers = evidence.flatMap((chunk) =>
    extractTextNumbers(chunk.content).map((entry) => entry.value),
  );
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const match = contentNumbers.find((actual) =>
      textNumbersMatch(value, actual),
    );
    rows.push(
      checkRow(
        claimIndex,
        claim,
        'value',
        match !== undefined,
        match !== undefined
          ? `'${key}' (${value}) appears in the cited article.`
          : `'${key}' (${value}) does not appear in the cited article.`,
        match ?? null,
        value,
      ),
    );
  }
  for (const extracted of extractTextNumbers(claim.text)) {
    rows.push(checkTextNumber(claimIndex, claim, extracted, contentNumbers));
  }
  return { rows, numbers: contentNumbers };
}

function verifyToolClaim(
  claimIndex: number,
  claim: AiClaim,
  flat: FlatData,
): ClaimVerification {
  const rows: GuardrailCheckRow[] = [];
  const entries = Object.entries(claim.source.values);
  const scoped = findScopedElement(claim, flat);
  let verifiable = false;
  for (const [key, value] of entries) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      verifiable = true;
      rows.push(checkNumericValue(claimIndex, claim, key, value, flat, scoped));
    } else if (typeof value === 'string') {
      verifiable = true;
      rows.push(checkStringValue(claimIndex, claim, key, value, flat));
    }
    // Booleans and nulls carry no verifiable substance; the numbers
    // and identifiers around them are what get checked.
  }
  // The prose must agree with the claim's own declared values (or
  // the element it is about) — NOT with "some number anywhere in
  // the tool result". Matching against the whole result would let a
  // swapped number pass: "spent ₹10,000" would match the budgeted
  // figure even though the claim cites totalSpent 8200. The model is
  // instructed to cite every value it states, so a number in the
  // prose that is not in the values is an unsupported number, and
  // the retry teaches the model to cite it.
  const declaredNumbers = entries
    .map(([, value]) => value)
    .filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value),
    );
  if (scoped) {
    for (const values of scoped.fields.values()) {
      declaredNumbers.push(...values);
    }
  }
  const textNumbers = extractTextNumbers(claim.text);
  if (textNumbers.length > 0) {
    verifiable = true;
    for (const extracted of textNumbers) {
      rows.push(checkTextNumber(claimIndex, claim, extracted, declaredNumbers));
    }
  }
  if (!verifiable) {
    rows.push(
      checkRow(
        claimIndex,
        claim,
        'value',
        false,
        'The claim cites no verifiable values — it cannot be checked against the evidence.',
      ),
    );
  }
  return { rows, numbers: declaredNumbers };
}

/**
 * Verify a structured answer against the request's evidence. Pure:
 * no I/O, no re-fetching — the caller supplies the evidence the model
 * was shown. Returns every check (pass and fail); the caller logs them
 * and decides what to show the user.
 */
export function verifyAnswer(
  answer: AiAnswer,
  context: GuardrailContext,
): GuardrailResult {
  if (answer.refused || answer.claims.length === 0) {
    if (answer.refused) {
      return {
        passed: true,
        checks: [],
        failures: [],
        checksPassed: 0,
        checksFailed: 0,
      };
    }
    const empty: GuardrailCheckRow = {
      claimIndex: -1,
      claimText: '',
      sourceTool: '',
      checkType: 'source',
      expected: null,
      actual: null,
      passed: false,
      detail: 'The answer carries no claims to verify.',
    };
    return {
      passed: false,
      checks: [empty],
      failures: [empty],
      checksPassed: 0,
      checksFailed: 1,
    };
  }
  const checks: GuardrailCheckRow[] = [];
  const answerNumbers: number[] = [];
  answer.claims.forEach((claim, claimIndex) => {
    const tool = claim.source.tool;
    if (!(CITATION_TOOLS as readonly string[]).includes(tool)) {
      checks.push(
        checkRow(
          claimIndex,
          claim,
          'source',
          false,
          `'${tool}' is not a tool this answer can cite — the citation is invented.`,
        ),
      );
      return;
    }
    if (tool === 'searchKnowledge') {
      // The citation is the chunks, whether they arrived via the tool
      // (chat) or via direct retrieval (explain paths).
      if (context.chunks.length === 0) {
        checks.push(
          checkRow(
            claimIndex,
            claim,
            'source',
            false,
            'The claim cites retrieved knowledge, but nothing was retrieved in this request.',
          ),
        );
        return;
      }
      const verified = verifySearchKnowledgeClaim(
        claimIndex,
        claim,
        context.chunks,
      );
      checks.push(
        checkRow(
          claimIndex,
          claim,
          'source',
          true,
          'Retrieved knowledge was used in this request.',
        ),
        ...verified.rows,
      );
      answerNumbers.push(...verified.numbers);
      return;
    }
    if (tool === 'screenStocks') {
      if (!context.screen) {
        checks.push(
          checkRow(
            claimIndex,
            claim,
            'source',
            false,
            'The claim cites the screener, but no screen ran in this request.',
          ),
        );
        return;
      }
      const verified = verifyToolClaim(
        claimIndex,
        claim,
        flattenScreen(context.screen),
      );
      checks.push(
        checkRow(
          claimIndex,
          claim,
          'source',
          true,
          'The screener ran in this request.',
        ),
        ...verified.rows,
      );
      answerNumbers.push(...verified.numbers);
      return;
    }
    const results = context.toolResults.get(tool);
    if (!results || results.length === 0) {
      checks.push(
        checkRow(
          claimIndex,
          claim,
          'source',
          false,
          `'${tool}' was not called in this request — the claim cites data the model never saw.`,
        ),
      );
      return;
    }
    const verified = verifyToolClaim(
      claimIndex,
      claim,
      flattenToolResults(results),
    );
    checks.push(
      checkRow(
        claimIndex,
        claim,
        'source',
        true,
        `'${tool}' ran in this request.`,
      ),
      ...verified.rows,
    );
    answerNumbers.push(...verified.numbers);
  });
  // The answer text itself: every number in the prose the user reads
  // must be restating something the claims cite (or something in the
  // cited elements/articles). claimIndex -1 marks answer-level checks.
  const answerClaim: AiClaim = {
    text: answer.answer,
    source: { tool: 'answer', values: {} },
  };
  for (const extracted of extractTextNumbers(answer.answer)) {
    checks.push(
      checkTextNumber(-1, answerClaim, extracted, answerNumbers, 'the answer'),
    );
  }
  const failures = checks.filter((check) => !check.passed);
  return {
    passed: failures.length === 0,
    checks,
    failures,
    checksPassed: checks.length - failures.length,
    checksFailed: failures.length,
  };
}
