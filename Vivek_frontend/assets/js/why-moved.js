/* FinVerse sample UI — Why Did My Stock Move? page (concept preview).
   Five-step chain of thought, built from FV_DATA and revealed on demand. */

(function () {
  "use strict";

  var FUNDAMENTALS = {
    RELIANCE: "Reliance's retail and Jio arms keep growing — Jio added 3.1 million subscribers in October with ARPU up to ₹208 — so the earnings story supports the move.",
    TCS: "TCS just won a $1.2 billion multi-year deal with a European bank, but IT spending stays cautious, so the market is pricing the win against a soft demand backdrop.",
    INFY: "Infosys raised its FY27 revenue guidance to 4–5% after $3.1 billion of large-deal wins, giving the market a concrete reason to re-rate the stock.",
    TATAMOTORS: "October sales jumped 18% on strong SUV demand, and the commercial-vehicle cycle is turning — the kind of operating beat that moves an auto stock quickly.",
    HINDUNILVR: "HUL's Q2 volumes grew just 1% with soft rural demand and palm-oil cost pressure, so the market is marking down near-term earnings expectations.",
  };

  var runBtn = null;
  var timers = [];

  function clearTimers() {
    timers.forEach(function (t) { clearTimeout(t); });
    timers = [];
  }

  function updateMoveSummary(symbol) {
    var s = FV_DATA.stockBySymbol(symbol);
    if (!s) return;
    document.getElementById("move-price").textContent = FV.fmtINR(s.price, 2);
    var changeEl = document.getElementById("move-change");
    changeEl.textContent = FV.fmtSigned(s.change);
    changeEl.className = "stat-value " + (s.change >= 0 ? "up" : "down");
    changeEl.style.fontSize = "1.4rem";
    var lo = Math.min.apply(null, s.history);
    var hi = Math.max.apply(null, s.history);
    document.getElementById("move-range").textContent =
      FV.fmtINR(lo, 2) + " – " + FV.fmtINR(hi, 2);
  }

  function buildSteps(symbol) {
    var s = FV_DATA.stockBySymbol(symbol);
    var dir = s.change >= 0 ? "rose" : "fell";
    var hist = s.history;
    var start = hist[0];
    var gain60 = ((s.price - start) / start) * 100;

    var news = FV_DATA.NEWS.find(function (n) { return n.symbol === symbol; });

    var peers = FV_DATA.STOCKS.filter(function (x) { return x.sector === s.sector && x.symbol !== symbol; });
    var peerAvg = peers.length
      ? peers.reduce(function (sum, x) { return sum + x.change; }, 0) / peers.length
      : null;

    return [
      {
        title: "Price action",
        text: s.symbol + " " + dir + " " + FV.fmtNum(Math.abs(s.change)) + "% today to " +
          FV.fmtINR(s.price, 2) + ". Over the last 60 days it is " +
          (gain60 >= 0 ? "up " : "down ") + FV.fmtNum(Math.abs(gain60)) +
          "%, so today's move " + (Math.sign(gain60) === Math.sign(s.change) ? "continues" : "runs against") +
          " the recent trend.",
        evidence: "60-day history · " + FV.fmtINR(start, 2) + " → " + FV.fmtINR(s.price, 2),
      },
      {
        title: "Earnings & fundamentals",
        text: FUNDAMENTALS[symbol] || ("At a P/E of " + FV.fmtNum(s.pe, 1) + ", the market's expectations for " + s.name + " are " + (s.pe > 30 ? "high — earnings must keep delivering." : "moderate — the valuation leaves room for a re-rating on good results.")),
        evidence: "P/E " + FV.fmtNum(s.pe, 1) + " · RSI " + FV.fmtNum(s.rsi, 1) + " · dividend yield " + FV.fmtNum(s.divYield) + "%",
      },
      {
        title: "News",
        text: news
          ? "“" + news.headline + "” (" + news.publisher + ", " + news.time + "). Sentiment is " + news.sentiment + " (score " + (news.score >= 0 ? "+" : "") + news.score.toFixed(2) + "), which lines up with today's " + dir + "."
          : "No fresh headline for " + s.symbol + " in today's feed, so news is unlikely to be the main driver of today's move.",
        evidence: news ? "News & Sentiment — " + news.publisher : "News & Sentiment — no item for " + s.symbol + " today",
      },
      {
        title: "Sector context",
        text: peerAvg === null
          ? s.name + " is the only " + s.sector + " stock in our 15-stock universe, so there is no peer group to compare with — today's move is being read on its own merits."
          : "Its " + s.sector + " peers moved " + FV.fmtSigned(peerAvg) + " on average today (" +
            peers.map(function (p) { return p.symbol + " " + FV.fmtSigned(p.change); }).join(", ") +
            "), so the move is " + (Math.sign(peerAvg) === Math.sign(s.change) ? "partly a sector move, not just this stock." : "stock-specific — the sector did not move the same way."),
        evidence: peerAvg === null
          ? "Sector — " + s.sector + " (1 stock in universe)"
          : "Sector peers — " + s.sector + " average " + FV.fmtSigned(peerAvg),
      },
      {
        title: "Market mood",
        text: "The Nifty is up 0.82% today, the India VIX sits at 12.8 (calm), and 68% of stocks are advancing. A rising, low-volatility market lifts most stocks a little — today's move should be read against that tailwind.",
        evidence: "Regime signals — Nifty +0.82% · VIX 12.8 · breadth 68%",
      },
    ];
  }

  function buildAttribution(symbol) {
    var s = FV_DATA.stockBySymbol(symbol);
    var news = FV_DATA.NEWS.find(function (n) { return n.symbol === symbol; });
    var peers = FV_DATA.STOCKS.filter(function (x) { return x.sector === s.sector && x.symbol !== symbol; });
    var peerAvg = peers.length
      ? peers.reduce(function (sum, x) { return sum + x.change; }, 0) / peers.length
      : 0;
    var sectorAligned = peers.length > 0 && Math.sign(peerAvg) === Math.sign(s.change) && Math.abs(peerAvg) >= 0.5;

    /* Start from a neutral split, then shift weight toward what the data supports. */
    var weights = { Earnings: 35, News: 20, Sector: 20, "Market mood": 25 };
    if (news) { weights.News += 15; weights["Market mood"] -= 10; weights.Earnings -= 5; }
    if (sectorAligned) { weights.Sector += 10; weights["Market mood"] -= 10; }
    if (Math.abs(s.change) >= 2) { weights.Earnings += 5; weights["Market mood"] -= 5; }
    if (peers.length === 0) { weights.Sector = 5; weights.Earnings += 10; weights.News += 5; }

    var total = weights.Earnings + weights.News + weights.Sector + weights["Market mood"];
    Object.keys(weights).forEach(function (k) {
      weights[k] = Math.round((weights[k] / total) * 100);
    });
    /* Fix rounding drift so the bars sum to 100. */
    var sum = weights.Earnings + weights.News + weights.Sector + weights["Market mood"];
    weights.Earnings += 100 - sum;

    var top = Object.keys(weights).sort(function (a, b) { return weights[b] - weights[a]; })[0];
    var dir = s.change >= 0 ? "rise" : "fall";
    var conclusion = "Today's " + FV.fmtNum(Math.abs(s.change)) + "% " + dir + " in " + s.symbol +
      " looks mostly driven by " + top.toLowerCase() + " (" + weights[top] + "%), with the rest spread across " +
      "the other factors. " + (news
        ? "The headline from " + news.publisher + " gave the market a clear, same-day reason to move the stock."
        : "With no fresh headline, the move is better explained by fundamentals and the broader market mood than by news.") +
      " This is an explanation of what happened — not a forecast of what happens next.";
    return { weights: weights, conclusion: conclusion };
  }

  function reset() {
    clearTimers();
    document.getElementById("steps-empty").hidden = false;
    document.getElementById("thought-steps").hidden = true;
    document.getElementById("thought-steps").innerHTML = "";
    document.getElementById("attribution-empty").hidden = false;
    document.getElementById("attribution-body").hidden = true;
    runBtn.disabled = false;
    runBtn.textContent = "Run the reasoning";
  }

  function run() {
    var symbol = document.getElementById("stock-select").value;
    var s = FV_DATA.stockBySymbol(symbol);
    clearTimers();
    runBtn.disabled = true;
    runBtn.textContent = "Reasoning…";
    document.getElementById("steps-empty").hidden = true;
    document.getElementById("attribution-empty").hidden = true;
    var list = document.getElementById("thought-steps");
    list.hidden = false;
    list.innerHTML = "";

    var steps = buildSteps(symbol);
    steps.forEach(function (step, i) {
      var li = document.createElement("li");
      li.style.display = "none";
      li.innerHTML = '<span class="step-dot">' + (i + 1) + "</span>" +
        "<h4>" + step.title + "</h4><p>" + step.text + "</p>" +
        '<p class="evidence"><strong>Evidence:</strong> ' + step.evidence + "</p>";
      list.appendChild(li);
      timers.push(setTimeout(function () {
        li.style.display = "";
        li.querySelector(".step-dot").classList.add("done");
      }, 450 * (i + 1)));
    });

    timers.push(setTimeout(function () {
      var attr = buildAttribution(symbol);
      var bars = document.getElementById("attribution-bars");
      bars.innerHTML = Object.keys(attr.weights).map(function (k) {
        return "<div><div class=\"progress-labels\"><strong>" + k + "</strong><span>" +
          attr.weights[k] + "%</span></div>" +
          '<div class="progress"><i style="width:' + attr.weights[k] + '%"></i></div></div>';
      }).join("");
      document.getElementById("attribution-conclusion").textContent = attr.conclusion;
      document.getElementById("attribution-body").hidden = false;
      runBtn.disabled = false;
      runBtn.textContent = "Run the reasoning again";
      FV.toast("Reasoning complete for " + s.symbol + ".");
    }, 450 * (steps.length + 1)));
  }

  document.addEventListener("DOMContentLoaded", function () {
    runBtn = document.getElementById("run-btn");
    var select = document.getElementById("stock-select");

    updateMoveSummary(select.value);

    select.addEventListener("change", function () {
      updateMoveSummary(select.value);
      reset();
      FV.toast("Selected " + select.value + " — press “Run the reasoning” to analyse it.");
    });

    runBtn.addEventListener("click", run);
  });
})();
