/* FinVerse sample UI — Market Regime page (concept preview).
   Hero, signals and history are rendered from FV_DATA.REGIME. */

(function () {
  "use strict";

  var VERDICT_BADGE = {
    Bullish: "badge-up",
    Calm: "badge-up",
    Healthy: "badge-up",
    Supportive: "badge-up",
    Stable: "badge-neutral",
    Neutral: "badge-neutral",
    Bearish: "badge-down",
    Stressed: "badge-down",
  };

  document.addEventListener("DOMContentLoaded", function () {
    var r = FV_DATA.REGIME;

    document.getElementById("regime-current").textContent = r.current;
    document.getElementById("regime-badge").textContent = r.current;
    document.getElementById("regime-updated").textContent = "Updated " + r.updated;
    var pct = Math.round(r.confidence * 100);
    document.getElementById("regime-confidence").textContent = pct + "%";
    document.getElementById("regime-meter").style.width = pct + "%";

    document.getElementById("signals-grid").innerHTML = r.signals.map(function (sig) {
      var badge = VERDICT_BADGE[sig.verdict] || "badge-neutral";
      return '<div class="card">' +
        '<div class="card-head"><div><h3>' + sig.name + "</h3></div>" +
        '<span class="badge ' + badge + '">' + sig.verdict + "</span></div>" +
        '<div class="stat-value" style="font-size:1.4rem;margin-bottom:0.4rem">' + sig.value + "</div>" +
        '<p style="color:var(--ink-soft);margin:0;font-size:0.92rem">' + sig.detail + "</p>" +
        "</div>";
    }).join("");

    document.querySelector("#history-table tbody").innerHTML = r.history.map(function (row) {
      var isCurrent = row.period === "Nov 2026";
      return "<tr><td><strong>" + row.period + "</strong>" +
        (isCurrent ? ' <span class="badge badge-live">Current</span>' : "") + "</td>" +
        "<td>" + row.regime + "</td><td>" + row.note + "</td></tr>";
    }).join("");
  });
})();
