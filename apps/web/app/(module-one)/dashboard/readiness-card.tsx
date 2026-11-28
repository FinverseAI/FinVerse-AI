"use client";

import { useEffect, useState } from "react";
import { PanelHeading, ProgressBar } from "./ui";
import type { Tone } from "./data";
import { activityError, activityRequest } from "./use-activity";
import {
  aiErrorMessage,
  aiRequest,
  ReasoningIndicator,
  VerificationNote,
} from "./ai-chat";
import {
  claimToolLabel,
  formatClaimValues,
  isAiChatResponse,
  type AiChatResponse,
  type AiStatus,
} from "../../../lib/ai";
import {
  isReadinessResult,
  type ReadinessAssessment,
  type ReadinessResult,
} from "../../../lib/readiness";

/**
 * Investment readiness (Phase 4): the deterministic 0–100 score from
 * both modules, with its factor breakdown and what would move it.
 * The score is computed by the backend in code — never by the model.
 * "Explain my score" asks the reasoning model to explain WHY the
 * score is what it is, through the Phase 3 guardrail, and shows the
 * same verification badge as the Ask FinVerse AI chat.
 */

const BAND_TONES: Record<ReadinessAssessment["band"], Tone> = {
  Ready: "accent",
  Building: "warning",
  "Not ready": "red",
};

const BAND_TEXT: Record<ReadinessAssessment["band"], string> = {
  Ready: "Your foundations and portfolio both look sound.",
  Building: "On the way — the suggestions below say what moves it.",
  "Not ready": "Fix the cash-flow foundations before investing.",
};

export default function ReadinessCard() {
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [explanation, setExplanation] = useState<AiChatResponse | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState("");
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [aiStatusError, setAiStatusError] = useState(false);
  const [explainController, setExplainController] =
    useState<AbortController | null>(null);
  const [explainCancelled, setExplainCancelled] = useState(false);

  useEffect(() => {
    let active = true;
    activityRequest<unknown>("/api/readiness")
      .then((data) => {
        if (!active) return;
        if (!isReadinessResult(data)) {
          throw new Error(
            "The readiness service returned an unexpected response. Please try again.",
          );
        }
        setResult(data);
        setError("");
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
  }, [revision]);

  useEffect(() => {
    let active = true;
    activityRequest<AiStatus>("/api/ai/status")
      .then((data) => {
        if (active) {
          setAiStatus(data);
          setAiStatusError(false);
        }
      })
      .catch(() => {
        // A failed check is its own state: explain still runs (the
        // backend falls back to raw metrics), but the user is told the
        // setup could not be checked instead of hearing nothing.
        if (active) setAiStatusError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function retry() {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }

  async function explain() {
    if (explaining) return;
    // Check status first, as the chat does: when AI is known to be
    // unconfigured, no narrative can come back — and unlike the chat,
    // the numbers here are already on screen, so there is nothing to
    // fall back to. Say so at once instead of a 150s wait. When the
    // status is unknown (still loading, or the check itself failed),
    // run anyway and let the backend fallback handle it.
    if (aiStatus !== null && !aiStatus.configured) {
      setExplainError(
        "AI explanations aren't set up yet, so there's no narrative to generate — the score, factor breakdown, and suggestions above already show your numbers.",
      );
      return;
    }
    const controller = new AbortController();
    setExplainError("");
    setExplainCancelled(false);
    setExplanation(null);
    setExplainController(controller);
    setExplaining(true);
    try {
      const data = await aiRequest<unknown>(
        "/api/ai/explain-readiness",
        {},
        controller.signal,
      );
      if (!isAiChatResponse(data)) {
        throw new Error(
          "The AI service returned an unexpected response. Please try again.",
        );
      }
      setExplanation(data);
    } catch (caught: unknown) {
      if (controller.signal.aborted) {
        setExplainCancelled(true);
      } else {
        setExplainError(aiErrorMessage(caught));
      }
    } finally {
      setExplaining(false);
      setExplainController(null);
    }
  }

  function cancelExplain() {
    explainController?.abort();
  }

  const assessment =
    result && result.available ? (result as ReadinessAssessment) : null;
  const missingFactors = assessment
    ? assessment.factors.filter((factor) => !factor.available)
    : [];
  const healthMetrics = [
    "emergencyFundMonths",
    "debtToIncomeRatio",
    "surplusRatePercent",
  ];
  const healthFactors =
    assessment?.factors.filter((factor) =>
      healthMetrics.includes(factor.metric),
    ) ?? [];
  const healthMax = healthFactors.reduce(
    (sum, factor) => sum + (factor.available ? factor.maxPoints : 0),
    0,
  );
  const healthScore = healthMax
    ? Math.round(
        (100 *
          healthFactors.reduce(
            (sum, factor) => sum + (factor.available ? factor.points : 0),
            0,
          )) /
          healthMax,
      )
    : null;

  return (
    <section
      className="dash-panel overflow-hidden"
      aria-label="Investment readiness"
      aria-busy={loading || explaining}
    >
      <div className="p-5">
        <PanelHeading icon="target" title="Investment readiness" />
        <div className="mt-4" aria-live="polite">
          {loading && (
            <p role="status" className="text-sm text-dash-muted">
              Loading your readiness score…
            </p>
          )}
          {error && (
            <div>
              <p role="alert" className="text-sm text-dash-red">
                {error}
              </p>
              <button
                type="button"
                className="dash-small-button mt-3"
                onClick={retry}
              >
                Retry
              </button>
            </div>
          )}
          {result && !result.available && (
            <div>
              <p className="text-sm text-dash-text">{result.reason}</p>
              {result.missing.length > 0 && (
                <p className="mt-2 text-sm text-dash-muted">
                  Missing: {result.missing.join(", ")}.
                </p>
              )}
            </div>
          )}
          {assessment && (
            <div className="space-y-5">
              <div className="surface-inset flex flex-wrap items-center justify-between gap-2 border p-3">
                <div>
                  <h3 className="text-xs font-medium tracking-widest uppercase">
                    Financial health score
                  </h3>
                  <p className="mt-1 text-xs text-dash-muted">
                    Emergency savings, debt, and monthly surplus ·{" "}
                    {healthFactors.filter((factor) => factor.available).length}{" "}
                    of 3 measured
                  </p>
                </div>
                <strong className="text-xl">
                  {healthScore === null
                    ? "Unavailable"
                    : `${healthScore} / 100`}
                </strong>
              </div>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-4xl font-semibold text-dash-text">
                    {assessment.score}
                  </span>
                  <span className="text-sm text-dash-muted">
                    out of {assessment.scale}
                  </span>
                  <span className="rounded-full border border-dash-border px-2 py-0.5 text-xs font-medium text-dash-text">
                    {assessment.band}
                  </span>
                </div>
                <p className="mt-1 text-sm text-dash-muted">
                  {BAND_TEXT[assessment.band]}
                </p>
                <div className="mt-3">
                  <ProgressBar
                    value={assessment.score}
                    label="Investment readiness score"
                    tone={BAND_TONES[assessment.band]}
                  />
                </div>
                {assessment.maxScore < assessment.scale && (
                  <p className="mt-2 text-xs text-dash-muted">
                    Based on {assessment.maxScore} of {assessment.scale} points
                    — {missingFactors.map((factor) => factor.name).join(", ")}{" "}
                    could not be measured.
                  </p>
                )}
                {assessment.stale && (
                  <p className="mt-2 text-xs text-dash-muted">
                    The prices behind this score are slightly out of date.
                  </p>
                )}
              </div>

              <details className="surface-inset border p-3">
                <summary className="text-xs font-medium tracking-widest text-dash-muted uppercase">
                  Factor breakdown
                </summary>
                <ul className="mt-3 space-y-4">
                  {assessment.factors.map((factor) => (
                    <li key={factor.name}>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                        <span className="font-medium text-dash-text">
                          {factor.name}
                        </span>
                        <span className="text-dash-muted">
                          {factor.available
                            ? `${factor.points} of ${factor.maxPoints} points`
                            : "Not measured"}
                        </span>
                      </div>
                      {factor.available && (
                        <ProgressBar
                          value={(factor.points / factor.maxPoints) * 100}
                          label={`${factor.name} score`}
                          tone={
                            factor.points >= factor.maxPoints
                              ? "accent"
                              : factor.points === 0
                                ? "red"
                                : "warning"
                          }
                        />
                      )}
                      <p className="mt-1 text-xs leading-5 text-dash-muted">
                        {factor.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>

              <div>
                <h3 className="text-xs font-medium tracking-widest text-dash-muted uppercase">
                  What would move the score
                </h3>
                {assessment.suggestions.length === 0 ? (
                  <p className="mt-2 text-sm text-dash-muted">
                    Every factor is at full marks — nothing to improve.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {assessment.suggestions.map((suggestion) => (
                      <li
                        key={suggestion.factor}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm"
                      >
                        <span className="text-dash-text">
                          {suggestion.action}
                        </span>
                        <span className="text-xs font-medium text-dash-accent">
                          +{suggestion.pointsGain} points
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-dash-border pt-4">
                {aiStatusError && (
                  <p
                    role="note"
                    className="mb-3 rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-muted"
                  >
                    Couldn&rsquo;t check whether AI is set up — the status check
                    itself failed. An explanation may still show your numbers
                    without the narrative; try it and see.
                  </p>
                )}
                {aiStatus !== null && !aiStatus.configured && (
                  <p
                    role="note"
                    className="mb-3 rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-muted"
                  >
                    AI explanations aren&rsquo;t set up yet, so answers show
                    your numbers without the narrative for now.
                  </p>
                )}
                <button
                  type="button"
                  className="dash-small-button"
                  onClick={explain}
                  disabled={explaining}
                >
                  {explaining ? "Explaining…" : "Explain my score"}
                </button>
                <div className="mt-4" aria-live="polite">
                  {explaining && (
                    <div className="flex flex-wrap items-center gap-3">
                      <ReasoningIndicator />
                      <button
                        type="button"
                        className="dash-small-button"
                        onClick={cancelExplain}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {explainCancelled && !explaining && (
                    <p className="text-sm text-dash-muted">
                      Request cancelled.
                    </p>
                  )}
                  {explainError && (
                    <p role="alert" className="text-sm text-dash-red">
                      {explainError}
                    </p>
                  )}
                  {explanation && !explaining && (
                    <div className="space-y-4">
                      {explanation.fallback ? (
                        <p className="text-sm text-dash-muted">
                          {explanation.fallbackReason}
                        </p>
                      ) : (
                        <div>
                          {explanation.refused && (
                            <p className="text-sm font-medium text-dash-text">
                              FinVerse AI can&rsquo;t explain that one.
                            </p>
                          )}
                          {explanation.answer && (
                            <p className="mt-1 text-sm leading-6 text-dash-text">
                              {explanation.answer}
                            </p>
                          )}
                          <VerificationNote
                            verification={explanation.verification}
                          />
                          {explanation.claims.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-xs font-medium tracking-widest text-dash-muted uppercase">
                                Evidence
                              </h4>
                              <ul className="mt-2 space-y-2">
                                {explanation.claims.map((claim, index) => (
                                  <li
                                    key={`${claim.source.tool}-${index}`}
                                    className="rounded-lg border border-dash-border px-3 py-2 text-sm"
                                  >
                                    <p className="text-dash-text">
                                      {claim.text}
                                    </p>
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
                        {explanation.disclaimer}
                        {explanation.model && (
                          <>
                            {" "}
                            · Answered by{" "}
                            <span className="font-mono">
                              {explanation.model}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
