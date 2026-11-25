"use client";

import { useEffect, useRef, useState } from "react";
import { StockTable } from "./market-board";
import { aiRequest } from "../../(module-one)/dashboard/ai-chat";
import {
  activityError,
  ActivityApiError,
} from "../../(module-one)/dashboard/use-activity";
import { PanelHeading } from "../../(module-one)/dashboard/ui";
import { formatFetchedAt } from "../../../lib/market";
import {
  claimToolLabel,
  formatClaimValues,
  isAiChatResponse,
  type AiChatResponse,
} from "../../../lib/ai";
import {
  buildScreenFilters,
  EMPTY_SCREENER_FORM,
  filterSnapshot,
  isScreenResponse,
  TREND_OPTIONS,
  type ScreenResponse,
  type ScreenerFormState,
} from "../../../lib/rag";

/**
 * Smart Stock Screener (Phase 2): deterministic filters over the Phase 0
 * market layer, plus an "Ask in words" mode where the LLM translates a
 * plain-English criterion into those same filters and summarises the
 * screened results. The screen itself is always computed, never guessed:
 * a stock with a missing metric cannot pass a filter that constrains it.
 */

const NUMBER_FIELDS: Array<{
  key: Exclude<keyof ScreenerFormState, "trend" | "sector">;
  label: string;
}> = [
  { key: "minPrice", label: "Min price (₹)" },
  { key: "maxPrice", label: "Max price (₹)" },
  {
    key: "minMarketCapCr",
    label: "Min market cap (₹ crore)",
  },
  {
    key: "maxMarketCapCr",
    label: "Max market cap (₹ crore)",
  },
  { key: "minRsi", label: "Min RSI (0–100)" },
  { key: "maxRsi", label: "Max RSI (0–100)" },
  { key: "minPe", label: "Min P/E" },
  { key: "maxPe", label: "Max P/E" },
  {
    key: "minChange1mo",
    label: "Min 1-month change (%)",
  },
  {
    key: "maxChange1mo",
    label: "Max 1-month change (%)",
  },
];

const advancedFields = new Set([
  "minPe",
  "maxMarketCapCr",
  "minChange1mo",
  "maxChange1mo",
]);

const NL_SUGGESTIONS = [
  "Overbought stocks",
  "Large caps that fell this month",
  "Stocks above their 50-day average",
];

function ScreenTable({ screen }: { screen: ScreenResponse }) {
  return (
    <div>
      <p className="text-sm text-dash-muted">
        {screen.matches.length} of {screen.universe.length} stocks matched ·
        checked {formatFetchedAt(screen.evaluatedAt)}
      </p>
      {screen.matches.length === 0 ? (
        <p className="mt-4 text-sm text-dash-muted">
          {screen.unavailable.length === screen.universe.length &&
          screen.universe.length > 0
            ? "Stock quotes are unavailable for this screen."
            : "No stocks match these rules. Adjust a filter to broaden the results."}
        </p>
      ) : (
        <StockTable stocks={screen.matches} screening />
      )}
      {screen.unavailable.length > 0 && (
        <p className="mt-4 text-xs text-dash-muted">
          Quotes unavailable for {screen.unavailable.join(", ")}.
        </p>
      )}
    </div>
  );
}

function screenErrorMessage(error: unknown): string {
  if (error instanceof ActivityApiError && error.status === 429) {
    return "You are asking too quickly. Please wait a moment and try again.";
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "The screen took too long. Please try again.";
  }
  return activityError(error);
}

export function ScreenerSection({
  snapshot,
  snapshotError,
  onRetry,
}: {
  snapshot: ScreenResponse | null;
  snapshotError: string;
  onRetry: () => void;
}) {
  const [mode, setMode] = useState<"filters" | "nl">("filters");
  const [form, setForm] = useState<ScreenerFormState>(EMPTY_SCREENER_FORM);
  const [query, setQuery] = useState("");
  const [screen, setScreen] = useState<ScreenResponse | null>(null);
  const [aiResponse, setAiResponse] = useState<AiChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // The last results from valid bounds, kept on screen while the user is
  // mid-edit on invalid bounds instead of hiding everything.
  const [lastValidManual, setLastValidManual] = useState<ScreenResponse | null>(
    null,
  );
  const lastValidKey = useRef("");

  function setField(key: keyof ScreenerFormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function numericField(field: (typeof NUMBER_FIELDS)[number]) {
    return (
      <label key={field.key}>
        {field.label}
        <input
          className="dash-input"
          value={form[field.key]}
          type="number"
          step="any"
          onChange={(event) => setField(field.key, event.target.value)}
          placeholder="Any"
        />
      </label>
    );
  }

  const filters = buildScreenFilters(form);
  const manual = snapshot ? filterSnapshot(snapshot, filters) : null;
  const sectors = [
    ...new Set(
      snapshot?.matches.flatMap((stock) =>
        stock.sector ? [stock.sector] : [],
      ) ?? [],
    ),
  ].sort();
  const invalid =
    [
      [filters.minPrice, filters.maxPrice],
      [filters.minMarketCapCr, filters.maxMarketCapCr],
      [filters.minRsi, filters.maxRsi],
      [filters.minPe, filters.maxPe],
      [filters.minChange1mo, filters.maxChange1mo],
    ].some(
      ([min, max]) => min !== undefined && max !== undefined && min > max,
    ) ||
    [filters.minRsi, filters.maxRsi].some(
      (value) => value !== undefined && (value < 0 || value > 100),
    ) ||
    [
      filters.minPrice,
      filters.maxPrice,
      filters.minMarketCapCr,
      filters.maxMarketCapCr,
      filters.minPe,
      filters.maxPe,
    ].some((value) => value !== undefined && value < 0) ||
    [filters.minChange1mo, filters.maxChange1mo].some(
      (value) => value !== undefined && (value < -100 || value > 1000),
    ) ||
    (filters.limit !== undefined &&
      (!Number.isInteger(filters.limit) ||
        filters.limit < 1 ||
        filters.limit > 50));
  useEffect(() => {
    if (invalid || !manual) return;
    // `manual` is a fresh object every render, so only store it when the
    // matched symbols actually change — otherwise this would set state
    // on every render.
    const key = manual.matches.map((stock) => stock.symbol).join(",");
    if (key !== lastValidKey.current) {
      lastValidKey.current = key;
      setLastValidManual(manual);
    }
  }, [invalid, manual]);
  function reset() {
    setForm(EMPTY_SCREENER_FORM);
    setQuery("");
    setScreen(null);
    setAiResponse(null);
    setLastValidManual(null);
    lastValidKey.current = "";
    setError("");
  }

  async function runQuery(queryText: string) {
    const trimmed = queryText.trim();
    if (!trimmed || loading) return;
    setError("");
    setScreen(null);
    setAiResponse(null);
    setLoading(true);
    try {
      const data = await aiRequest<unknown>("/api/ai/screen", {
        query: trimmed,
      });
      if (!isAiChatResponse(data)) {
        throw new Error(
          "The AI service returned an unexpected response. Please try again.",
        );
      }
      setAiResponse(data);
      const screened =
        data.metrics !== null &&
        typeof data.metrics === "object" &&
        "screen" in data.metrics
          ? data.metrics.screen
          : null;
      if (isScreenResponse(screened)) setScreen(screened);
    } catch (caught: unknown) {
      setError(screenErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  const note =
    aiResponse?.metrics !== null &&
    typeof aiResponse?.metrics === "object" &&
    typeof (aiResponse.metrics as Record<string, unknown>).note === "string"
      ? ((aiResponse.metrics as Record<string, unknown>).note as string)
      : null;

  return (
    <section
      id="screener"
      aria-label="Smart stock screener"
      aria-busy={loading}
      className="dash-panel scroll-mt-24"
    >
      <PanelHeading icon="filter" title="Screening rules">
        <div
          className="surface-inset flex gap-1 rounded-full border p-1"
          role="group"
          aria-label="Screener mode"
        >
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              mode === "filters"
                ? "bg-dash-accent text-dash-bg"
                : "text-dash-muted"
            }`}
            aria-pressed={mode === "filters"}
            onClick={() => setMode("filters")}
          >
            Filters
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              mode === "nl" ? "bg-dash-accent text-dash-bg" : "text-dash-muted"
            }`}
            aria-pressed={mode === "nl"}
            onClick={() => setMode("nl")}
          >
            Ask in words
          </button>
        </div>
      </PanelHeading>
      <p className="mt-3 text-sm leading-6 text-dash-muted">
        Screen active Indian equities plus the symbols in your portfolio and
        watchlist.
      </p>

      {mode === "filters" ? (
        <div className="mt-4">
          <div className="screen-fields">
            {NUMBER_FIELDS.filter(
              (field) => !advancedFields.has(field.key),
            ).map(numericField)}
            <label>
              Sector
              <select
                className="dash-input"
                value={form.sector}
                onChange={(event) => setField("sector", event.target.value)}
              >
                <option value="">All sectors</option>
                {sectors.map((sector) => (
                  <option key={sector}>{sector}</option>
                ))}
              </select>
            </label>
            <label>
              Moving-average trend
              <select
                className="dash-input"
                value={form.trend}
                onChange={(event) => setField("trend", event.target.value)}
              >
                <option value="">Any trend</option>
                {TREND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <details className="advanced-screen mt-4">
            <summary>Additional rules</summary>
            <div className="screen-fields mt-4">
              {NUMBER_FIELDS.filter((field) =>
                advancedFields.has(field.key),
              ).map(numericField)}
              <label>
                Maximum results
                <input
                  className="dash-input"
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  placeholder="All"
                  value={form.limit}
                  onChange={(event) => setField("limit", event.target.value)}
                />
              </label>
            </div>
          </details>
          {invalid && (
            <p className="market-negative mt-3" role="alert">
              Check your bounds. RSI ranges from 0 to 100 and result limits from
              1 to 50. Minimums must be at or below maximums.
            </p>
          )}
          <button
            type="button"
            className="dash-small-button mt-4"
            onClick={reset}
            disabled={loading}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            void runQuery(query);
          }}
        >
          <label
            htmlFor="screen-query"
            className="text-sm font-medium text-dash-text"
          >
            Describe the stocks you want
          </label>
          <input
            id="screen-query"
            className="dash-input mt-2 w-full"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Overbought stocks"
            maxLength={500}
            autoComplete="off"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {NL_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="rounded-full border border-dash-border px-3 py-1 text-xs text-dash-muted hover:text-dash-text"
                disabled={loading}
                onClick={() => {
                  setQuery(suggestion);
                  void runQuery(suggestion);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-dash-muted">
            The AI turns your words into exact filters, the screen runs on
            computed figures, and the summary explains the results. If your
            words can&rsquo;t be turned into exact filters, the whole universe
            is shown instead — and it says so.
          </p>
          <button
            type="submit"
            className="dash-small-button mt-3"
            disabled={query.trim().length === 0 || loading}
          >
            {loading ? "Screening…" : "Screen with AI"}
          </button>
        </form>
      )}

      <div className="screen-results" aria-live="polite">
        <h3>Results</h3>
        {loading && mode === "nl" && (
          <p role="status" className="text-sm text-dash-muted">
            Screening stocks…
          </p>
        )}
        {mode === "nl" && error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        {mode === "nl" && aiResponse && !loading && (
          <div className="mb-5 space-y-4">
            {note && (
              <p
                role="note"
                className="rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-muted"
              >
                {note}
              </p>
            )}
            {aiResponse.fallback ? (
              <p className="text-sm text-dash-muted">
                {aiResponse.fallbackReason}
              </p>
            ) : (
              <div>
                {aiResponse.answer && (
                  <p className="text-sm leading-6 text-dash-text">
                    {aiResponse.answer}
                  </p>
                )}
                {aiResponse.claims.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-medium tracking-widest text-dash-muted uppercase">
                      Evidence
                    </h4>
                    <ul className="mt-2 space-y-2">
                      {aiResponse.claims.map((claim, index) => (
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
              {aiResponse.disclaimer}
              {aiResponse.model && (
                <>
                  {" "}
                  · Answered by{" "}
                  <span className="font-mono">{aiResponse.model}</span>
                </>
              )}
            </p>
          </div>
        )}
        {mode === "nl" && screen && !loading && <ScreenTable screen={screen} />}
        {mode === "filters" &&
          !invalid &&
          (manual ? (
            <ScreenTable screen={manual} />
          ) : (
            !snapshotError && (
              <p role="status" className="desk-muted">
                Loading the stock universe…
              </p>
            )
          ))}
        {mode === "filters" && invalid && lastValidManual && (
          <>
            <p role="note" className="text-sm text-dash-muted">
              Showing your previous results — the bounds above are invalid, so
              these are from the last valid filters.
            </p>
            <ScreenTable screen={lastValidManual} />
          </>
        )}
        {mode === "filters" && snapshotError && (
          <p role="alert" className="desk-muted">
            {snapshotError}{" "}
            <button className="desk-link" onClick={onRetry}>
              Retry
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
