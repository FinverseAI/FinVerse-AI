/* FinVerse sample UI — News & Sentiment page.
   Stats and cards are rendered from FV_DATA.NEWS; filters update live. */

(function () {
  "use strict";

  var sentiment = "all";
  var symbol = "all";

  function sentimentBadge(n) {
    if (n.sentiment === "positive") return '<span class="badge badge-up">Positive</span>';
    if (n.sentiment === "negative") return '<span class="badge badge-down">Negative</span>';
    return '<span class="badge badge-neutral">Neutral</span>';
  }

  function renderStats() {
    var counts = { positive: 0, neutral: 0, negative: 0 };
    var total = 0;
    FV_DATA.NEWS.forEach(function (n) {
      counts[n.sentiment]++;
      total += n.score;
    });
    document.getElementById("stat-positive").textContent = counts.positive;
    document.getElementById("stat-neutral").textContent = counts.neutral;
    document.getElementById("stat-negative").textContent = counts.negative;
    var avg = total / FV_DATA.NEWS.length;
    document.getElementById("stat-avg").textContent = (avg >= 0 ? "+" : "") + avg.toFixed(2);
  }

  function renderList() {
    var list = document.getElementById("news-list");
    var empty = document.getElementById("news-empty");
    var items = FV_DATA.NEWS.filter(function (n) {
      if (sentiment !== "all" && n.sentiment !== sentiment) return false;
      if (symbol !== "all" && n.symbol !== symbol) return false;
      return true;
    });
    empty.hidden = items.length > 0;
    list.innerHTML = items.map(function (n) {
      var stock = FV_DATA.stockBySymbol(n.symbol);
      var width = Math.round(((n.score + 1) / 2) * 100);
      var barClass = n.score >= 0.3 ? "" : n.score <= -0.3 ? " red" : " gold";
      return '<article class="card">' +
        '<div class="card-head"><div>' + sentimentBadge(n) + "</div>" +
        '<a class="chip" href="' + FV.stockLink(n.symbol) + '">' + n.symbol + "</a></div>" +
        "<h2 style=\"font-size:1.15rem;margin-bottom:0.4rem\">" + n.headline + "</h2>" +
        '<p style="color:var(--muted);font-size:0.85rem;margin:0 0 0.6rem">' + n.publisher + " · " + n.time +
        (stock ? " · " + stock.name : "") + "</p>" +
        '<p style="color:var(--ink-soft);margin:0 0 1rem">' + n.summary + "</p>" +
        '<div class="meter"><span class="stat-label" style="min-width:5.5rem">Sentiment ' +
        (n.score >= 0 ? "+" : "") + n.score.toFixed(2) + "</span>" +
        '<div class="progress' + barClass + '"><i style="width:' + width + '%"></i></div></div>' +
        '<div class="progress-labels"><span>−1 negative</span><span>+1 positive</span></div>' +
        "</article>";
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderStats();

    /* Stock filter: All + symbols present in NEWS, in first-seen order. */
    var select = document.getElementById("stock-filter");
    var seen = [];
    FV_DATA.NEWS.forEach(function (n) {
      if (seen.indexOf(n.symbol) === -1) seen.push(n.symbol);
    });
    var allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All stocks";
    select.appendChild(allOpt);
    seen.forEach(function (sym) {
      var stock = FV_DATA.stockBySymbol(sym);
      var opt = document.createElement("option");
      opt.value = sym;
      opt.textContent = sym + (stock ? " — " + stock.name : "");
      select.appendChild(opt);
    });

    select.addEventListener("change", function () {
      symbol = select.value;
      renderList();
    });

    document.querySelectorAll("#sentiment-filter button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("#sentiment-filter button").forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        sentiment = btn.getAttribute("data-sentiment");
        renderList();
      });
    });

    renderList();
  });
})();
