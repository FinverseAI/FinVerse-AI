/* FinVerse sample UI — shared demo data.
   All figures are realistic Indian demo data (₹, NSE).
   No real user data, no live prices. */

(function () {
  "use strict";

  /* Deterministic pseudo-random walk so charts look real but stable. */
  const MONTHS = {
    "2026-09": {
      key: "2026-09", label: "September 2026", short: "Sep 2026",
      income: 60000, available: 14200,
      categories: [
        { name: "Rent", amount: 21000, color: "#0b3b2c" },
        { name: "Food", amount: 9200, color: "#2e7d5b" },
        { name: "Transport", amount: 3800, color: "#7fb392" },
        { name: "Savings", amount: 11000, color: "#a9cbb2" },
        { name: "Other", amount: 6800, color: "#d9a441" },
      ],
      daily: [420, 610, 300, 890, 540, 720, 380, 1150, 640, 480, 920, 350, 780, 1290, 560, 430, 860, 690, 410, 980, 520, 640, 1120, 470, 830, 390, 700, 540, 960, 610],
      spent: 45800,
    },
    "2026-10": {
      key: "2026-10", label: "October 2026", short: "Oct 2026",
      income: 60000, available: 16900,
      categories: [
        { name: "Rent", amount: 21000, color: "#0b3b2c" },
        { name: "Food", amount: 8400, color: "#2e7d5b" },
        { name: "Transport", amount: 4600, color: "#7fb392" },
        { name: "Savings", amount: 11500, color: "#a9cbb2" },
        { name: "Other", amount: 5600, color: "#d9a441" },
      ],
      daily: [380, 720, 450, 640, 910, 330, 580, 1240, 470, 690, 820, 390, 560, 1010, 640, 480, 750, 390, 880, 520, 670, 1180, 430, 760, 590, 340, 940, 610, 480, 720, 850],
      spent: 43100,
    },
    "2026-11": {
      key: "2026-11", label: "November 2026", short: "Nov 2026",
      income: 60000, available: 18400,
      categories: [
        { name: "Rent", amount: 21000, color: "#0b3b2c" },
        { name: "Food", amount: 8600, color: "#2e7d5b" },
        { name: "Transport", amount: 4200, color: "#7fb392" },
        { name: "Savings", amount: 12000, color: "#a9cbb2" },
      ],
      daily: [450, 680, 390, 920, 510, 760, 420, 1180, 590, 640, 870, 360, 730, 1340, 580, 470, 810, 660, 390, 1020, 540],
      spent: 41600,
    },
  };

  const BUDGETS = [
    { category: "Rent", budget: 21000, spent: 21000, icon: "⌂" },
    { category: "Food", budget: 10000, spent: 8600, icon: "◉" },
    { category: "Transport", budget: 5000, spent: 4200, icon: "➤" },
    { category: "Shopping", budget: 6000, spent: 5400, icon: "▣" },
    { category: "Entertainment", budget: 4000, spent: 2900, icon: "♪" },
    { category: "Health", budget: 3000, spent: 1200, icon: "+" },
    { category: "Savings", budget: 12000, spent: 12000, icon: "⬢" },
  ];

  const TRANSACTIONS = [
    { id: 1, date: "2026-11-20", merchant: "BigBasket", category: "Food", amount: -1240, type: "expense", note: "Weekly groceries" },
    { id: 2, date: "2026-11-19", merchant: "Salary — Acme Technologies", category: "Income", amount: 60000, type: "income", note: "November salary" },
    { id: 3, date: "2026-11-18", merchant: "Uber", category: "Transport", amount: -340, type: "expense", note: "Ride to office" },
    { id: 4, date: "2026-11-17", merchant: "Swiggy", category: "Food", amount: -486, type: "expense", note: "Dinner" },
    { id: 5, date: "2026-11-16", merchant: "Landlord — R. Sharma", category: "Rent", amount: -21000, type: "expense", note: "November rent" },
    { id: 6, date: "2026-11-15", merchant: "Jio Prepaid", category: "Bills", amount: -399, type: "expense", note: "Mobile recharge" },
    { id: 7, date: "2026-11-14", merchant: "Decathlon", category: "Shopping", amount: -2499, type: "expense", note: "Running shoes" },
    { id: 8, date: "2026-11-13", merchant: "SIP — Nifty 50 Index Fund", category: "Savings", amount: -10000, type: "expense", note: "Monthly SIP" },
    { id: 9, date: "2026-11-12", merchant: "PVR Cinemas", category: "Entertainment", amount: -650, type: "expense", note: "Movie tickets" },
    { id: 10, date: "2026-11-11", merchant: "Apollo Pharmacy", category: "Health", amount: -820, type: "expense", note: "Vitamins" },
    { id: 11, date: "2026-11-10", merchant: "UPCL Electricity", category: "Bills", amount: -1200, type: "expense", note: "October bill" },
    { id: 12, date: "2026-11-09", merchant: "Zomato", category: "Food", amount: -612, type: "expense", note: "Lunch with friends" },
    { id: 13, date: "2026-11-08", merchant: "Metro Card Top-up", category: "Transport", amount: -1000, type: "expense", note: "" },
    { id: 14, date: "2026-11-07", merchant: "Freelance — Logo Design", category: "Income", amount: 4500, type: "income", note: "Side project" },
    { id: 15, date: "2026-11-06", merchant: "Amazon", category: "Shopping", amount: -1879, type: "expense", note: "Desk lamp" },
    { id: 16, date: "2026-11-05", merchant: "Cult.fit", category: "Health", amount: -1500, type: "expense", note: "Monthly membership" },
    { id: 17, date: "2026-11-04", merchant: "IRCTC", category: "Transport", amount: -1145, type: "expense", note: "Dehradun–Delhi train" },
    { id: 18, date: "2026-11-03", merchant: "Starbucks", category: "Food", amount: -540, type: "expense", note: "Coffee" },
    { id: 19, date: "2026-11-02", merchant: "Netflix", category: "Entertainment", amount: -649, type: "expense", note: "Monthly plan" },
    { id: 20, date: "2026-11-01", merchant: "Emergency Fund", category: "Savings", amount: -2000, type: "expense", note: "Auto-transfer" },
    { id: 21, date: "2026-10-30", merchant: "Blinkit", category: "Food", amount: -732, type: "expense", note: "Groceries" },
    { id: 22, date: "2026-10-28", merchant: "Ola", category: "Transport", amount: -412, type: "expense", note: "Airport ride" },
    { id: 23, date: "2026-10-26", merchant: "BookMyShow", category: "Entertainment", amount: -900, type: "expense", note: "Concert tickets" },
    { id: 24, date: "2026-10-24", merchant: "Myntra", category: "Shopping", amount: -3299, type: "expense", note: "Winter jacket" },
  ];

  const CATEGORIES = ["Food", "Transport", "Rent", "Bills", "Shopping", "Entertainment", "Health", "Savings", "Income", "Other"];

  const BILLS = [
    { id: 1, name: "Rent", payee: "R. Sharma (Landlord)", amount: 21000, due: "2026-11-05", dueLabel: "Nov 5", status: "paid", icon: "⌂" },
    { id: 2, name: "Electricity", payee: "UPCL", amount: 1200, due: "2026-11-10", dueLabel: "Nov 10", status: "paid", icon: "⚡" },
    { id: 3, name: "Mobile", payee: "Jio Prepaid", amount: 399, due: "2026-11-15", dueLabel: "Nov 15", status: "paid", icon: "▭" },
    { id: 4, name: "Internet", payee: "Airtel Fiber", amount: 999, due: "2026-11-22", dueLabel: "Nov 22", status: "upcoming", icon: "≋" },
    { id: 5, name: "Credit Card", payee: "HDFC Bank", amount: 8450, due: "2026-11-25", dueLabel: "Nov 25", status: "upcoming", icon: "▭" },
    { id: 6, name: "SIP — Nifty 50 Index", payee: "Groww", amount: 10000, due: "2026-12-01", dueLabel: "Dec 1", status: "upcoming", icon: "⬢" },
    { id: 7, name: "Health Insurance", payee: "Star Health", amount: 1850, due: "2026-12-03", dueLabel: "Dec 3", status: "upcoming", icon: "+" },
  ];

  const GOALS = [
    { id: 1, name: "Emergency fund", target: 180000, saved: 126400, deadline: "Jun 2027", icon: "⬢" },
    { id: 2, name: "Japan trip", target: 240000, saved: 98400, deadline: "Oct 2027", icon: "✈" },
    { id: 3, name: "New laptop", target: 95000, saved: 61200, deadline: "Mar 2027", icon: "▭" },
    { id: 4, name: "Home down payment", target: 1500000, saved: 342000, deadline: "Dec 2029", icon: "⌂" },
  ];

  // Investment records start empty until supplied by the user or a data source.
  const STOCKS = [];
  const HOLDINGS = [];
  const WATCHLIST = [];
  const NEWS = [];
  const REGIME = null;
  const READINESS = null;
  const OPTIMIZER = null;
  const SECTORS = [];

  window.FV_DATA = {
    MONTHS, BUDGETS, TRANSACTIONS, CATEGORIES, BILLS, GOALS,
    STOCKS, HOLDINGS, WATCHLIST, NEWS, REGIME, READINESS, OPTIMIZER, SECTORS,
    stockBySymbol: function (sym) {
      return STOCKS.find(function (s) { return s.symbol === sym; });
    },
  };
})();
