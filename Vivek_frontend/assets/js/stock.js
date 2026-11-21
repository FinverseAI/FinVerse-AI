/* FinVerse sample UI — stock detail page.
   Reads ?symbol= (default RELIANCE). Switching stocks updates the
   header, chart, indicators and AI explanation, and rewrites the URL. */

(function () {
  "use strict";

  var currentSymbol = "RELIANCE";
  var range = "3M";
  var priceChart = null;

  /* Date labels ending on the demo "today" (21 Nov 2026). */
  function dateLabels(n) {
    var labels = [];
    var end = new Date(2026, 10, 21);
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(end);
      d.setDate(end.getDate() - i);
      labels.push(d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }));
    }
    return labels;
  }

  function buildExplanation(s) {
    var parts = [];
    var aboveSma = s.price > s.sma20;
    parts.push(s.name + " is trading at " + FV.fmtINR(s.price, 2) + ", " +
      (aboveSma ? "above" : "below") + " its 20-day moving average of " +
      FV.fmtINR(s.sma20, 2) + " — so short-term momentum is " +
      (aboveSma ? "pointing up" : "soft for now") + ".");

    var rsiNote;
    if (s.rsi > 70) {
      rsiNote = "Its RSI of " + FV.fmtNum(s.rsi, 1) + " is above 70, in overbought territory — " +
        "the stock has run up fast and short-term pullbacks are common from here.";
    } else if (s.rsi < 30) {
      rsiNote = "Its RSI of " + FV.fmtNum(s.rsi, 1) + " is below 30, in oversold territory — " +
        "selling has been heavy and the stock may be due a breather.";
    } else {
      rsiNote = "Its RSI of " + FV.fmtNum(s.rsi, 1) + " sits in the neutral 30–70 band — " +
        "neither overbought nor oversold, so momentum is not stretched either way.";
    }
    parts.push(rsiNote);

    parts.push("At a P/E of " + FV.fmtNum(s.pe, 1) + ", the stock trades " +
      (s.pe > 25 ? "above" : "below") + " the 25× yardstick FinVerse uses as a rough " +
      "large-cap average — " + (s.pe > 25
        ? "investors are paying a premium for its earnings."
        : "its earnings come comparatively cheap versus that average."));

    parts.push(s.goldenCross
      ? "The 20-day average sits above the 50-day average — a golden cross, " +
        "which trend-followers read as a medium-term uptrend signal."
      : "The 20-day average sits below the 50-day average — a death cross, " +
        "which trend-followers read as a medium-term downtrend signal.");

    return parts.join(" ");
  }

  function renderIndicators(s) {
    var items = [
      { label: "SMA-20", value: FV.fmtINR(s.sma20, 2) },
      { label: "SMA-50", value: FV.fmtINR(s.sma50, 2) },
      { label: "EMA-20", value: FV.fmtINR(s.ema20, 2) },
      { label: "RSI (14-day)", value: FV.fmtNum(s.rsi, 1) },
      { label: "MACD", value: FV.fmtSigned(s.macd, "") },
      { label: "P/E ratio", value: FV.fmtNum(s.pe, 1) },
      { label: "Beta", value: FV.fmtNum(s.beta, 2) },
      { label: "Dividend yield", value: FV.fmtNum(s.divYield, 2) + "%" },
      { label: "52-week high", value: FV.fmtINR(s.high52, 2) },
      { label: "52-week low", value: FV.fmtINR(s.low52, 2) },
      { label: "Market cap", value: FV.fmtCrore(s.marketCapCrore) },
      { label: "Trend", value: s.trendLabel + (s.goldenCross ? " · Golden cross" : " · Death cross") },
    ];
    document.getElementById("indicators-grid").innerHTML = items.map(function (it) {
      return '<div class="stat-card"><div><div class="stat-label">' + it.label +
        '</div><div class="stat-value" style="font-size:1.25rem">' + it.value + "</div></div></div>";
    }).join("");
  }

  function renderChart(s) {
    FV.chartDefaults();
    var points = range === "1M" ? 30 : 60;
    var data = s.history.slice(-points);
    var labels = dateLabels(60).slice(-points);
    var up = s.change >= 0;
    var color = up ? "#1b7a4d" : "#b3402e";
    if (priceChart) priceChart.destroy();
    priceChart = new Chart(document.getElementById("price-chart"), {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: s.symbol,
          data: data,
          borderColor: color,
          backgroundColor: up ? "rgba(27, 122, 77, 0.08)" : "rgba(179, 64, 46, 0.08)",
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return " " + s.symbol + ": " + FV.fmtINR(ctx.parsed.y, 2); },
            },
          },
        },
        scales: {
          x: { ticks: { maxTicksLimit: 8 } },
          y: {
            ticks: {
              callback: function (v) { return "₹" + FV.fmtNum(v, 0); },
            },
          },
        },
      },
    });
    document.getElementById("price-sub").textContent =
      "Closing prices, last " + (range === "1M" ? "30 days" : "60 days") + ".";
  }

  function render(s) {
    document.title = s.symbol + " · FinVerse";
    document.getElementById("stock-name").textContent = s.name;
    document.getElementById("stock-sector").textContent = s.sector;
    document.getElementById("stock-symbol-line").textContent = "NSE: " + s.symbol;
    document.getElementById("stock-price").textContent = FV.fmtINR(s.price, 2);

    var badge = document.getElementById("stock-change-badge");
    badge.textContent = FV.fmtSigned(s.change);
    badge.className = "badge " + (s.change >= 0 ? "badge-up" : "badge-down");
    document.getElementById("stock-trend-sub").textContent =
      s.trendLabel + (s.goldenCross ? " · Golden cross" : " · Death cross");

    var pct = Math.round(((s.price - s.low52) / (s.high52 - s.low52)) * 100);
    document.getElementById("stock-range-text").textContent =
      FV.fmtINR(s.low52, 2) + " – " + FV.fmtINR(s.high52, 2);
    document.getElementById("stock-range-bar").style.width = pct + "%";
    document.getElementById("stock-range-low").textContent = FV.fmtINR(s.low52, 2);
    document.getElementById("stock-range-high").textContent = FV.fmtINR(s.high52, 2);
    document.getElementById("stock-range-pos").textContent =
      "Price sits " + pct + "% up the range";

    document.getElementById("why-moved-link").href =
      "why-moved.html?symbol=" + encodeURIComponent(s.symbol);
    document.getElementById("ask-ai-link").href =
      "ai-chat.html?stock=" + encodeURIComponent(s.symbol);

    document.querySelectorAll("#stock-switch button").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-symbol") === s.symbol);
    });
    document.getElementById("stock-select").value = s.symbol;

    renderChart(s);
    renderIndicators(s);

    document.getElementById("ai-explanation").textContent = buildExplanation(s);
    document.getElementById("ai-citations").innerHTML = [
      "Price " + FV.fmtINR(s.price, 2) + " vs SMA-20 " + FV.fmtINR(s.sma20, 2) +
        " and SMA-50 " + FV.fmtINR(s.sma50, 2) + " — FinVerse market data, 21 Nov 2026",
      "RSI (14-day) " + FV.fmtNum(s.rsi, 1) + " · MACD " + FV.fmtSigned(s.macd, "") +
        " — FinVerse market data, 21 Nov 2026",
      "P/E " + FV.fmtNum(s.pe, 1) + " · Market cap " + FV.fmtCrore(s.marketCapCrore) +
        " · 52-week range " + FV.fmtINR(s.low52, 2) + " – " + FV.fmtINR(s.high52, 2) +
        " — FinVerse market data, 21 Nov 2026",
    ].map(function (c) { return "<li>" + c + "</li>"; }).join("");
  }

  function loadSymbol(sym) {
    var s = FV_DATA.stockBySymbol(sym);
    if (!s) {
      FV.toast("Unknown symbol “" + sym + "” — showing RELIANCE instead.");
      s = FV_DATA.stockBySymbol("RELIANCE");
    }
    currentSymbol = s.symbol;
    try {
      window.history.replaceState(null, "", "stock.html?symbol=" + encodeURIComponent(s.symbol));
    } catch (e) { /* file:// or sandboxed — URL update is best-effort */ }
    render(s);
  }

  function init() {
    var select = document.getElementById("stock-select");
    FV_DATA.STOCKS.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.symbol;
      opt.textContent = s.symbol + " — " + s.name;
      select.appendChild(opt);
    });

    var start = FV.getParam("symbol") || "RELIANCE";
    loadSymbol(start);

    document.querySelectorAll("#stock-switch button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        loadSymbol(btn.getAttribute("data-symbol"));
      });
    });
    select.addEventListener("change", function () { loadSymbol(select.value); });

    document.querySelectorAll("#range-switch button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        range = btn.getAttribute("data-range");
        document.querySelectorAll("#range-switch button").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        renderChart(FV_DATA.stockBySymbol(currentSymbol));
      });
    });

    document.getElementById("add-watchlist-btn").addEventListener("click", function () {
      FV.toast(currentSymbol + " added to your watchlist.");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
