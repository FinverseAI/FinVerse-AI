/**
 * Curated company registry — the seed for the Filings & Reports module.
 *
 * Every entry was verified on 24 November 2026 before it shipped:
 * - BSE scrip codes against the BSE circular list, bseindices.com, and
 *   broker/registrar lists (each code confirmed by at least two sources).
 * - Investor-relations URLs by fetching them (HTTP 200) or by confirming
 *   the exact URL from the company's own search results.
 * An entry with an unverified scrip code must never be added: unknown
 * symbols get Yahoo-only data plus generic exchange links, never a
 * guessed scrip code.
 *
 * BSE stock-page slugs follow BSE's standard pattern
 * (<company-slug>/<symbol-lower>/<scrip-code>); only HDFC Bank's full URL
 * was verified end to end. The scrip code — the part BSE routes on — is
 * verified for all fifteen. If a slug ever 404s, fix it here, in one place.
 */

export interface CompanyRegistryEntry {
  /** NSE trading symbol, without the `.NS` suffix. */
  symbol: string;
  companyName: string;
  /** Six-digit BSE scrip code, verified. */
  bseScripCode: string;
  /** BSE stock-page slug (company part of the URL). */
  bseSlug: string;
  /** The company's own investor-relations landing page, verified. */
  irPageUrl: string;
}

const REGISTRY: readonly CompanyRegistryEntry[] = [
  {
    symbol: 'HDFCBANK',
    companyName: 'HDFC Bank Ltd',
    bseScripCode: '500180',
    bseSlug: 'hdfc-bank-ltd',
    irPageUrl: 'https://www.hdfcbank.com/personal/about-us/investor-relations',
  },
  {
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries Ltd',
    bseScripCode: '500325',
    bseSlug: 'reliance-industries-ltd',
    irPageUrl: 'https://www.ril.com/investors/investor-relations',
  },
  {
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services Ltd',
    bseScripCode: '532540',
    bseSlug: 'tata-consultancy-services-ltd',
    irPageUrl: 'https://www.tcs.com/investor-relations',
  },
  {
    symbol: 'INFY',
    companyName: 'Infosys Ltd',
    bseScripCode: '500209',
    bseSlug: 'infosys-ltd',
    irPageUrl: 'https://www.infosys.com/investors.html',
  },
  {
    symbol: 'ICICIBANK',
    companyName: 'ICICI Bank Ltd',
    bseScripCode: '532174',
    bseSlug: 'icici-bank-ltd',
    irPageUrl: 'https://www.icicibank.com/about-us/investor-relations',
  },
  {
    symbol: 'HINDUNILVR',
    companyName: 'Hindustan Unilever Ltd',
    bseScripCode: '500696',
    bseSlug: 'hindustan-unilever-ltd',
    irPageUrl: 'https://www.hul.co.in/investors/',
  },
  {
    symbol: 'ITC',
    companyName: 'ITC Ltd',
    bseScripCode: '500875',
    bseSlug: 'itc-ltd',
    irPageUrl: 'https://itcportal.com/investors.html',
  },
  {
    symbol: 'SBIN',
    companyName: 'State Bank of India',
    bseScripCode: '500112',
    bseSlug: 'state-bank-of-india',
    irPageUrl: 'https://sbi.co.in/web/investor-relations',
  },
  {
    symbol: 'BHARTIARTL',
    companyName: 'Bharti Airtel Ltd',
    bseScripCode: '532454',
    bseSlug: 'bharti-airtel-ltd',
    irPageUrl: 'https://www.airtel.in/investor-relations',
  },
  {
    symbol: 'KOTAKBANK',
    companyName: 'Kotak Mahindra Bank Ltd',
    bseScripCode: '500247',
    bseSlug: 'kotak-mahindra-bank-ltd',
    irPageUrl: 'https://www.kotak.com/en/investor-relations.html',
  },
  {
    symbol: 'LT',
    companyName: 'Larsen & Toubro Ltd',
    bseScripCode: '500510',
    bseSlug: 'larsen-and-toubro-ltd',
    irPageUrl: 'https://investors.larsentoubro.com/',
  },
  {
    symbol: 'AXISBANK',
    companyName: 'Axis Bank Ltd',
    bseScripCode: '532215',
    bseSlug: 'axis-bank-ltd',
    irPageUrl: 'https://www.axisbank.com/about-us/investor-relations',
  },
  {
    symbol: 'BAJFINANCE',
    companyName: 'Bajaj Finance Ltd',
    bseScripCode: '500034',
    bseSlug: 'bajaj-finance-ltd',
    irPageUrl:
      'https://www.aboutbajajfinserv.com/finance-investor-relations-annual-reports',
  },
  {
    symbol: 'MARUTI',
    companyName: 'Maruti Suzuki India Ltd',
    bseScripCode: '532500',
    bseSlug: 'maruti-suzuki-india-ltd',
    irPageUrl: 'https://www.marutisuzuki.com/corporate/investors',
  },
  {
    symbol: 'TITAN',
    companyName: 'Titan Company Ltd',
    bseScripCode: '500114',
    bseSlug: 'titan-company-ltd',
    irPageUrl: 'https://www.titancompany.in/investors/annual-reports',
  },
];

const bySymbol = new Map(REGISTRY.map((entry) => [entry.symbol, entry]));
const byScripCode = new Map(
  REGISTRY.map((entry) => [entry.bseScripCode, entry]),
);

/**
 * The NSE symbol for a Yahoo-style symbol: `RELIANCE.NS` -> `RELIANCE`.
 * A `.BO` (BSE) symbol resolves through the scrip code instead, and
 * returns null here — use {@link findCompanyByScripCode} for those.
 */
export function nseSymbolOf(symbol: string): string | null {
  const upper = symbol.trim().toUpperCase();
  if (upper.endsWith('.BO')) return null;
  return upper.endsWith('.NS') ? upper.slice(0, -3) : upper;
}

/** Registry lookup by NSE symbol (`RELIANCE`, `RELIANCE.NS`). Null when unknown. */
export function findCompany(symbol: string): CompanyRegistryEntry | null {
  const nseSymbol = nseSymbolOf(symbol);
  if (nseSymbol === null) return null;
  return bySymbol.get(nseSymbol) ?? null;
}

/** Registry lookup by BSE scrip code (`500180`, `500180.BO`). Null when unknown. */
export function findCompanyByScripCode(
  scripCode: string,
): CompanyRegistryEntry | null {
  const code = scripCode.trim().toUpperCase().replace(/\.BO$/, '');
  return byScripCode.get(code) ?? null;
}
