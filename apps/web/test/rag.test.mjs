import assert from "node:assert/strict";
import test from "node:test";
import { claimToolLabel } from "../lib/ai.ts";
import {
  buildScreenFilters,
  filterSnapshot,
  EMPTY_SCREENER_FORM,
  formatMarketCapCrore,
  formatNewsDate,
  formatSentimentSummary,
  isNewsResponse,
  isScreenResponse,
  parseOptionalNumber,
  sentimentTextClass,
} from "../lib/rag.ts";

test("claimToolLabel names the two Phase 2 tools", () => {
  assert.equal(claimToolLabel("searchKnowledge"), "News & knowledge");
  assert.equal(claimToolLabel("screenStocks"), "Stock screener");
});

test("parseOptionalNumber omits blank or non-numeric input, never 0", () => {
  assert.equal(parseOptionalNumber(""), undefined);
  assert.equal(parseOptionalNumber("   "), undefined);
  assert.equal(parseOptionalNumber("abc"), undefined);
  assert.equal(parseOptionalNumber("500"), 500);
  assert.equal(parseOptionalNumber("  1.5 "), 1.5);
  assert.equal(parseOptionalNumber("0"), 0);
});

test("buildScreenFilters keeps only filled, valid fields", () => {
  assert.deepEqual(buildScreenFilters(EMPTY_SCREENER_FORM), {});
  assert.deepEqual(
    buildScreenFilters({
      ...EMPTY_SCREENER_FORM,
      minRsi: "70",
      maxPe: "30",
      minChange1mo: "-5",
      trend: "golden-cross",
      sector: "  Energy ",
      limit: "10",
    }),
    {
      minRsi: 70,
      maxPe: 30,
      minChange1mo: -5,
      trend: "golden-cross",
      sector: "Energy",
      limit: 10,
    },
  );
  // Invalid numbers and an unknown trend are dropped, not sent through.
  assert.deepEqual(
    buildScreenFilters({
      ...EMPTY_SCREENER_FORM,
      minPrice: "cheap",
      trend: "moon",
      sector: "   ",
    }),
    {},
  );
});

test("formatNewsDate renders an ISO date and passes garbage through", () => {
  assert.equal(formatNewsDate("2026-11-18T10:00:00Z"), "18 Nov 2026");
  assert.equal(formatNewsDate("not a date"), "not a date");
});

test("formatMarketCapCrore converts rupees to crore with Indian grouping", () => {
  assert.equal(formatMarketCapCrore(17_600_000_000_000), "₹17,60,000 crore");
  assert.equal(formatMarketCapCrore(500_000_000), "₹50 crore");
  assert.equal(formatMarketCapCrore(null), "");
});

test("sentimentTextClass maps each label to its colour", () => {
  assert.equal(sentimentTextClass("positive"), "text-dash-accent");
  assert.equal(sentimentTextClass("negative"), "text-dash-red");
  assert.equal(sentimentTextClass("neutral"), "text-dash-muted");
});

test("formatSentimentSummary counts the winning side", () => {
  assert.equal(
    formatSentimentSummary({
      score: 0.4,
      label: "positive",
      positive: 2,
      negative: 1,
      neutral: 2,
    }),
    "Positive · 2 of 5 articles",
  );
  assert.equal(
    formatSentimentSummary({
      score: -1,
      label: "negative",
      positive: 0,
      negative: 1,
      neutral: 0,
    }),
    "Negative · 1 of 1 article",
  );
  assert.equal(
    formatSentimentSummary({
      score: 0,
      label: "neutral",
      positive: 0,
      negative: 0,
      neutral: 0,
    }),
    "No articles to score yet.",
  );
});

const validNews = {
  symbol: "RELIANCE.NS",
  articles: [
    {
      title: "Reliance profit jumps",
      publisher: "Reuters",
      publishedAt: "2026-11-18T10:00:00Z",
      url: "https://example.test/a1",
      sentiment: {
        score: 1,
        label: "positive",
        matchedPositive: ["profit"],
        matchedNegative: [],
      },
    },
  ],
  overall: {
    score: 1,
    label: "positive",
    positive: 1,
    negative: 0,
    neutral: 0,
  },
  available: true,
  reason: null,
  fetchedAt: "2026-11-19T13:00:00Z",
};

test("isNewsResponse accepts a well-formed response and an empty one", () => {
  assert.equal(isNewsResponse(validNews), true);
  assert.equal(
    isNewsResponse({
      ...validNews,
      articles: [],
      overall: {
        score: 0,
        label: "neutral",
        positive: 0,
        negative: 0,
        neutral: 0,
      },
      available: false,
      reason: "News is unavailable right now.",
    }),
    true,
  );
});

test("isNewsResponse rejects malformed responses", () => {
  assert.equal(isNewsResponse(null), false);
  assert.equal(isNewsResponse({ ...validNews, articles: "none" }), false);
  assert.equal(
    isNewsResponse({
      ...validNews,
      articles: [{ ...validNews.articles[0], sentiment: { score: 1 } }],
    }),
    false,
  );
  assert.equal(
    isNewsResponse({
      ...validNews,
      overall: { ...validNews.overall, label: "bullish" },
    }),
    false,
  );
  assert.equal(isNewsResponse({ ...validNews, fetchedAt: 42 }), false);
});

const validScreen = {
  filters: { minRsi: 70 },
  universe: ["RELIANCE.NS", "TCS.NS"],
  matches: [
    {
      symbol: "RELIANCE.NS",
      name: "Reliance Industries",
      price: 2600,
      changePercent: 1.2,
      marketCap: 17_600_000_000_000,
      trailingPE: 25,
      sector: "Energy",
      rsi14: 100,
      sma20: 2500,
      sma50: 2400,
      change1moPercent: 5.5,
      stale: false,
    },
    {
      symbol: "TCS.NS",
      name: "Tata Consultancy Services",
      price: null,
      changePercent: null,
      marketCap: null,
      trailingPE: null,
      sector: null,
      rsi14: null,
      sma20: null,
      sma50: null,
      change1moPercent: null,
      stale: true,
    },
  ],
  unavailable: ["DEAD.NS"],
  evaluatedAt: "2026-11-19T13:00:00Z",
};

test("isScreenResponse accepts a well-formed screen with null metrics", () => {
  assert.equal(isScreenResponse(validScreen), true);
  assert.equal(
    isScreenResponse({ ...validScreen, matches: [], unavailable: [] }),
    true,
  );
});

test("isScreenResponse rejects malformed responses", () => {
  assert.equal(isScreenResponse(null), false);
  assert.equal(isScreenResponse({ ...validScreen, matches: "none" }), false);
  assert.equal(
    isScreenResponse({
      ...validScreen,
      matches: [{ ...validScreen.matches[0], price: "2600" }],
    }),
    false,
  );
  assert.equal(
    isScreenResponse({
      ...validScreen,
      matches: [{ ...validScreen.matches[0], stale: "yes" }],
    }),
    false,
  );
  assert.equal(isScreenResponse({ ...validScreen, filters: [] }), false);
});

test("instant stock filters use crore units, actual trend data and available INR quotes", () => {
  const usd = {
    ...validScreen.matches[0],
    symbol: "USD-STOCK",
    currency: "USD",
  };
  const snapshot = { ...validScreen, matches: [...validScreen.matches, usd] };
  const filters = buildScreenFilters({
    ...EMPTY_SCREENER_FORM,
    minMarketCapCr: "1700000",
    maxPrice: "2600",
    trend: "golden-cross",
  });
  assert.deepEqual(
    filterSnapshot(snapshot, filters).matches.map((s) => s.symbol),
    ["RELIANCE.NS"],
  );
  assert.equal(
    filterSnapshot(snapshot, { minMarketCapCr: 2000000 }).matches.length,
    0,
  );
  assert.equal(filterSnapshot(snapshot, {}).matches.length, 3);
});
