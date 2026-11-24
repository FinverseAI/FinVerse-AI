"use client";

import { useEffect, useState } from "react";
import { PanelHeading } from "../../../../(module-one)/dashboard/ui";
import {
  activityError,
  activityRequest,
} from "../../../../(module-one)/dashboard/use-activity";
import {
  filingCategories,
  formatFilingDate,
  isFilingsResponse,
  type FilingCategory,
  type FilingsResponse,
} from "../../../../../lib/filings";
import { formatFetchedAt } from "../../../../../lib/market";

/**
 * Filings & Reports (Module 2 extension, November 2026): the document
 * index for the symbol — exchange announcements plus curated deep links
 * to annual reports, quarterly results, investor presentations, DRHP
 * filings and rating rationales. FinVerse links to the official
 * documents; it never hosts copies and never invents an entry. When an
 * exchange feed is blocked, the section says so and the official links
 * still work.
 */

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="rounded-full bg-dash-raised px-2 py-0.5 font-mono text-[11px] text-dash-muted">
      {source}
    </span>
  );
}

/** Pure presentational half: renders a fetched index. Kept separate so render tests can drive it with fixture data. */
export function FilingsContent({ data }: { data: FilingsResponse }) {
  const [active, setActive] = useState<FilingCategory>("announcements");
  const block = data.categories[active];
  const category = filingCategories.find((item) => item.key === active)!;

  return (
    <div className="mt-4">
      <div
        className="flex flex-wrap gap-1"
        role="tablist"
        aria-label="Document categories"
      >
        {filingCategories.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active === item.key}
            onClick={() => setActive(item.key)}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              active === item.key
                ? "bg-dash-accent/15 text-dash-accent"
                : "text-dash-muted hover:bg-dash-raised hover:text-dash-text"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-dash-muted">{category.hint}</p>

      {block.status === "unavailable" && (
        <p
          role="note"
          className="mt-3 rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-muted"
        >
          The exchange feed is unavailable right now — the official links below
          still open the source.
        </p>
      )}
      {block.status === "links-only" && (
        <p className="mt-3 text-xs text-dash-muted">
          These documents open on the official source. FinVerse links to them —
          it does not host copies.
        </p>
      )}

      {block.entries.length > 0 ? (
        <ul className="mt-4 divide-y divide-dash-border">
          {block.entries.map((entry) => (
            <li key={`${entry.source}-${entry.url}`} className="py-3">
              <a
                href={entry.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm font-medium text-dash-text hover:text-dash-accent"
              >
                {entry.title} ↗
              </a>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-dash-muted">
                <SourceBadge source={entry.source} />
                <span>{formatFilingDate(entry.date)}</span>
                <span className="capitalize">{entry.documentType}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        block.status === "live" && (
          <p className="mt-4 text-sm text-dash-muted">
            No announcements in the last 30 days.
          </p>
        )
      )}

      {block.links.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium tracking-widest text-dash-muted uppercase">
            Official links
          </h4>
          <ul className="mt-2 space-y-2">
            {block.links.map((link) => (
              <li key={link.url} className="flex flex-wrap items-center gap-2">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm text-dash-text hover:text-dash-accent"
                >
                  {link.label} ↗
                </a>
                <SourceBadge source={link.source} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 border-t border-dash-border pt-3 text-xs text-dash-muted">
        Documents: NSE, BSE, SEBI, the company&apos;s investor-relations page
        and the rating agencies (CRISIL, ICRA, CARE). Prices and fundamentals:
        Yahoo Finance. Index as of {formatFetchedAt(data.asOf)}.
      </p>
    </div>
  );
}

export function StockFilingsSection({ symbol }: { symbol: string }) {
  const [data, setData] = useState<FilingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  const encodedSymbol = encodeURIComponent(symbol);

  useEffect(() => {
    let active = true;
    activityRequest<unknown>(`/api/market/filings/${encodedSymbol}`)
      .then((response) => {
        if (!isFilingsResponse(response)) {
          throw new Error(
            "The filings service returned an unexpected response. Please try again.",
          );
        }
        if (active) {
          setData(response);
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

  return (
    <section id="filings" aria-label="Filings and reports" className="dash-panel">
      <PanelHeading icon="file" title="Filings & Reports" />
      {loading ? (
        <p role="status" className="mt-4 text-sm text-dash-muted">
          Loading filings…
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
      ) : data ? (
        <FilingsContent data={data} />
      ) : null}
    </section>
  );
}
