/**
 * Deep links to official sources — the reliable backbone of the filings
 * module. Every URL here needs no fetch and no key, so the module stays
 * useful even when both exchange APIs are blocked. Each pattern was
 * verified on 24 November 2026 (HTTP 200, or the exact URL from the
 * source's own site); the BSE stock-page pattern was verified end to end
 * for HDFC Bank and follows BSE's standard slug convention for the rest.
 */
import type { CompanyRegistryEntry } from './registry';
import type { FilingLink } from './filings.types';

export const SEBI_PUBLIC_ISSUES_URL =
  'https://www.sebi.gov.in/filings/public-issues.html';
export const NSE_ANNOUNCEMENTS_BOARD_URL =
  'https://www.nseindia.com/companies-listing/corporate-filings-announcements';
export const CRISIL_URL = 'https://www.crisilratings.com/';
export const ICRA_URL = 'https://www.icra.in/';
export const CARE_URL = 'https://www.careratings.com/';

/** NSE quote page for the symbol — carries the announcements and corporate-actions tabs. */
export function nseQuotePageUrl(nseSymbol: string): string {
  return `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(nseSymbol)}`;
}

/** BSE stock page for a registered company — carries its announcements tab. */
export function bseStockPageUrl(entry: CompanyRegistryEntry): string {
  return `https://www.bseindia.com/stock-share-price/${entry.bseSlug}/${entry.symbol.toLowerCase()}/${entry.bseScripCode}/`;
}

/** NSE search for the symbol's announcements (the board has no per-symbol URL, so the quote page is the deep link). */
export function nseAnnouncementLinks(nseSymbol: string): FilingLink[] {
  return [
    {
      label: `NSE announcements for ${nseSymbol}`,
      url: nseQuotePageUrl(nseSymbol),
      source: 'NSE',
    },
    {
      label: 'NSE corporate announcements board',
      url: NSE_ANNOUNCEMENTS_BOARD_URL,
      source: 'NSE',
    },
  ];
}

export function bseAnnouncementLinks(
  entry: CompanyRegistryEntry,
): FilingLink[] {
  return [
    {
      label: `BSE announcements for ${entry.companyName} (scrip ${entry.bseScripCode})`,
      url: bseStockPageUrl(entry),
      source: 'BSE',
    },
  ];
}

/** Where a company's own reports live: its IR page first, then the exchanges. */
export function reportLinks(
  entry: CompanyRegistryEntry | null,
  nseSymbol: string,
): FilingLink[] {
  const links: FilingLink[] = [];
  if (entry) {
    links.push({
      label: `${entry.companyName} — investor relations`,
      url: entry.irPageUrl,
      source: 'Company IR',
    });
    links.push(...bseAnnouncementLinks(entry));
  }
  links.push({
    label: `NSE filings for ${nseSymbol}`,
    url: nseQuotePageUrl(nseSymbol),
    source: 'NSE',
  });
  return links;
}

export function drhpLinks(): FilingLink[] {
  return [
    {
      label: 'SEBI — public issues & offer documents (DRHP/RHP)',
      url: SEBI_PUBLIC_ISSUES_URL,
      source: 'SEBI',
    },
  ];
}

/**
 * Rating rationales live behind each agency's own search (no stable
 * per-company URL exists), so the links go to the agency and name the
 * company to search for. With no company name (an index, for example)
 * the labels stay generic.
 */
export function ratingLinks(companyName: string | null): FilingLink[] {
  const target = companyName ? ` for ${companyName}` : '';
  return [
    {
      label: `Search CRISIL Ratings${target}`,
      url: CRISIL_URL,
      source: 'CRISIL',
    },
    {
      label: `Search ICRA${target}`,
      url: ICRA_URL,
      source: 'ICRA',
    },
    {
      label: `Search CARE Ratings${target}`,
      url: CARE_URL,
      source: 'CARE',
    },
  ];
}
