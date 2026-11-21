/* FinVerse sample UI — shared demo data.
   All figures are realistic Indian demo data (₹, NSE).
   No real user data, no live prices. */

(function () {
  "use strict";

  /* Deterministic pseudo-random walk so charts look real but stable. */
  function seededSeries(seed, points, start, drift, vol) {
    let s = seed;
    const rand = () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
    const out = [];
    let v = start;
    for (let i = 0; i < points; i++) {
      v = v * (1 + drift + (rand() - 0.48) * vol);
      out.push(Math.round(v * 100) / 100);
    }
    return out;
  }

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

  /* 15 NSE large-caps — screener universe (matches the real app's universe). */
  const STOCKS = [
    { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", price: 2987.40, change: 1.84, pe: 28.4, rsi: 61.2, marketCapCrore: 2021450, sma20: 2912.10, sma50: 2845.60, beta: 1.12, divYield: 0.34, high52: 3210.00, low52: 2440.15, seed: 11 },
    { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", price: 4215.75, change: -0.62, pe: 30.1, rsi: 47.8, marketCapCrore: 1524870, sma20: 4240.30, sma50: 4188.90, beta: 0.98, divYield: 1.42, high52: 4585.00, low52: 3810.40, seed: 23 },
    { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", price: 1742.30, change: 0.95, pe: 19.8, rsi: 55.4, marketCapCrore: 1332900, sma20: 1718.40, sma50: 1690.20, beta: 1.05, divYield: 1.10, high52: 1880.00, low52: 1520.75, seed: 37 },
    { symbol: "INFY", name: "Infosys", sector: "IT", price: 1876.55, change: 2.31, pe: 26.7, rsi: 66.9, marketCapCrore: 779400, sma20: 1831.20, sma50: 1790.45, beta: 1.08, divYield: 2.41, high52: 1980.00, low52: 1440.30, seed: 41 },
    { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking", price: 1289.60, change: 0.44, pe: 18.2, rsi: 58.1, marketCapCrore: 910300, sma20: 1271.80, sma50: 1244.10, beta: 1.10, divYield: 0.78, high52: 1365.00, low52: 1050.20, seed: 53 },
    { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG", price: 2541.20, change: -1.12, pe: 52.3, rsi: 38.6, marketCapCrore: 597200, sma20: 2588.40, sma50: 2620.75, beta: 0.72, divYield: 1.85, high52: 2890.00, low52: 2310.50, seed: 67 },
    { symbol: "SBIN", name: "State Bank of India", sector: "Banking", price: 842.15, change: 1.27, pe: 11.4, rsi: 63.5, marketCapCrore: 751600, sma20: 824.60, sma50: 798.30, beta: 1.18, divYield: 1.64, high52: 912.00, low52: 680.40, seed: 71 },
    { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", price: 1698.80, change: 0.73, pe: 41.2, rsi: 59.7, marketCapCrore: 969800, sma20: 1672.50, sma50: 1610.90, beta: 0.94, divYield: 0.47, high52: 1780.00, low52: 1240.60, seed: 83 },
    { symbol: "ITC", name: "ITC", sector: "FMCG", price: 486.35, change: -0.38, pe: 27.9, rsi: 44.2, marketCapCrore: 608100, sma20: 491.20, sma50: 498.60, beta: 0.81, divYield: 3.02, high52: 545.00, low52: 412.30, seed: 97 },
    { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking", price: 1912.45, change: -0.85, pe: 24.6, rsi: 41.5, marketCapCrore: 380200, sma20: 1940.10, sma50: 1966.80, beta: 1.02, divYield: 0.10, high52: 2120.00, low52: 1680.25, seed: 101 },
    { symbol: "LT", name: "Larsen & Toubro", sector: "Infrastructure", price: 3765.90, change: 1.56, pe: 32.8, rsi: 68.4, marketCapCrore: 517400, sma20: 3688.20, sma50: 3590.75, beta: 1.15, divYield: 0.90, high52: 3950.00, low52: 2950.80, seed: 113 },
    { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", price: 978.25, change: 3.02, pe: 22.1, rsi: 71.8, marketCapCrore: 360100, sma20: 942.30, sma50: 905.40, beta: 1.32, divYield: 0.31, high52: 1050.00, low52: 690.15, seed: 127 },
    { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Pharma", price: 1842.70, change: 0.21, pe: 36.5, rsi: 52.3, marketCapCrore: 442100, sma20: 1828.90, sma50: 1801.20, beta: 0.88, divYield: 0.86, high52: 1965.00, low52: 1480.60, seed: 131 },
    { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto", price: 12845.00, change: -0.54, pe: 29.4, rsi: 49.1, marketCapCrore: 404600, sma20: 12910.50, sma50: 12780.20, beta: 0.96, divYield: 1.05, high52: 13620.00, low52: 10450.00, seed: 137 },
    { symbol: "TITAN", name: "Titan Company", sector: "Consumer", price: 3421.60, change: 1.05, pe: 68.2, rsi: 57.9, marketCapCrore: 303700, sma20: 3366.40, sma50: 3290.10, beta: 1.04, divYield: 0.29, high52: 3680.00, low52: 2890.45, seed: 149 },
  ];

  STOCKS.forEach(function (s) {
    s.trend = s.sma20 > s.sma50 ? (s.price > s.sma20 ? "above-sma20" : "below-sma20") : (s.price > s.sma20 ? "above-sma20" : "below-sma20");
    s.trendLabel = s.price > s.sma20 ? "Above SMA-20" : "Below SMA-20";
    s.goldenCross = s.sma20 > s.sma50;
    s.history = seededSeries(s.seed, 60, s.price * 0.88, 0.0022, 0.016);
    s.history[59] = s.price;
    s.macd = Math.round((s.rsi - 50) * 0.42 * 10) / 10;
    s.ema20 = Math.round(s.sma20 * 1.004 * 100) / 100;
  });

  const HOLDINGS = [
    { symbol: "RELIANCE", qty: 42, avgCost: 2412.60 },
    { symbol: "TCS", qty: 18, avgCost: 3890.10 },
    { symbol: "HDFCBANK", qty: 85, avgCost: 1587.25 },
    { symbol: "INFY", qty: 60, avgCost: 1620.40 },
    { symbol: "SBIN", qty: 150, avgCost: 712.80 },
    { symbol: "TATAMOTORS", qty: 120, avgCost: 845.50 },
  ];

  const WATCHLIST = [
    { symbol: "LT", note: "Watching for a breakout above ₹3,800", alertAbove: 3800, alertBelow: null },
    { symbol: "BHARTIARTL", note: "ARPU growth story; add on dips", alertAbove: null, alertBelow: 1600 },
    { symbol: "TITAN", note: "Festive-season jewellery demand", alertAbove: 3600, alertBelow: null },
    { symbol: "SUNPHARMA", note: "US FDA outcome pending", alertAbove: null, alertBelow: 1750 },
    { symbol: "ITC", note: "Dividend yield above 3% — long-term hold candidate", alertAbove: null, alertBelow: 460 },
  ];

  const NEWS = [
    { id: 1, symbol: "RELIANCE", headline: "Reliance Jio adds 3.1 million subscribers in October, ARPU rises to ₹208", publisher: "Moneycontrol", time: "2 hours ago", sentiment: "positive", score: 0.72, summary: "Jio's subscriber additions beat street estimates, and average revenue per user climbed for the fifth straight quarter as tariff hikes flow through." },
    { id: 2, symbol: "TCS", headline: "TCS wins $1.2 billion multi-year deal with a European bank", publisher: "Economic Times", time: "4 hours ago", sentiment: "positive", score: 0.68, summary: "The deal is one of TCS's largest in the BFSI vertical this year and supports the company's deal-win momentum into the December quarter." },
    { id: 3, symbol: "TATAMOTORS", headline: "Tata Motors October sales jump 18% on strong SUV demand", publisher: "Business Standard", time: "5 hours ago", sentiment: "positive", score: 0.81, summary: "Domestic passenger-vehicle sales rose 18% year on year, led by the Nexon and Punch, while commercial vehicles grew 9%." },
    { id: 4, symbol: "HINDUNILVR", headline: "HUL warns of soft rural demand; volumes grow just 1% in Q2", publisher: "Livemint", time: "7 hours ago", sentiment: "negative", score: -0.54, summary: "Management flagged weak rural consumption and palm-oil cost pressure, guiding to a gradual rather than sharp recovery." },
    { id: 5, symbol: "INFY", headline: "Infosys raises FY27 revenue guidance after strong large-deal wins", publisher: "Reuters", time: "9 hours ago", sentiment: "positive", score: 0.77, summary: "Infosys lifted its constant-currency revenue growth guidance to 4–5% and reported $3.1 billion in large deals for the quarter." },
    { id: 6, symbol: "SBIN", headline: "SBI Q2 profit rises 9% as credit growth stays strong", publisher: "NDTV Profit", time: "12 hours ago", sentiment: "positive", score: 0.61, summary: "Net profit beat estimates on 14% loan growth; asset quality improved with gross NPAs falling to 2.1%." },
    { id: 7, symbol: "KOTAKBANK", headline: "Kotak Mahindra Bank's deposit growth lags peers, says RBI data", publisher: "Economic Times", time: "1 day ago", sentiment: "negative", score: -0.38, summary: "Deposit growth of 11% trailed the system average of 13.5%, raising questions about funding costs in the second half." },
    { id: 8, symbol: "ITC", headline: "ITC Hotels demerger on track; listing expected next quarter", publisher: "Moneycontrol", time: "1 day ago", sentiment: "neutral", score: 0.08, summary: "The demerger timetable is unchanged. Analysts expect the hotels business to list at a modest premium to its implied value." },
    { id: 9, symbol: "MARUTI", headline: "Maruti Suzuki exports hit a record 3.2 lakh units in April–October", publisher: "Business Standard", time: "1 day ago", sentiment: "positive", score: 0.58, summary: "Exports grew 21% year on year, helped by new models shipped to Latin America and Africa." },
    { id: 10, symbol: "HDFCBANK", headline: "HDFC Bank cuts deposit rates by 25 bps across select tenures", publisher: "Livemint", time: "2 days ago", sentiment: "neutral", score: -0.05, summary: "The rate cut follows the RBI's easing cycle and is expected to support net interest margins over the next two quarters." },
  ];

  const REGIME = {
    current: "Bull — low volatility",
    confidence: 0.78,
    updated: "21 Nov 2026, 09:15 IST",
    signals: [
      { name: "Nifty 50 vs 200-day average", value: "+6.4% above", verdict: "Bullish", detail: "The index has traded above its 200-day moving average for 84 consecutive sessions." },
      { name: "India VIX", value: "12.8", verdict: "Calm", detail: "Volatility is in its lowest quartile of the past year — options markets expect a quiet month." },
      { name: "Market breadth", value: "68% advancing", verdict: "Healthy", detail: "Nearly seven in ten NSE stocks are above their 50-day average; the rally is broad, not narrow." },
      { name: "FII flows (30 days)", value: "+₹18,400 cr", verdict: "Supportive", detail: "Foreign investors have been net buyers for four straight weeks, led by financials and IT." },
      { name: "Rupee vs USD", value: "₹88.42", verdict: "Stable", detail: "The rupee has traded in a narrow 88.1–88.7 band for a month; no stress signal." },
      { name: "10-year G-Sec yield", value: "6.72%", verdict: "Neutral", detail: "Yields are steady after the RBI's pause; no crowding-out pressure on equities." },
    ],
    history: [
      { period: "Jun 2026", regime: "Sideways — high volatility", note: "Election-result uncertainty kept the index range-bound." },
      { period: "Jul 2026", regime: "Bull — low volatility", note: "Rate-cut hopes and strong Q1 earnings lifted the market." },
      { period: "Aug 2026", regime: "Bull — low volatility", note: "FII inflows resumed; breadth improved." },
      { period: "Sep 2026", regime: "Bull — rising volatility", note: "Global oil spike raised the VIX briefly above 16." },
      { period: "Oct 2026", regime: "Bull — low volatility", note: "Festive demand and Q2 earnings beat estimates." },
      { period: "Nov 2026", regime: "Bull — low volatility", note: "Current regime — broad, calm uptrend." },
    ],
  };

  const READINESS = {
    score: 72,
    verdict: "Ready to invest — with care",
    factors: [
      { name: "Emergency fund", weight: 25, score: 88, detail: "₹1,26,400 saved — 4.2 months of expenses. Target is 6 months (₹1,80,000)." },
      { name: "Monthly surplus", weight: 20, score: 82, detail: "₹18,400 available in November after all bills and savings — about 31% of income." },
      { name: "Debt load", weight: 15, score: 90, detail: "No outstanding loans. Credit-card balance of ₹8,450 is paid in full each month." },
      { name: "Goal funding", weight: 15, score: 64, detail: "Japan trip is 41% funded with 11 months to go — on track, but tight." },
      { name: "Portfolio diversification", weight: 15, score: 58, detail: "6 holdings across 4 sectors. Banking is 34% of the portfolio — above the 25% comfort level." },
      { name: "Market regime", weight: 10, score: 74, detail: "Bull — low volatility regime supports steady investing, not lump-sum timing." },
    ],
    suggestion: "Your finances can support investing ₹12,000–₹15,000 a month. Keep the Nifty 50 SIP at ₹10,000, add ₹3,000–₹5,000 to a flexi-cap fund, and bring the emergency fund to 6 months before increasing equity exposure.",
  };

  const OPTIMIZER = {
    currentSharpe: 1.42,
    optimalSharpe: 1.86,
    frontier: [
      { risk: 8.2, ret: 9.1 }, { risk: 9.6, ret: 11.4 }, { risk: 11.1, ret: 13.2 },
      { risk: 12.8, ret: 14.6 }, { risk: 14.5, ret: 15.7 }, { risk: 16.4, ret: 16.5 },
      { risk: 18.6, ret: 17.1 }, { risk: 21.2, ret: 17.5 },
    ],
    current: { risk: 15.9, ret: 15.2 },
    optimal: { risk: 12.8, ret: 14.6 },
    allocation: [
      { symbol: "RELIANCE", current: 22, optimal: 18 },
      { symbol: "TCS", current: 14, optimal: 12 },
      { symbol: "HDFCBANK", current: 26, optimal: 20 },
      { symbol: "INFY", current: 19, optimal: 22 },
      { symbol: "SBIN", current: 8, optimal: 10 },
      { symbol: "TATAMOTORS", current: 11, optimal: 8 },
      { symbol: "NIFTYBEES (ETF)", current: 0, optimal: 10 },
    ],
  };

  const SECTORS = ["Banking", "IT", "Energy", "FMCG", "Auto", "Pharma", "Telecom", "Infrastructure", "Consumer"];

  window.FV_DATA = {
    MONTHS, BUDGETS, TRANSACTIONS, CATEGORIES, BILLS, GOALS,
    STOCKS, HOLDINGS, WATCHLIST, NEWS, REGIME, READINESS, OPTIMIZER, SECTORS,
    stockBySymbol: function (sym) {
      return STOCKS.find(function (s) { return s.symbol === sym; });
    },
  };
})();
