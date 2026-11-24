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
const FETCH_TIMEOUT_MS = 8000;
const MAX_ENTRIES = 25;
const LOOKBACK_DAYS = 30;
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
 * BSE dates arrive as `24 Nov 2026` (sometimes with a time suffix) or
 * ISO. Anything else returns null rather than a guessed date.
 */
export function parseBseDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const match = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/.exec(trimmed);
  if (!match) return null;
  const month = MONTHS[match[2]];
  if (!month) return null;
  return `${match[3]}-${month}-${match[1].padStart(2, '0')}`;
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
    { at: number; result: ExchangeFetchResult }
  >();

  // @Optional: Nest injects nothing for the fetch function, so the
  // default (global fetch) applies; tests pass a mock directly.
  constructor(@Optional() private readonly fetchFn: FetchFn = fetch) {}

  async fetchAnnouncements(
    scripCode: string,
    fallbackUrl: string,
  ): Promise<ExchangeFetchResult> {
    const cached = this.cache.get(scripCode);
    if (cached && Date.now() - cached.at < BSE_ANNOUNCEMENTS_TTL_MS) {
      return cached.result;
    }
    const result = await this.fetchFresh(scripCode, fallbackUrl);
    this.cache.set(scripCode, { at: Date.now(), result });
    return result;
  }

  private async fetchFresh(
    scripCode: string,
    fallbackUrl: string,
  ): Promise<ExchangeFetchResult> {
    const unavailable: ExchangeFetchResult = { available: false, entries: [] };
    const to = new Date();
    const from = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      pageno: '1',
      strCat: 'Company Update',
      strPrevDate: yyyymmdd(from),
      strScrip: scripCode,
      strSearch: 'P',
      strToDate: yyyymmdd(to),
      strType: 'C',
    });
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
        return unavailable;
      }
      const payload: unknown = await response.json();
      return {
        available: true,
        entries: parseBseAnnouncements(payload, fallbackUrl),
      };
    } catch (error) {
      this.logger.warn(
        `BSE announcements for ${scripCode} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return unavailable;
    }
  }
}
