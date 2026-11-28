import assert from "node:assert/strict";
import test from "node:test";
import {
  earliestBuyDate,
  formatCompact,
  formatFetchedAt,
  formatMoney,
  formatPercent,
  formatPrice,
  historyRanges,
  portfolioCashFlows,
  todayIst,
  totalsByCurrency,
} from "../lib/market.ts";

test("formatPrice uses Indian grouping with two decimals", () => {
  assert.equal(formatPrice(1234567.89), "₹12,34,567.89");
  assert.equal(formatPrice(0), "₹0.00");
  assert.equal(formatPrice(-42.5), "-₹42.50");
});

test("formatPrice honours the quote currency", () => {
  assert.equal(formatPrice(99.99, "USD"), "$99.99");
});

test("formatPrice renders a plain number when the currency is unknown (B26)", () => {
  assert.equal(formatPrice(2500, null), "2,500.00");
  assert.equal(formatPrice(2500, undefined), "₹2,500.00");
});

test("formatMoney is the canonical formatter: 0 decimals by default, 2 for prices", () => {
  assert.equal(formatMoney(1234567.89), "₹12,34,568");
  assert.equal(formatMoney(99.99, "USD"), "$100");
  assert.equal(formatMoney(99.99, "USD", 2), "$99.99");
  assert.equal(formatPrice(1234567.89), "₹12,34,567.89");
});

test("todayIst returns the IST date, not the UTC date", () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  assert.equal(todayIst(), `${get("year")}-${get("month")}-${get("day")}`);
  assert.match(todayIst(), /^\d{4}-\d{2}-\d{2}$/);
});

test("totalsByCurrency never adds across currencies", () => {
  const holdings = [
    {
      currency: "INR",
      priced: true,
      currentValue: 26002.5,
      investedValue: 24505,
      gainLoss: 1497.5,
    },
    {
      currency: "USD",
      priced: true,
      currentValue: 500,
      investedValue: 400,
      gainLoss: 100,
    },
    {
      currency: "INR",
      priced: false,
      currentValue: null,
      investedValue: 100,
      gainLoss: null,
    },
  ];
  assert.deepEqual(totalsByCurrency(holdings), [
    {
      currency: "INR",
      totalValue: 26002.5,
      totalInvested: 24505,
      totalGainLoss: 1497.5,
      totalGainLossPercent: 6.11,
    },
    {
      currency: "USD",
      totalValue: 500,
      totalInvested: 400,
      totalGainLoss: 100,
      totalGainLossPercent: 25,
    },
  ]);
  assert.deepEqual(totalsByCurrency([]), []);
});

test("formatCompact shortens large values and leaves small ones alone", () => {
  assert.equal(formatCompact(2500000), "₹25L");
  assert.equal(formatCompact(999), "₹999");
});

test("formatPercent signs positive values and never signs zero", () => {
  assert.equal(formatPercent(2.5), "+2.50%");
  assert.equal(formatPercent(-1.25), "-1.25%");
  assert.equal(formatPercent(0), "0.00%");
  assert.equal(formatPercent(2.5, false), "2.50%");
});

test("formatFetchedAt reports unknown timestamps honestly", () => {
  assert.equal(formatFetchedAt(null), "Unknown");
  assert.equal(formatFetchedAt("not-a-date"), "Unknown");
});

test("formatFetchedAt shows the date and time in IST", () => {
  const formatted = formatFetchedAt("2026-11-23T10:30:00.000Z");
  assert.equal(formatted, "23 Nov 2026, 4:00 pm IST");
});

test("history ranges cover one month to five years", () => {
  assert.deepEqual(
    historyRanges.map(({ value }) => value),
    ["1mo", "3mo", "6mo", "1y", "5y"],
  );
});

const pricedHolding = {
  id: "h1",
  symbol: "RELIANCE",
  name: "Reliance Industries",
  sector: "Energy",
  quantity: 10,
  buyPrice: 2400,
  buyDate: "2025-01-15",
  currentPrice: 2900,
  currentValue: 29000,
  investedValue: 24000,
  gainLoss: 5000,
  gainLossPercent: 20.83,
  fetchedAt: "2026-11-23T10:00:00.000Z",
  stale: false,
  priced: true,
};

const unpricedHolding = {
  ...pricedHolding,
  id: "h2",
  symbol: "UNKNOWN",
  buyDate: "2024-06-01",
  currentPrice: null,
  currentValue: null,
  gainLoss: null,
  gainLossPercent: null,
  fetchedAt: null,
  priced: false,
};

test("portfolioCashFlows books the buy as an outflow and the current value as an inflow", () => {
  assert.deepEqual(portfolioCashFlows([pricedHolding], "2026-11-23"), [
    { amount: -24000, date: "2025-01-15" },
    { amount: 29000, date: "2026-11-23" },
  ]);
});

test("portfolioCashFlows excludes unpriced holdings instead of guessing a value", () => {
  assert.deepEqual(portfolioCashFlows([unpricedHolding], "2026-11-23"), []);
  assert.equal(
    portfolioCashFlows([pricedHolding, unpricedHolding], "2026-11-23").length,
    2,
  );
});

test("earliestBuyDate takes the earliest priced buy and ignores unpriced holdings", () => {
  assert.equal(earliestBuyDate([pricedHolding, unpricedHolding]), "2025-01-15");
  assert.equal(earliestBuyDate([unpricedHolding]), null);
  assert.equal(earliestBuyDate([]), null);
});
