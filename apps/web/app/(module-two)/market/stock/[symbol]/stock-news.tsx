"use client";

import { AnalysisText } from "../../../../../components/analysis-text";
import { useEffect, useState } from "react";
import { aiRequest } from "../../../../(module-one)/dashboard/ai-chat";
import {
  activityError,
  activityRequest,
  ActivityApiError,
} from "../../../../(module-one)/dashboard/use-activity";
import { PanelHeading } from "../../../../(module-one)/dashboard/ui";
import {
  claimToolLabel,
  formatClaimValues,
  isAiChatResponse,
  type AiChatResponse,
} from "../../../../../lib/ai";
import {
  formatNewsDate,
  formatSentimentSummary,
  isNewsResponse,
  sentimentTextClass,
  type NewsResponse,
} from "../../../../../lib/rag";

/**
 * News & Sentiment (Phase 2): recent Yahoo Finance articles for the
 * symbol with a deterministic sentiment score per article, plus a
 * RAG-grounded explanation that cites the articles it draws on. When no
 * relevant article was retrieved, the explanation says so instead of
 * answering from memory.
 */

function newsErrorMessage(error: unknown): string {
  if (error instanceof ActivityApiError && error.status === 429) {
    return "You are asking too quickly. Please wait a moment and try again.";
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "FinVerse AI took too long to answer. Please try again.";
  }
  return activityError(error);
}

export function StockNewsSection({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState<AiChatResponse | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState("");

  const encodedSymbol = encodeURIComponent(symbol);

  useEffect(() => {
    let active = true;
    activityRequest<unknown>(`/api/rag/news/${encodedSymbol}`)
      .then((data) => {
        if (!isNewsResponse(data)) {
          throw new Error(
            "The news service returned an unexpected response. Please try again.",
          );
        }
        if (active) {
          setNews(data);
          setError("");
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(activityError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [encodedSymbol, revision]);

  function retry() {
    setLoading(true);
    setError("");
    setRevision((current) => current + 1);
  }

  async function explain() {
    if (explaining) return;
    setExplainError("");
    setExplanation(null);
    setExplaining(true);
    try {
      const data = await aiRequest<unknown>("/api/ai/explain-news", {
        symbol,
        question: question.trim() || undefined,
      });
      if (!isAiChatResponse(data)) {
        throw new Error(
          "The AI service returned an unexpected response. Please try again.",
        );
      }
      setExplanation(data);
    } catch (caught: unknown) {
      setExplainError(newsErrorMessage(caught));
    } finally {
      setExplaining(false);
    }
  }

  return (
    <section
      id="stock-news"
      aria-label="News and sentiment"
      className="dash-panel"
    >
      <PanelHeading icon="file" title="News & sentiment" />
      {loading ? (
        <p role="status" className="mt-4 text-sm text-dash-muted">
          Loading news…
        </p>
      ) : error ? (
        <div className="mt-4">
          <p role="alert" className="text-sm text-dash-red">
            {error}
          </p>
          <button className="dash-small-button mt-4" onClick={retry}>
            Try again
          </button>
        </div>
      ) : news ? (
        <div className="mt-4">
          {!news.available && news.reason && (
            <p
              role="note"
              className="rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-muted"
            >
              {news.reason}
            </p>
          )}
          {news.articles.length > 0 && (
            <p className="text-sm text-dash-text">
              Overall sentiment:{" "}
              <span
                className={`font-medium ${sentimentTextClass(news.overall.label)}`}
              >
                {formatSentimentSummary(news.overall)}
              </span>
            </p>
          )}
          {news.articles.length === 0 ? (
            <p className="mt-2 text-sm text-dash-muted">
              No recent news found for {symbol}. News is refreshed every six
              hours; check back later.
            </p>
          ) : (
            <ul className="market-news-list">
              {news.articles.map((article) => (
                <li key={article.url} className="py-3">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-dash-text hover:text-dash-accent"
                  >
                    {article.title}
                  </a>
                  <p className="mt-1 text-xs text-dash-muted">
                    {article.publisher} · {formatNewsDate(article.publishedAt)}{" "}
                    ·{" "}
                    <span
                      className={`font-medium ${sentimentTextClass(article.sentiment.label)}`}
                    >
                      {article.sentiment.label}
                    </span>
                    {article.sentiment.score !== 0 &&
                      ` (${article.sentiment.score > 0 ? "+" : ""}${article.sentiment.score.toFixed(2)})`}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-dash-muted">
            Sentiment is scored from the headline wording against a fixed word
            list — it describes tone, not a buy or sell instruction. Articles
            come from Yahoo Finance.
          </p>

          <form
            className="mt-5 border-t border-dash-border pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              void explain();
            }}
          >
            <label
              htmlFor="news-question"
              className="text-sm font-medium text-dash-text"
            >
              Ask about this news (optional)
            </label>
            <input
              id="news-question"
              className="dash-input mt-2 w-full"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Why did the price move after this news?"
              maxLength={500}
            />
            <button
              type="submit"
              className="dash-small-button mt-3"
              disabled={explaining}
            >
              {explaining ? "Explaining…" : "Explain this news"}
            </button>
          </form>

          <div className="mt-4" aria-live="polite">
            {explaining && (
              <p role="status" className="text-sm text-dash-muted">
                Reading the articles…
              </p>
            )}
            {explainError && (
              <p role="alert" className="text-sm text-red-500">
                {explainError}
              </p>
            )}
            {explanation && !explaining && (
              <div className="space-y-4">
                {explanation.fallback ? (
                  <div>
                    <p className="text-sm text-dash-muted">
                      {explanation.fallbackReason}
                    </p>
                    <p className="mt-2 text-sm text-dash-muted">
                      The article list above is the raw news for {symbol}.
                    </p>
                  </div>
                ) : (
                  <div>
                    {explanation.refused && (
                      <p className="text-sm font-medium text-dash-text">
                        FinVerse AI can&rsquo;t explain this one from the news.
                      </p>
                    )}
                    {explanation.answer && (
                      <AnalysisText text={explanation.answer} />
                    )}
                    {explanation.claims.length > 0 && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium">
                          View supporting sources ({explanation.claims.length})
                        </summary>
                        <h4 className="text-xs font-medium tracking-widest text-dash-muted uppercase">
                          Sources
                        </h4>
                        <ul className="mt-2 space-y-2">
                          {explanation.claims.map((claim, index) => (
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
                      </details>
                    )}
                  </div>
                )}
                <p className="border-t border-dash-border pt-3 text-xs text-dash-muted">
                  {explanation.disclaimer}
                  {explanation.model && (
                    <>
                      {" "}
                      · Answered by{" "}
                      <span className="font-mono">{explanation.model}</span>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
