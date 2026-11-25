import { Injectable } from '@nestjs/common';
import { normalizeSymbol } from '../market/market.validation';
import { BseClient } from './bse.client';
import {
  bseAnnouncementLinks,
  bseStockPageUrl,
  drhpLinks,
  isExchangeFallbackUrl,
  nseAnnouncementLinks,
  NSE_ANNOUNCEMENTS_BOARD_URL,
  ratingLinks,
  reportLinks,
} from './deep-links';
import type {
  FilingCategoryBlock,
  FilingEntry,
  FilingsResponse,
} from './filings.types';
import { NseClient } from './nse.client';
import {
  findCompany,
  findCompanyByScripCode,
  nseSymbolOf,
  type CompanyRegistryEntry,
} from './registry';

const MAX_ANNOUNCEMENTS = 25;

/**
 * Filings & Reports index for one symbol.
 *
 * Live data comes only from the exchange announcement feeds; everything
 * else is a curated deep link to the official source. The service never
 * throws for a failed feed — the clients fail open, and the response
 * says so per category. The only throw is the 400 for an invalid symbol.
 */
@Injectable()
export class FilingsService {
  constructor(
    private readonly nse: NseClient,
    private readonly bse: BseClient,
  ) {}

  async getFilings(symbolInput: string): Promise<FilingsResponse> {
    const symbol = normalizeSymbol(symbolInput);
    // `.BO` by company name (`RELIANCE.BO`) resolves through the
    // registry by symbol after stripping the suffix; a bare 6-digit
    // scrip code (`500180`) is a scrip-code lookup (B24). The plain
    // scrip-code form (`500180.BO`) still resolves first.
    const entry = /^\d{6}$/.test(symbol)
      ? findCompanyByScripCode(symbol)
      : symbol.endsWith('.BO')
        ? (findCompanyByScripCode(symbol) ?? findCompany(symbol.slice(0, -3)))
        : findCompany(symbol);
    const nseSymbol = entry?.symbol ?? nseSymbolOf(symbol);
    const isEquity =
      nseSymbol !== null &&
      !nseSymbol.startsWith('^') &&
      !nseSymbol.includes('=');

    const { block: announcementsBlock, fetchedAt } = await this.announcements(
      entry,
      nseSymbol,
      isEquity,
    );
    const reportLinkList =
      entry || (nseSymbol !== null && isEquity)
        ? reportLinks(entry, nseSymbol as string)
        : [
            {
              label: 'NSE corporate announcements board',
              url: NSE_ANNOUNCEMENTS_BOARD_URL,
              source: 'NSE' as const,
            },
          ];
    const ratingName = entry?.companyName ?? (isEquity ? nseSymbol : null);

    const linksOnly = (
      links: FilingCategoryBlock['links'],
    ): FilingCategoryBlock => ({ status: 'links-only', entries: [], links });

    return {
      symbol,
      nseSymbol: nseSymbol ?? symbol,
      company: entry
        ? { name: entry.companyName, bseScripCode: entry.bseScripCode }
        : null,
      // The freshness of the feeds actually consulted, not "now": when
      // the announcements came from the 10-minute cache, `asOf` is the
      // cache timestamp (B27). With no feed consulted (an index, or any
      // links-only response) there is no cached data to date, so the
      // response time is honest.
      asOf: fetchedAt ?? new Date().toISOString(),
      categories: {
        'annual-reports': linksOnly(reportLinkList),
        'quarterly-results': linksOnly(reportLinkList),
        'investor-presentations': linksOnly(reportLinkList),
        announcements: announcementsBlock,
        drhp: linksOnly(drhpLinks()),
        ratings: linksOnly(ratingLinks(ratingName)),
      },
    };
  }

  private async announcements(
    entry: CompanyRegistryEntry | null,
    nseSymbol: string | null,
    isEquity: boolean,
  ): Promise<{
    block: FilingCategoryBlock;
    /** Newest fetch time of the feeds consulted, or null when none were. */
    fetchedAt: string | null;
  }> {
    const links: FilingCategoryBlock['links'] = [];
    if (nseSymbol !== null && isEquity) {
      links.push(...nseAnnouncementLinks(nseSymbol));
    } else {
      links.push({
        label: 'NSE corporate announcements board',
        url: NSE_ANNOUNCEMENTS_BOARD_URL,
        source: 'NSE',
      });
    }
    if (entry) links.push(...bseAnnouncementLinks(entry));

    // Indices and currency pairs are not equities: no announcement feed
    // exists for them, so the category is links-only by definition.
    if (nseSymbol === null || !isEquity) {
      return {
        block: { status: 'links-only', entries: [], links },
        fetchedAt: null,
      };
    }

    const [nseResult, bseResult] = await Promise.all([
      this.nse.fetchAnnouncements(nseSymbol),
      entry
        ? this.bse.fetchAnnouncements(
            entry.bseScripCode,
            bseStockPageUrl(entry),
          )
        : Promise.resolve({
            available: false,
            entries: [],
            fetchedAt: new Date().toISOString(),
          }),
    ]);
    const live = nseResult.available || bseResult.available;
    // The newest fetch among the feeds consulted — a cached feed
    // contributes its original fetch time (B27). A feed that was not
    // consulted (no registry entry → no BSE call) must not move `asOf`.
    const fetchedAt = entry
      ? nseResult.fetchedAt >= bseResult.fetchedAt
        ? nseResult.fetchedAt
        : bseResult.fetchedAt
      : nseResult.fetchedAt;
    return {
      block: {
        status: live ? 'live' : 'unavailable',
        entries: mergeAnnouncements(nseResult.entries, bseResult.entries),
        links,
      },
      fetchedAt,
    };
  }
}

/**
 * Merges the two feeds, newest first. Entries with a real document URL
 * dedup by that URL (the same attachment on both feeds is one
 * announcement). Rows without an attachment share their exchange's
 * fallback page URL, so deduping on it would silently drop all but one
 * of them (B18) — those dedup on title + date instead, which is also
 * how the same text-only disclosure cross-posted on both exchanges
 * collapses to one row. Undated entries sort last — an unknown date is
 * never promoted above a known one.
 */
export function mergeAnnouncements(...feeds: FilingEntry[][]): FilingEntry[] {
  const seen = new Set<string>();
  const merged: FilingEntry[] = [];
  for (const feed of feeds) {
    for (const item of feed) {
      const key =
        item.url && !isExchangeFallbackUrl(item.url)
          ? `url:${item.url.toLowerCase().replace(/\/$/, '')}`
          : `title:${item.title.toLowerCase().trim()}|${item.date ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  merged.sort((a, b) => {
    if (a.date === null && b.date === null) return 0;
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return b.date.localeCompare(a.date);
  });
  return merged.slice(0, MAX_ANNOUNCEMENTS);
}
