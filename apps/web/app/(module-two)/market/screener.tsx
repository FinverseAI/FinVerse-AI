"use client";

import { useState } from "react";
import Link from "next/link";
import { aiRequest } from "../../(module-one)/dashboard/ai-chat";
import {
  activityError,
  ActivityApiError,
} from "../../(module-one)/dashboard/use-activity";
import { PanelHeading } from "../../(module-one)/dashboard/ui";
import {
  formatFetchedAt,
  formatPercent,
  formatPrice,
} from "../../../lib/market";
import {
  claimToolLabel,
  formatClaimValues,
  isAiChatResponse,
  type AiChatResponse,
} from "../../../lib/ai";
import {
  buildScreenFilters,
  EMPTY_SCREENER_FORM,
  formatMarketCapCrore,
  isScreenResponse,
  TREND_OPTIONS,
  type ScreenedStock,
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
  placeholder: string;
}> = [
  { key: "minPrice", label: "Min price (₹)", placeholder: "e.g. 500" },
  { key: "maxPrice", label: "Max price (₹)", placeholder: "e.g. 5,000" },
  {
    key: "minMarketCapCrore",
    label: "Min market cap (₹ crore)",
    placeholder: "e.g. 100,000",
  },
  {
    key: "maxMarketCapCrore",
    label: "Max market cap (₹ crore)",
    placeholder: "e.g. 10,00,000",
  },
  { key: "minRsi", label: "Min RSI (0–100)", placeholder: "e.g. 30" },
  { key: "maxRsi", label: "Max RSI (0–100)", placeholder: "e.g. 70" },
  { key: "minPe", label: "Min P/E", placeholder: "e.g. 10" },
  { key: "maxPe", label: "Max P/E", placeholder: "e.g. 30" },
  {
    key: "minChange1mo",
    label: "Min 1-month change (%)",
    placeholder: "e.g. 0",
  },
  {
    key: "maxChange1mo",
    label: "Max 1-month change (%)",
    placeholder: "e.g. 20",
  },
];

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
        evaluated {formatFetchedAt(screen.evaluatedAt)}
      </p>
      {screen.matches.length === 0 ? (
        <p className="mt-4 text-sm text-dash-muted">
          No stocks matched these filters. Loosen a bound or two and try again.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-dash-border text-left text-xs text-dash-muted">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Stock
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Price
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  RSI
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  P/E
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  1-month
                </th>
                <th scope="col" className="py-2 font-medium">
                  Market cap
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {screen.matches.map((stock: ScreenedStock) => (
                <tr key={stock.symbol}>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/market/stock/${encodeURIComponent(stock.symbol)}`}
                      className="font-medium text-dash-text hover:text-dash-accent"
                    >
                      {stock.name}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-dash-muted">
                      {stock.symbol}
                      {stock.sector ? ` · ${stock.sector}` : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-4 font-mono">
                    {stock.price !== null
                      ? formatPrice(stock.price, "INR")
                      : "—"}
                    {stock.stale && stock.price !== null && (
                      <span className="block font-sans text-xs text-dash-warning">
                        last known
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 font-mono">
                    {stock.rsi14 !== null ? stock.rsi14.toFixed(1) : "—"}
                  </td>
                  <td className="py-3 pr-4 font-mono">
                    {stock.trailingPE !== null
                      ? stock.trailingPE.toFixed(2)
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 font-mono">
                    {stock.change1moPercent !== null
                      ? formatPercent(stock.change1moPercent)
                      : "—"}
                  </td>
                  <td className="py-3 font-mono">
                    {formatMarketCapCrore(stock.marketCap)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {screen.unavailable.length > 0 && (
        <p className="mt-4 text-xs text-dash-muted">
          Could not fetch data for {screen.unavailable.join(", ")} — those
          stocks were left out of the screen rather than guessed.
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

export function ScreenerSection() {
  const [mode, setMode] = useState<"filters" | "nl">("filters");
  const [form, setForm] = useState<ScreenerFormState>(EMPTY_SCREENER_FORM);
  const [query, setQuery] = useState("");
  const [screen, setScreen] = useState<ScreenResponse | null>(null);
  const [aiResponse, setAiResponse] = useState<AiChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setField(key: keyof ScreenerFormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function runFilters() {
    if (loading) return;
    setError("");
    setScreen(null);
    setAiResponse(null);
    setLoading(true);
    try {
      const data = await aiRequest<unknown>(
        "/api/rag/screen",
        buildScreenFilters(form),
      );
      if (!isScreenResponse(data)) {
        throw new Error(
          "The screener returned an unexpected response. Please try again.",
        );
      }
      setScreen(data);
    } catch (caught: unknown) {
      setError(screenErrorMessage(caught));
    } finally {
      setLoading(false);
    }
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
      <PanelHeading icon="filter" title="Smart stock screener">
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
        Screen your holdings, your watchlist and 15 large NIFTY names by price,
        market cap, RSI, P/E, momentum and trend. Every filter is computed from
        stored prices — a stock with a missing number never passes a filter that
        constrains it.
      </p>

      {mode === "filters" ? (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            void runFilters();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NUMBER_FIELDS.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`screen-${field.key}`}
                  className="text-sm font-medium text-dash-text"
                >
                  {field.label}
                </label>
                <input
                  id={`screen-${field.key}`}
                  className="dash-input mt-1.5 w-full"
                  value={form[field.key]}
                  onChange={(event) => setField(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  inputMode="decimal"
                  autoComplete="off"
                />
              </div>
            ))}
            <div>
              <label
                htmlFor="screen-trend"
                className="text-sm font-medium text-dash-text"
              >
                Trend
              </label>
              <select
                id="screen-trend"
                className="dash-input mt-1.5 w-full"
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
            </div>
            <div>
              <label
                htmlFor="screen-sector"
                className="text-sm font-medium text-dash-text"
              >
                Sector
              </label>
              <input
                id="screen-sector"
                className="dash-input mt-1.5 w-full"
                value={form.sector}
                onChange={(event) => setField("sector", event.target.value)}
                placeholder="e.g. Energy"
                autoComplete="off"
              />
            </div>
            <div>
              <label
                htmlFor="screen-limit"
                className="text-sm font-medium text-dash-text"
              >
                Max results
              </label>
              <input
                id="screen-limit"
                className="dash-input mt-1.5 w-full"
                value={form.limit}
                onChange={(event) => setField("limit", event.target.value)}
                placeholder="10"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-dash-muted">
            Leave everything blank to list the whole universe. A bound outside
            its range (RSI above 100, a negative price) is rejected, not
            silently clamped.
          </p>
          <button
            type="submit"
            className="dash-small-button mt-3"
            disabled={loading}
          >
            {loading ? "Screening…" : "Run screen"}
          </button>
        </form>
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

      <div className="mt-5" aria-live="polite">
        {loading && (
          <p role="status" className="text-sm text-dash-muted">
            Screening stocks…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        {aiResponse && !loading && (
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
        {screen && !loading && <ScreenTable screen={screen} />}
      </div>
    </section>
  );
}
