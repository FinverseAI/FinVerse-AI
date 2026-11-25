import { Injectable, Logger, Optional } from '@nestjs/common';
import type { ExchangeFetchResult, FilingEntry } from './filings.types';

/**
 * BSE corporate-announcements client (api.bseindia.com).
 *
 * The endpoint is undocumented, so the parser is deliberately defensive:
 * it accepts the known `Table` shape and picks title/date/attachment from
 * several possible field names. A shape change therefore degrades to an
 * empty list instead of a crash — and like the NSE client, every failure
 * (BSE returns 403 to datacenter IPs, verified November 2026) comes back
 * as `available: false`, logged, never thrown. Live verification of the
 * response shape was impossible from this environment; the deep links
 * carry the feature when the feed is blocked.
 *
 * `fetch` is injectable so the client is unit-testable without the network.
 */

export const BSE_ANNOUNCEMENTS_TTL_MS = 10 * 60 * 1000;
/** Failures and empty-but-OK responses are cached only briefly: a
 * transient 403/shape glitch must not read as "unavailable" for ten
 * minutes, and a transient empty list must not read as "no
 * announcements" (B23). */
export const BSE_FAILURE_TTL_MS = 60 * 1000;
/** Bound on cached scrip codes (LRU by insertion order): keys are
 * arbitrary user-supplied symbols, so an unbounded map grows for the
 * life of the server (B23). */
export const BSE_CACHE_MAX_ENTRIES = 200;
const FETCH_TIMEOUT_MS = 8000;
const MAX_ENTRIES = 25;
const LOOKBACK_DAYS = 30;
/**
 * Pages fetched per call at most (B31). The feed is paged until a page
 * adds nothing new, so the 30-day window is covered instead of just
 * page 1 — but the loop is capped so a misbehaving endpoint cannot
 * turn one request into an unbounded crawl.
 */
const MAX_PAGES = 5;
const BSE_API = 'https://api.bseindia.com/BseIndiaAPI/api/AnnGetData/w';
const BSE_ATTACHMENT_BASE =
  'https://www.bseindia.com/xml-data/corpfiling/AttachHis/';
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

type FetchFn = typeof fetch;

const MONTHS: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};

/**
 * A real calendar date, or null. The components are round-tripped
 * through `Date` so impossible dates (`32 Nov 2026`, `2026-02-30`,
 * `2026-13-01`) are rejected instead of passed through (B32); the
 * month lookup is case-insensitive, so `24 nov 2026` keeps its date
 * instead of silently dropping it.
 */
function validDate(year: number, month: number, day: number): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthNumber(raw: string): number | null {
  const key = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  const month = MONTHS[key];
  return month === undefined ? null : Number(month);
}

/**
 * BSE dates arrive as `24 Nov 2026` (sometimes with a time suffix) or
 * ISO. Anything else returns null rather than a guessed date.
 */
export function parseBseDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const match = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/.exec(trimmed);
  if (!match) return null;
  const month = monthNumber(match[2]);
  if (month === null) return null;
  return validDate(Number(match[3]), month, Number(match[1]));
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function firstText(
  item: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = text(item[key]);
    if (value) return value;
  }
  return null;
}

function resolveAttachment(value: string | null, fallbackUrl: string): string {
  if (!value) return fallbackUrl;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `https://www.bseindia.com${value}`;
  return `${BSE_ATTACHMENT_BASE}${value}`;
}

/**
 * Parses the AnnGetData payload (`{ Table: [...] }`). Field names vary
 * across BSE's own callers, so title/date/attachment are picked from
 * several candidates. Rows without a title are dropped.
 */
export function parseBseAnnouncements(
  payload: unknown,
  fallbackUrl: string,
): FilingEntry[] {
  const table = (payload as { Table?: unknown } | null)?.Table;
  const rows = Array.isArray(table) ? table : [];
  const entries: FilingEntry[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const title = firstText(
      item,
      'ANNOUNCEMENT',
      'NEWSSUB',
      'HEADLINE',
      'SUBJECT',
    );
    if (!title) continue;
    entries.push({
      title,
      date: parseBseDate(
        firstText(item, 'ANNOUNCEMENT_DT', 'DT_TM', 'NEWSDT', 'DATE'),
      ),
      source: 'BSE',
      url: resolveAttachment(
        firstText(item, 'ATTACHMENT_URL', 'ATTACHMENTNAME', 'PDF_URL'),
        fallbackUrl,
      ),
      documentType: 'announcement',
    });
    if (entries.length >= MAX_ENTRIES) break;
  }
  return entries;
}

function yyyymmdd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

@Injectable()
export class BseClient {
  private readonly logger = new Logger(BseClient.name);
  private readonly cache = new Map<
    string,
    { at: number; ttlMs: number; result: ExchangeFetchResult }
  >();

  // @Optional: Nest injects nothing for the fetch function, so the
  // default (global fetch) applies; tests pass a mock directly.
  constructor(@Optional() private readonly fetchFn: FetchFn = fetch) {}

  async fetchAnnouncements(
    scripCode: string,
    fallbackUrl: string,
  ): Promise<ExchangeFetchResult> {
    const cached = this.cache.get(scripCode);
    if (cached && Date.now() - cached.at < cached.ttlMs) {
      return cached.result;
    }
    const result = await this.fetchFresh(scripCode, fallbackUrl);
    // Only a successful non-empty result earns the full TTL; failures
    // and empty results are cached briefly (B23).
    const ttlMs =
      result.available && result.entries.length > 0
        ? BSE_ANNOUNCEMENTS_TTL_MS
        : BSE_FAILURE_TTL_MS;
    // Re-insert so a refreshed entry counts as most-recently used.
    this.cache.delete(scripCode);
    this.cache.set(scripCode, { at: Date.now(), ttlMs, result });
    if (this.cache.size > BSE_CACHE_MAX_ENTRIES) {
      // Evict the oldest-inserted entry (Map keeps insertion order).
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return result;
  }

  private async fetchFresh(
    scripCode: string,
    fallbackUrl: string,
  ): Promise<ExchangeFetchResult> {
    const fetchedAt = new Date().toISOString();
    const unavailable: ExchangeFetchResult = {
      available: false,
      entries: [],
      fetchedAt,
    };
    const to = new Date();
    const from = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    // Page through the 30-day window instead of reading page 1 only
    // (B31): stop when a page adds nothing new (empty page, or a page
    // repeating rows already seen), when enough entries are collected,
    // or at MAX_PAGES. Known remaining limitation: only the
    // 'Company Update' category is queried — other BSE categories are
    // not covered by this endpoint.
    const entries: FilingEntry[] = [];
    const seen = new Set<string>();
    for (let page = 1; page <= MAX_PAGES; page++) {
      const params = new URLSearchParams({
        pageno: String(page),
        strCat: 'Company Update',
        strPrevDate: yyyymmdd(from),
        strScrip: scripCode,
        strSearch: 'P',
        strToDate: yyyymmdd(to),
        strType: 'C',
      });
      let pageEntries: FilingEntry[];
      try {
        const response = await this.fetchFn(`${BSE_API}?${params}`, {
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': USER_AGENT,
            Referer: 'https://www.bseindia.com/',
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!response.ok) {
          this.logger.warn(
            `BSE announcements for ${scripCode} returned HTTP ${response.status}.`,
          );
          // A failure after earlier pages succeeded keeps what was
          // already collected instead of discarding good entries.
          return entries.length > 0
            ? { available: true, entries, fetchedAt }
            : unavailable;
        }
        const payload: unknown = await response.json();
        pageEntries = parseBseAnnouncements(payload, fallbackUrl);
      } catch (error) {
        this.logger.warn(
          `BSE announcements for ${scripCode} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
        return entries.length > 0
          ? { available: true, entries, fetchedAt }
          : unavailable;
      }
      let added = 0;
      for (const entry of pageEntries) {
        const key = `${entry.title.toLowerCase()}|${entry.date ?? ''}|${entry.url.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push(entry);
        added++;
        if (entries.length >= MAX_ENTRIES) break;
      }
      if (added === 0 || entries.length >= MAX_ENTRIES) break;
    }
    return { available: true, entries, fetchedAt };
  }
}
