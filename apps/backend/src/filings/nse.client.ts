import { Injectable, Logger, Optional } from '@nestjs/common';
import type { ExchangeFetchResult, FilingEntry } from './filings.types';
import { nseQuotePageUrl } from './deep-links';

/**
 * NSE corporate-announcements client.
 *
 * NSE's API needs a session: the homepage is fetched first (it sets the
 * cookies Akamai checks), then the JSON endpoint is called with those
 * cookies plus browser-like headers. The client fails open — a blocked
 * request (NSE returns 403 to datacenter IPs, verified November 2026), a
 * timeout, or a shape change all come back as `available: false` with an
 * empty list, logged, never thrown. The deep links carry the feature
 * when the feed is blocked.
 *
 * `fetch` is injectable so the client is unit-testable without the network.
 */

export const NSE_ANNOUNCEMENTS_TTL_MS = 10 * 60 * 1000;
/** Failures and empty-but-OK responses are cached only briefly: a
 * transient 403/shape glitch must not read as "unavailable" for ten
 * minutes, and a transient empty list must not read as "no
 * announcements" (B23). */
export const NSE_FAILURE_TTL_MS = 60 * 1000;
/** Bound on cached symbols (LRU by insertion order): keys are
 * arbitrary user-supplied symbols, so an unbounded map grows for the
 * life of the server (B23). */
export const NSE_CACHE_MAX_ENTRIES = 200;
const FETCH_TIMEOUT_MS = 8000;
const MAX_ENTRIES = 25;
const NSE_HOME = 'https://www.nseindia.com/';
const NSE_API = 'https://www.nseindia.com/api/corporate-announcements';
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
 * through `Date` so impossible dates (`32-Nov-2026`, `2026-02-30`,
 * `2026-13-01`) are rejected instead of passed through (B32); the
 * month lookup is case-insensitive, so `24-nov-2026` keeps its date
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
 * NSE dates arrive as `24-Nov-2026`; ISO dates pass through. Anything
 * else returns null rather than a guessed date.
 */
export function parseNseDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(trimmed);
  if (!match) return null;
  const month = monthNumber(match[2]);
  if (month === null) return null;
  return validDate(Number(match[3]), month, Number(match[1]));
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resolveUrl(value: string | null, symbol: string): string {
  if (!value) return nseQuotePageUrl(symbol);
  if (/^https?:\/\//i.test(value)) return value;
  return `https://www.nseindia.com${value.startsWith('/') ? '' : '/'}${value}`;
}

/**
 * Parses the corporate-announcements payload: a bare array of
 * `{ symbol, desc, date, attachmentFile }` (a `{ data: [...] }` wrapper
 * is accepted too). Rows without a title are dropped; rows without a
 * usable date keep `date: null`.
 */
export function parseNseAnnouncements(
  payload: unknown,
  symbol: string,
): FilingEntry[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown } | null)?.data)
      ? (payload as { data: unknown[] }).data
      : [];
  const entries: FilingEntry[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const title = text(item.desc) ?? text(item.title);
    if (!title) continue;
    entries.push({
      title,
      date: parseNseDate(item.date),
      source: 'NSE',
      url: resolveUrl(text(item.attachmentFile), symbol),
      documentType: 'announcement',
    });
    if (entries.length >= MAX_ENTRIES) break;
  }
  return entries;
}

function collectCookies(headers: Headers): string {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] })
    .getSetCookie;
  const raw =
    typeof getSetCookie === 'function' ? getSetCookie.call(headers) : [];
  if (raw.length > 0) {
    return raw.map((cookie) => cookie.split(';')[0].trim()).join('; ');
  }
  const single = headers.get('set-cookie');
  return single ? single.split(';')[0].trim() : '';
}

@Injectable()
export class NseClient {
  private readonly logger = new Logger(NseClient.name);
  private readonly cache = new Map<
    string,
    { at: number; ttlMs: number; result: ExchangeFetchResult }
  >();

  // @Optional: Nest injects nothing for the fetch function, so the
  // default (global fetch) applies; tests pass a mock directly.
  constructor(@Optional() private readonly fetchFn: FetchFn = fetch) {}

  async fetchAnnouncements(symbol: string): Promise<ExchangeFetchResult> {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.at < cached.ttlMs) {
      return cached.result;
    }
    const result = await this.fetchFresh(symbol);
    // Only a successful non-empty result earns the full TTL; failures
    // and empty results are cached briefly (B23).
    const ttlMs =
      result.available && result.entries.length > 0
        ? NSE_ANNOUNCEMENTS_TTL_MS
        : NSE_FAILURE_TTL_MS;
    // Re-insert so a refreshed entry counts as most-recently used.
    this.cache.delete(symbol);
    this.cache.set(symbol, { at: Date.now(), ttlMs, result });
    if (this.cache.size > NSE_CACHE_MAX_ENTRIES) {
      // Evict the oldest-inserted entry (Map keeps insertion order).
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return result;
  }

  private async fetchFresh(symbol: string): Promise<ExchangeFetchResult> {
    const fetchedAt = new Date().toISOString();
    const unavailable: ExchangeFetchResult = {
      available: false,
      entries: [],
      fetchedAt,
    };
    try {
      const session = await this.fetchFn(NSE_HOME, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const cookies = collectCookies(session.headers);
      const response = await this.fetchFn(
        `${NSE_API}?index=equities&symbol=${encodeURIComponent(symbol)}`,
        {
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': USER_AGENT,
            Referer:
              'https://www.nseindia.com/companies-listing/corporate-filings-announcements',
            'X-Requested-With': 'XMLHttpRequest',
            ...(cookies ? { Cookie: cookies } : {}),
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      );
      if (!response.ok) {
        this.logger.warn(
          `NSE announcements for ${symbol} returned HTTP ${response.status}.`,
        );
        return unavailable;
      }
      const payload: unknown = await response.json();
      return {
        available: true,
        entries: parseNseAnnouncements(payload, symbol),
        fetchedAt,
      };
    } catch (error) {
      this.logger.warn(
        `NSE announcements for ${symbol} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return unavailable;
    }
  }
}
