"use client";

import { useEffect, useRef, useState } from "react";
import { PanelHeading, ProgressBar } from "./ui";
import { money } from "./data";
import { formatPrice } from "../../../lib/market";
import {
  activityRequest,
  activityError,
  ActivityApiError,
} from "./use-activity";
import {
  claimToolLabel,
  formatClaimValues,
  formatEvidenceValue,
  isAiChatResponse,
  type AiChatResponse,
  type AiStatus,
} from "../../../lib/ai";

/**
 * Ask FinVerse AI: the chat UI for Phase 1's two bounded features —
 * finance insights (Ask mode) and stock explanations (Explain mode).
 *
 * The answer always shows its evidence: every claim cites the tool and
 * values it came from. When the model is unavailable or its answer could
 * not be verified, the backend falls back to raw computed metrics
 * (strategy doc §4.7) and this UI renders those instead — the feature
 * never fails outright.
 */

const SUGGESTIONS = [
  "Why did I overspend on food this month?",
  "How is my budget looking this month?",
  "How are my savings goals progressing?",
];

/** The forwarder allows 120s; the client waits a little longer. */
const AI_TIMEOUT_MS = 150000;

/**
 * POST to an AI route with the long timeout the reasoning model needs.
 * Shared by the screener and stock-news components (Phase 2).
 * Pass a signal to let the caller cancel the wait; the 150s timeout
 * still applies on top of it.
 */
export async function aiRequest<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const timeoutSignal = AbortSignal.timeout(AI_TIMEOUT_MS);
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal,
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ActivityApiError(
      "The server returned an invalid response. Please try again.",
      response.status,
    );
  }
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Unable to reach FinVerse AI. Please try again.";
    throw new ActivityApiError(message, response.status);
  }
  return data as T;
}

/** Shared by the readiness card (Phase 4), which explains through the same AI routes. */
export function aiErrorMessage(error: unknown): string {
  if (error instanceof ActivityApiError && error.status === 429) {
    return "You are asking too quickly. Please wait a moment and try again.";
  }
  if (error instanceof Error && error.name === "AbortError") {
    return "The request was cancelled.";
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "FinVerse AI took too long to answer. Please try again.";
  }
  return activityError(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function signedMoney(value: number): string {
  return `${value < 0 ? "−" : value > 0 ? "+" : ""}${money(Math.abs(value))}`;
}

function BudgetFallback({ data }: { data: Record<string, unknown> }) {
  if (data.available === false) {
    return <p className="text-sm text-dash-muted">No budget set up yet.</p>;
  }
  const categories = Array.isArray(data.categories)
    ? data.categories.filter(isRecord)
    : [];
  if (categories.length === 0) {
    return <p className="text-sm text-dash-muted">No budget categories yet.</p>;
  }
  const totalSpent = asNumber(data.totalSpent);
  const totalBudgeted = asNumber(data.totalBudgeted);
  return (
    <div>
      <ul className="space-y-2">
        {categories.map((category) => {
          const name = asString(category.name) ?? "Category";
          const budgeted = asNumber(category.budgeted);
          const spent = asNumber(category.spent);
          const remaining = asNumber(category.remaining);
          const overBudget = category.overBudget === true;
          return (
            <li
              key={name}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
            >
              <span className="text-dash-text">{name}</span>
              <span className="text-dash-muted">
                {spent !== null ? money(spent) : "—"} spent
                {budgeted !== null ? ` of ${money(budgeted)}` : ""}
                {remaining !== null && (
                  <span className={overBudget ? "text-dash-red" : ""}>
                    {" "}
                    · {overBudget ? "over by " : ""}
                    {money(Math.abs(remaining))} {overBudget ? "" : "left"}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {totalSpent !== null && totalBudgeted !== null && (
        <p className="mt-3 border-t border-dash-border pt-2 text-sm font-medium text-dash-text">
          {money(totalSpent)} spent of {money(totalBudgeted)} budgeted
        </p>
      )}
    </div>
  );
}

function GoalsFallback({ data }: { data: Record<string, unknown> }) {
  const goals = Array.isArray(data.goals) ? data.goals.filter(isRecord) : [];
  if (goals.length === 0) {
    return <p className="text-sm text-dash-muted">No savings goals yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {goals.map((goal) => {
        const name = asString(goal.name) ?? "Goal";
        const saved = asNumber(goal.saved);
        const target = asNumber(goal.target);
        const progress = asNumber(goal.progressPercent);
        const targetDate = asString(goal.targetDate);
        return (
          <li key={name}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="text-dash-text">{name}</span>
              <span className="text-dash-muted">
                {saved !== null ? money(saved) : "—"} saved
                {target !== null ? ` of ${money(target)}` : ""}
                {targetDate ? ` · by ${targetDate}` : ""}
              </span>
            </div>
            {progress !== null && (
              <ProgressBar
                value={progress}
                label={`${name} progress`}
                tone="accent"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PortfolioFallback({ data }: { data: Record<string, unknown> }) {
  const totals = isRecord(data.totals) ? data.totals : null;
  const holdings = Array.isArray(data.holdings)
    ? data.holdings.filter(isRecord)
    : [];
  if (holdings.length === 0) {
    return <p className="text-sm text-dash-muted">No holdings yet.</p>;
  }
  const totalValue = totals ? asNumber(totals.totalValue) : null;
  const totalGainLoss = totals ? asNumber(totals.totalGainLoss) : null;
  const totalGainLossPercent = totals
    ? asNumber(totals.totalGainLossPercent)
    : null;
  return (
    <div>
      <ul className="space-y-2">
        {holdings.map((holding) => {
          const symbol = asString(holding.symbol) ?? "Holding";
          const currentValue = asNumber(holding.currentValue);
          const gainLoss = asNumber(holding.gainLoss);
          return (
            <li
              key={symbol}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
            >
              <span className="text-dash-text">{symbol}</span>
              <span className="text-dash-muted">
                {currentValue !== null
                  ? money(currentValue)
                  : "price unavailable"}
                {gainLoss !== null && (
                  <span
                    className={
                      gainLoss < 0 ? "text-dash-red" : "text-dash-accent"
                    }
                  >
                    {" "}
                    · {signedMoney(gainLoss)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {totalValue !== null && (
        <p className="mt-3 border-t border-dash-border pt-2 text-sm font-medium text-dash-text">
          Total value {money(totalValue)}
          {totalGainLoss !== null && (
            <>
              {" "}
              · {signedMoney(totalGainLoss)}
              {totalGainLossPercent !== null &&
                ` (${totalGainLossPercent.toFixed(1)}%)`}
            </>
          )}
        </p>
      )}
    </div>
  );
}

const FUNDAMENTAL_FIELDS: Array<{ key: string; label: string }> = [
  { key: "sector", label: "Sector" },
  { key: "marketCap", label: "Market cap" },
  { key: "peRatio", label: "P/E ratio" },
  { key: "dividendYield", label: "Dividend yield" },
  { key: "fiftyTwoWeekHigh", label: "52-week high" },
  { key: "fiftyTwoWeekLow", label: "52-week low" },
];

function FundamentalsFallback({ data }: { data: Record<string, unknown> }) {
  const quote = isRecord(data.quote) ? data.quote : null;
  const fundamentals = isRecord(data.fundamentals) ? data.fundamentals : null;
  const technicals = isRecord(data.technicals) ? data.technicals : null;
  const price = quote ? asNumber(quote.price) : null;
  const changePercent = quote ? asNumber(quote.changePercent) : null;
  const previousClose = quote ? asNumber(quote.previousClose) : null;
  const name = quote ? asString(quote.name) : null;
  const technicalRows: Array<{ label: string; value: string }> = [];
  if (technicals) {
    const rsi = asNumber(technicals.rsi14);
    const sma20 = asNumber(technicals.sma20);
    const sma50 = asNumber(technicals.sma50);
    const change1mo = asNumber(technicals.change1moPercent);
    const change3mo = asNumber(technicals.change3moPercent);
    const macd = isRecord(technicals.macd) ? technicals.macd : null;
    if (rsi !== null)
      technicalRows.push({ label: "RSI (14)", value: String(rsi) });
    if (sma20 !== null)
      technicalRows.push({
        label: "20-day average",
        value: formatPrice(sma20),
      });
    if (sma50 !== null)
      technicalRows.push({
        label: "50-day average",
        value: formatPrice(sma50),
      });
    if (macd) {
      const histogram = asNumber(macd.histogram);
      if (histogram !== null)
        technicalRows.push({
          label: "MACD histogram",
          value: histogram.toFixed(2),
        });
    }
    if (change1mo !== null)
      technicalRows.push({
        label: "1-month change",
        value: `${change1mo.toFixed(1)}%`,
      });
    if (change3mo !== null)
      technicalRows.push({
        label: "3-month change",
        value: `${change3mo.toFixed(1)}%`,
      });
  }
  const note = technicals ? asString(technicals.note) : null;
  return (
    <div>
      <p className="text-sm text-dash-text">
        {name ? `${name} — ` : ""}
        {price !== null ? formatPrice(price) : "price unavailable"}
        {changePercent !== null && (
          <span
            className={changePercent < 0 ? "text-dash-red" : "text-dash-accent"}
          >
            {" "}
            · {changePercent > 0 ? "+" : ""}
            {changePercent.toFixed(2)}%
          </span>
        )}
        {previousClose !== null && (
          <span className="text-dash-muted">
            {" "}
            · previous close {formatPrice(previousClose)}
          </span>
        )}
      </p>
      {fundamentals && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {FUNDAMENTAL_FIELDS.map(({ key, label }) => {
            const value = fundamentals[key];
            if (value === null || value === undefined) return null;
            return (
              <div key={key} className="text-sm">
                <dt className="text-dash-muted">{label}</dt>
                <dd className="text-dash-text">
                  {formatEvidenceValue(key, value)}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
      {technicalRows.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {technicalRows.map(({ label, value }) => (
            <div key={label} className="text-sm">
              <dt className="text-dash-muted">{label}</dt>
              <dd className="text-dash-text">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {note && <p className="mt-3 text-sm text-dash-muted">{note}</p>}
    </div>
  );
}

/** The raw computed metrics, shown when the narrative is unavailable. */
function FallbackMetrics({ metrics }: { metrics: Record<string, unknown> }) {
  const budget = isRecord(metrics.getBudgetStatus)
    ? metrics.getBudgetStatus
    : null;
  const goals = isRecord(metrics.getGoalProgress)
    ? metrics.getGoalProgress
    : null;
  const portfolio = isRecord(metrics.getPortfolioSummary)
    ? metrics.getPortfolioSummary
    : null;
  const fundamentals = isRecord(metrics.fundamentals)
    ? metrics.fundamentals
    : null;
  const symbol = asString(metrics.symbol);
  return (
    <div className="space-y-5">
      {budget && (
        <section aria-label="Budget">
          <h4 className="mb-2 text-sm font-medium text-dash-text">
            Your budget
          </h4>
          <BudgetFallback data={budget} />
        </section>
      )}
      {goals && (
        <section aria-label="Savings goals">
          <h4 className="mb-2 text-sm font-medium text-dash-text">
            Your savings goals
          </h4>
          <GoalsFallback data={goals} />
        </section>
      )}
      {portfolio && (
        <section aria-label="Portfolio">
          <h4 className="mb-2 text-sm font-medium text-dash-text">
            Your portfolio
          </h4>
          <PortfolioFallback data={portfolio} />
        </section>
      )}
      {fundamentals && (
        <section
          aria-label={symbol ? `Figures for ${symbol}` : "Stock figures"}
        >
          <h4 className="mb-2 text-sm font-medium text-dash-text">
            {symbol ?? "Stock"} — computed figures
          </h4>
          <FundamentalsFallback data={fundamentals} />
        </section>
      )}
    </div>
  );
}

/**
 * Phase 3: how this answer was verified. Verified answers show their
 * check count; template answers say plainly that the AI's text did not
 * pass verification and the summary below was built from the verified
 * numbers instead. Refusals and raw-metrics fallbacks need no note.
 */
export function VerificationNote({
  verification,
}: {
  verification: AiChatResponse["verification"];
}) {
  if (verification.status === "verified") {
    return (
      <p className="mt-2 text-xs text-dash-accent">
        ✓ Verified against your data ({verification.checksPassed}{" "}
        {verification.checksPassed === 1 ? "check" : "checks"} passed)
      </p>
    );
  }
  if (verification.status === "template") {
    return (
      <p
        role="note"
        className="mt-2 rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-xs text-dash-muted"
      >
        The AI&rsquo;s explanation didn&rsquo;t pass verification, so this
        summary was generated from your verified numbers instead.
      </p>
    );
  }
  return null;
}

export function ReasoningIndicator() {
  return (
    <p
      role="status"
      className="flex items-center gap-2 text-sm text-dash-muted"
    >
      <span className="flex gap-1" aria-hidden="true">
        <span className="size-1.5 animate-bounce rounded-full bg-dash-accent [animation-delay:0ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-dash-accent [animation-delay:150ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-dash-accent [animation-delay:300ms]" />
      </span>
      FinVerse AI is reasoning over your numbers…
    </p>
  );
}

/** One question/answer turn in the chat history. */
type ChatTurn = {
  id: number;
  prompt: string;
  response: AiChatResponse | null;
  error: string;
  cancelled: boolean;
};

/**
 * One answer: the narrative (or the raw computed metrics when the
 * narrative is unavailable), its evidence, and the disclaimer.
 */
function ResponseContent({ response }: { response: AiChatResponse }) {
  return (
    <div className="space-y-4">
      {response.fallback ? (
        <div>
          <p className="text-sm text-dash-muted">{response.fallbackReason}</p>
          {response.metrics && (
            <div className="mt-4">
              <FallbackMetrics metrics={response.metrics} />
            </div>
          )}
        </div>
      ) : (
        <div>
          {response.refused && (
            <p className="text-sm font-medium text-dash-text">
              FinVerse AI can&rsquo;t answer that one.
            </p>
          )}
          {response.answer && (
            <p className="mt-1 text-sm leading-6 text-dash-text">
              {response.answer}
            </p>
          )}
          <VerificationNote verification={response.verification} />
          {response.claims.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-medium tracking-widest text-dash-muted uppercase">
                Evidence
              </h4>
              <ul className="mt-2 space-y-2">
                {response.claims.map((claim, index) => (
                  <li
                    key={`${claim.source.tool}-${index}`}
                    className="rounded-lg border border-dash-border px-3 py-2 text-sm"
                  >
                    <p className="text-dash-text">{claim.text}</p>
                    <p className="mt-1 text-xs text-dash-muted">
                      <span className="font-medium">
                        {claimToolLabel(claim.source.tool)}
                      </span>
                      {" · "}
                      {formatClaimValues(claim.source.values)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <p className="border-t border-dash-border pt-3 text-xs text-dash-muted">
        {response.disclaimer}
        {response.model && (
          <>
            {" "}
            · Answered by <span className="font-mono">{response.model}</span>
          </>
        )}
      </p>
    </div>
  );
}

export default function AiChat() {
  const [mode, setMode] = useState<"ask" | "explain">("ask");
  const [message, setMessage] = useState("");
  const [symbol, setSymbol] = useState("");
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const nextTurnId = useRef(0);
  const questionInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let active = true;
    activityRequest<AiStatus>("/api/ai/status")
      .then((data) => {
        if (active) {
          setStatus(data);
          setStatusError(false);
        }
      })
      .catch(() => {
        // A failed check is its own state: the chat still works (the
        // backend falls back to raw metrics), but the user is told the
        // setup could not be checked instead of hearing nothing.
        if (active) setStatusError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function cancel() {
    abortController?.abort();
  }

  function finishTurn(
    turnId: number,
    patch: Partial<Pick<ChatTurn, "response" | "error" | "cancelled">>,
  ) {
    setTurns((previous) =>
      previous.map((turn) =>
        turn.id === turnId ? { ...turn, ...patch } : turn,
      ),
    );
  }

  async function ask(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;
    const controller = new AbortController();
    const turnId = nextTurnId.current;
    nextTurnId.current += 1;
    setTurns((previous) => [
      ...previous,
      {
        id: turnId,
        prompt: trimmed,
        response: null,
        error: "",
        cancelled: false,
      },
    ]);
    setMessage("");
    setAbortController(controller);
    setLoading(true);
    try {
      const data = await aiRequest<unknown>(
        "/api/ai/chat",
        { message: trimmed },
        controller.signal,
      );
      if (!isAiChatResponse(data)) {
        throw new Error(
          "The AI service returned an unexpected response. Please try again.",
        );
      }
      finishTurn(turnId, { response: data });
    } catch (caught: unknown) {
      if (controller.signal.aborted) {
        finishTurn(turnId, { cancelled: true });
      } else {
        finishTurn(turnId, { error: aiErrorMessage(caught) });
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  }

  async function explain(symbolText: string, questionText: string) {
    const trimmedSymbol = symbolText.trim();
    if (!trimmedSymbol || loading) return;
    const controller = new AbortController();
    const turnId = nextTurnId.current;
    nextTurnId.current += 1;
    const prompt = questionText.trim()
      ? `Explain ${trimmedSymbol.toUpperCase()}: ${questionText.trim()}`
      : `Explain ${trimmedSymbol.toUpperCase()}`;
    setTurns((previous) => [
      ...previous,
      {
        id: turnId,
        prompt,
        response: null,
        error: "",
        cancelled: false,
      },
    ]);
    setQuestion("");
    setAbortController(controller);
    setLoading(true);
    try {
      const data = await aiRequest<unknown>(
        "/api/ai/explain-stock",
        {
          symbol: trimmedSymbol,
          question: questionText.trim() || undefined,
        },
        controller.signal,
      );
      if (!isAiChatResponse(data)) {
        throw new Error(
          "The AI service returned an unexpected response. Please try again.",
        );
      }
      finishTurn(turnId, { response: data });
    } catch (caught: unknown) {
      if (controller.signal.aborted) {
        finishTurn(turnId, { cancelled: true });
      } else {
        finishTurn(turnId, { error: aiErrorMessage(caught) });
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  }

  const canAsk = message.trim().length > 0 && !loading;
  const canExplain = symbol.trim().length > 0 && !loading;

  return (
    <section
      className="dash-panel overflow-hidden"
      aria-label="Ask FinVerse AI"
      aria-busy={loading}
    >
      <div className="p-5">
        <PanelHeading icon="bulb" title="Ask FinVerse AI">
          <div
            className="surface-inset flex gap-1 rounded-full border p-1"
            role="group"
            aria-label="AI mode"
          >
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                mode === "ask"
                  ? "bg-dash-accent text-dash-bg"
                  : "text-dash-muted"
              }`}
              aria-pressed={mode === "ask"}
              onClick={() => setMode("ask")}
            >
              Ask about money
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                mode === "explain"
                  ? "bg-dash-accent text-dash-bg"
                  : "text-dash-muted"
              }`}
              aria-pressed={mode === "explain"}
              onClick={() => setMode("explain")}
            >
              Explain a stock
            </button>
          </div>
        </PanelHeading>

        {statusError && (
          <p
            role="note"
            className="mt-4 rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-muted"
          >
            Couldn&rsquo;t check whether AI is set up — the status check itself
            failed. Answers may still show your numbers without the narrative;
            try asking and see.
          </p>
        )}

        {status !== null && !status.configured && (
          <p
            role="note"
            className="mt-4 rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-muted"
          >
            AI explanations aren&rsquo;t set up yet, so answers show your
            numbers without the narrative for now.
          </p>
        )}

        {mode === "ask" ? (
          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(message);
            }}
          >
            <label
              htmlFor="ai-question"
              className="text-sm font-medium text-dash-text"
            >
              What would you like to understand?
            </label>
            <textarea
              id="ai-question"
              ref={questionInputRef}
              className="dash-input mt-2 min-h-20 w-full resize-y"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Why did I overspend on food this month?"
              maxLength={2000}
              rows={2}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="rounded-full border border-dash-border px-3 py-1 text-xs text-dash-muted hover:text-dash-text"
                  disabled={loading}
                  onClick={() => {
                    // Fill only — the user edits the suggestion, then
                    // submits it themselves. Nothing fires on click.
                    setMessage(suggestion);
                    questionInputRef.current?.focus();
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="dash-small-button mt-3"
              disabled={!canAsk}
            >
              {loading ? "Asking…" : "Ask FinVerse AI"}
            </button>
          </form>
        ) : (
          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              void explain(symbol, question);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ai-symbol"
                  className="text-sm font-medium text-dash-text"
                >
                  Stock symbol
                </label>
                <input
                  id="ai-symbol"
                  className="dash-input mt-2 w-full uppercase"
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  placeholder="RELIANCE"
                  maxLength={20}
                  autoComplete="off"
                />
              </div>
              <div>
                <label
                  htmlFor="ai-stock-question"
                  className="text-sm font-medium text-dash-text"
                >
                  Your question (optional)
                </label>
                <input
                  id="ai-stock-question"
                  className="dash-input mt-2 w-full"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Why is it down this month?"
                  maxLength={500}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-dash-muted">
              NSE stocks work without a suffix (RELIANCE). Explanations come
              from computed figures only — never predictions or buy/sell advice.
            </p>
            <button
              type="submit"
              className="dash-small-button mt-3"
              disabled={!canExplain}
            >
              {loading ? "Explaining…" : "Explain this stock"}
            </button>
          </form>
        )}

        <div className="mt-5" aria-live="polite">
          {turns.length > 0 && (
            <div
              aria-label="Chat history"
              className="max-h-96 space-y-5 overflow-y-auto pr-1"
            >
              {turns.map((turn) => (
                <article
                  key={turn.id}
                  className="space-y-2 border-t border-dash-border pt-4 first:border-t-0 first:pt-0"
                >
                  <p className="text-sm font-medium text-dash-text">
                    {turn.prompt}
                  </p>
                  {turn.cancelled && (
                    <p className="text-sm text-dash-muted">
                      Request cancelled.
                    </p>
                  )}
                  {turn.error && (
                    <p role="alert" className="text-sm text-dash-red">
                      {turn.error}
                    </p>
                  )}
                  {turn.response && (
                    <ResponseContent response={turn.response} />
                  )}
                </article>
              ))}
            </div>
          )}
          {loading && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ReasoningIndicator />
              <button
                type="button"
                className="dash-small-button"
                onClick={cancel}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
