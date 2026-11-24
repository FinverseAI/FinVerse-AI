"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "../../../auth/types";
import type {
  HistoryResponse,
  OverviewResponse,
  PortfolioSummary,
} from "../../../lib/market";
import type { ScreenResponse } from "../../../lib/rag";
import { activityError } from "../../(module-one)/dashboard/use-activity";
import { useMarketSection } from "./market-workspace";
import { MarketShell } from "./market-shell";
import { MarketBoard } from "./market-board";
import { Benchmarks } from "./benchmarks";
import { PortfolioSection } from "./portfolio";
import { OptimizerSection } from "./optimizer";
import { ScreenerSection } from "./screener";
import { Watchlist } from "./watchlist";

function useMarketData<T>(path: string, enabled: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(path, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(65000),
          ]),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.message || "Unable to load market data.");
        if (!controller.signal.aborted) {
          setData(body);
          setError("");
        }
      } catch (caught) {
        if (!controller.signal.aborted) {
          setData(null);
          setError(activityError(caught));
        }
      }
    }
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 15 * 60_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [path, enabled, revision]);
  return {
    data,
    error,
    loading: !data && !error,
    refresh: () => setRevision((r) => r + 1),
  };
}

export default function Market({ user }: { user?: AuthUser }) {
  const section = useMarketSection();
  const overviewTab = section.id === "overview";
  const overview = useMarketData<OverviewResponse>(
    "/api/market/overview",
    overviewTab || section.id === "watchlist",
  );
  const summary = useMarketData<PortfolioSummary>(
    "/api/portfolio/summary",
    section.id === "portfolio" || section.id === "optimizer",
  );
  const snapshot = useMarketData<ScreenResponse>(
    "/api/rag/screen",
    overviewTab || section.id === "screener",
  );
  const history = useMarketData<HistoryResponse>(
    "/api/market/history/%5ENSEI?range=1mo",
    overviewTab,
  );
  return (
    <MarketShell
      user={user}
      eyebrow="FinVerse / Investment desk"
      title={section.title}
      description={section.description}
    >
      {overviewTab && (
        <>
          <div className="desk-heading">
            <h3>Benchmarks</h3>
            <span className="desk-muted">
              Yahoo Finance · 15-minute quote cache
            </span>
          </div>
          {overview.error && (
            <p role="alert" className="desk-muted">
              {overview.error}{" "}
              <button className="desk-link" onClick={overview.refresh}>
                Retry quotes
              </button>
            </p>
          )}
          <Benchmarks
            quotes={overview.data?.indices ?? []}
            history={history.data}
            historyLoading={history.loading}
            loading={overview.loading}
          />
          {history.error && (
            <button className="desk-link" onClick={history.refresh}>
              Retry index history
            </button>
          )}
          {snapshot.loading && (
            <p role="status" className="dash-panel">
              Loading stock prices and technical indicators…
            </p>
          )}
          {snapshot.error && (
            <p role="alert" className="dash-panel">
              {snapshot.error}{" "}
              <button className="desk-link" onClick={snapshot.refresh}>
                Retry stocks
              </button>
            </p>
          )}
          {snapshot.data && <MarketBoard snapshot={snapshot.data} />}
        </>
      )}
      {section.id === "watchlist" && (
        <Watchlist
          overview={overview.data}
          loading={overview.loading}
          error={overview.error}
          onChanged={overview.refresh}
        />
      )}
      {section.id === "portfolio" && (
        <PortfolioSection
          summary={summary.data}
          loading={summary.loading}
          error={summary.error}
          onRetry={summary.refresh}
        />
      )}
      {section.id === "optimizer" && (
        <OptimizerSection holdings={summary.data?.holdings ?? []} />
      )}
      {section.id === "screener" && (
        <ScreenerSection
          snapshot={snapshot.data}
          snapshotError={snapshot.error}
          onRetry={snapshot.refresh}
        />
      )}
    </MarketShell>
  );
}
