/**
 * Filings & Reports types for the Module 2 stock page. These mirror the
 * backend filings response exactly (apps/backend/src/filings/) — the
 * `isFilingsResponse` guard runs before rendering, so a backend drift
 * fails loudly instead of rendering half a response.
 */

export type FilingCategory =
  | "annual-reports"
  | "quarterly-results"
  | "investor-presentations"
  | "announcements"
  | "drhp"
  | "ratings";

export type FilingCategoryStatus = "live" | "links-only" | "unavailable";

export type FilingEntry = {
  title: string;
  date: string | null;
  source: string;
  url: string;
  documentType: string;
};

export type FilingLink = {
  label: string;
  url: string;
  source: string;
};

export type FilingCategoryBlock = {
  status: FilingCategoryStatus;
  entries: FilingEntry[];
  links: FilingLink[];
};

export type FilingsResponse = {
  symbol: string;
  nseSymbol: string;
  company: { name: string; bseScripCode: string } | null;
  asOf: string;
  categories: Record<FilingCategory, FilingCategoryBlock>;
};

export const filingCategories: {
  key: FilingCategory;
  label: string;
  hint: string;
}[] = [
  {
    key: "announcements",
    label: "Announcements",
    hint: "Exchange announcements from the last 30 days.",
  },
  {
    key: "annual-reports",
    label: "Annual Reports",
    hint: "Full-year reports from the company's investor-relations page.",
  },
  {
    key: "quarterly-results",
    label: "Quarterly Results",
    hint: "Quarterly financial results from the company and the exchanges.",
  },
  {
    key: "investor-presentations",
    label: "Investor Presentations",
    hint: "Earnings and investor-day presentations from the company.",
  },
  {
    key: "drhp",
    label: "DRHP",
    hint: "Draft offer documents filed with SEBI (for companies coming to market).",
  },
  {
    key: "ratings",
    label: "Ratings",
    hint: "Credit-rating rationales from CRISIL, ICRA and CARE.",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEntry(value: unknown): value is FilingEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.title === "string" &&
    (typeof value.date === "string" || value.date === null) &&
    typeof value.source === "string" &&
    typeof value.url === "string" &&
    typeof value.documentType === "string"
  );
}

function isLink(value: unknown): value is FilingLink {
  if (!isRecord(value)) return false;
  return (
    typeof value.label === "string" &&
    typeof value.url === "string" &&
    typeof value.source === "string"
  );
}

function isBlock(value: unknown): value is FilingCategoryBlock {
  if (!isRecord(value)) return false;
  if (
    value.status !== "live" &&
    value.status !== "links-only" &&
    value.status !== "unavailable"
  )
    return false;
  if (!Array.isArray(value.entries) || !value.entries.every(isEntry))
    return false;
  if (!Array.isArray(value.links) || !value.links.every(isLink)) return false;
  return true;
}

export function isFilingsResponse(value: unknown): value is FilingsResponse {
  if (!isRecord(value)) return false;
  if (typeof value.symbol !== "string") return false;
  if (typeof value.nseSymbol !== "string") return false;
  if (typeof value.asOf !== "string") return false;
  if (value.company !== null) {
    if (!isRecord(value.company)) return false;
    if (typeof value.company.name !== "string") return false;
    if (typeof value.company.bseScripCode !== "string") return false;
  }
  const categories = value.categories;
  if (!isRecord(categories)) return false;
  return filingCategories.every(
    (category) =>
      category.key in categories && isBlock(categories[category.key]),
  );
}

/** "2026-11-24" -> "24 Nov 2026"; null/unknown stays honest. */
export function formatFilingDate(iso: string | null): string {
  if (!iso) return "Date not given";
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Date not given";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
