/**
 * Filings & Reports — the document index for one listed company.
 *
 * The module never re-hosts a document and never invents one: entries are
 * either live announcements fetched from the exchange APIs or curated
 * deep links to the official source (exchange, company investor-relations
 * page, SEBI, rating agency). A source that cannot be reached degrades to
 * an honest `unavailable` status — never a fake entry, never a 500.
 */

export type FilingCategory =
  | 'annual-reports'
  | 'quarterly-results'
  | 'investor-presentations'
  | 'announcements'
  | 'drhp'
  | 'ratings';

export type FilingSource =
  'NSE' | 'BSE' | 'Company IR' | 'SEBI' | 'CRISIL' | 'ICRA' | 'CARE';

export type FilingCategoryStatus = 'live' | 'links-only' | 'unavailable';

/** One document or announcement. `date` is an ISO date or null when the source gives none. */
export interface FilingEntry {
  title: string;
  date: string | null;
  source: FilingSource;
  url: string;
  documentType: string;
}

/** A curated deep link to an official page (no fetch involved). */
export interface FilingLink {
  label: string;
  url: string;
  source: FilingSource;
}

export interface FilingCategoryBlock {
  status: FilingCategoryStatus;
  entries: FilingEntry[];
  links: FilingLink[];
}

export interface FilingsResponse {
  symbol: string;
  nseSymbol: string;
  company: { name: string; bseScripCode: string } | null;
  asOf: string;
  categories: Record<FilingCategory, FilingCategoryBlock>;
}

/** Result of one exchange fetch: the clients fail open, so a failed fetch is a result, not a throw. */
export interface ExchangeFetchResult {
  available: boolean;
  entries: FilingEntry[];
  /**
   * When this result was fetched from the exchange (ISO timestamp). For a
   * cached result this is the original fetch time, not "now" — the
   * service reports it as the response's `asOf` so a cached feed is
   * never presented as just-fetched (B27). A failed attempt still stamps
   * the attempt time: it says when the feed was last checked.
   */
  fetchedAt: string;
}
