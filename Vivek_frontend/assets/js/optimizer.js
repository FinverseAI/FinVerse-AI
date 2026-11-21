/* FinVerse sample UI — optimizer page.
   Efficient-frontier scatter chart, current-vs-optimal allocation
   table, and an "apply" action that moves the current mix to optimal. */

(function () {
  "use strict";

  var OPT = FV_DATA.OPTIMIZER;
  var allocation = OPT.allocation.map(function (a) {
    return { symbol: a.symbol, current: a.current, optimal: a.optimal };
  });
  var currentPoint = { risk: OPT.current.risk, ret: OPT.current.ret };
  var currentSharpe = OPT.currentSharpe;
  var applied = false;
  var frontierChart = null;

  function renderStats() {
    document.getElementById("stat-current-sharpe").textContent = FV.fmtNum(currentSharpe, 2);
    document.getElementById("stat-current-rr").textContent =
      FV.fmtNum(currentPoint.risk, 1) + "% risk · " + FV.fmtNum(currentPoint.ret, 1) + "% return";
    document.getElementById("stat-current-sharpe-sub").textContent = applied
      ? "Now at the optimum"
      : "Your portfolio today";
  }

  function renderTable() {
    var tbody = document.querySelector("#alloc-table tbody");
    tbody.innerHTML = allocation.map(function (a) {
      var change = a.optimal - a.current;
      var symbolCell;
      if (FV_DATA.stockBySymbol(a.symbol)) {
        symbolCell = '<a class="sym" href="' + FV.stockLink(a.symbol) + '">' + a.symbol + "</a>";
      } else {
        symbolCell = '<span class="sym">' + a.symbol + "</span>";
      }
      return "<tr>" +
        "<td>" + symbolCell + "</td>" +
        '<td class="num">' + FV.fmtNum(a.current, 0) + "%</td>" +
        '<td class="num">' + FV.fmtNum(a.optimal, 0) + "%</td>" +
        '<td class="num ' + (change > 0 ? "up" : change < 0 ? "down" : "") + '">' +
        FV.fmtSigned(change, " pp") + "</td>" +
        "</tr>";
    }).join("");

    var totalCurrent = allocation.reduce(function (sum, a) { return sum + a.current; }, 0);
    var totalOptimal = allocation.reduce(function (sum, a) { return sum + a.optimal; }, 0);
    document.getElementById("foot-current").textContent = FV.fmtNum(totalCurrent, 0) + "%";
    document.getElementById("foot-optimal").textContent = FV.fmtNum(totalOptimal, 0) + "%";
  }

  function renderChart() {
    FV.chartDefaults();
    if (frontierChart) frontierChart.destroy();
    frontierChart = new Chart(document.getElementById("frontier-chart"), {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "Efficient frontier",
            data: OPT.frontier.map(function (p) { return { x: p.risk, y: p.ret }; }),
            showLine: true,
            borderColor: "#2e7d5b",
            backgroundColor: "#2e7d5b",
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2,
            tension: 0.3,
          },
          {
            label: "Current portfolio",
            data: [{ x: currentPoint.risk, y: currentPoint.ret }],
            backgroundColor: "#d9a441",
            borderColor: "#ffffff",
            borderWidth: 2,
            pointRadius: 9,
            pointHoverRadius: 11,
          },
          {
            label: "Optimal portfolio",
            data: [{ x: OPT.optimal.risk, y: OPT.optimal.ret }],
            backgroundColor: "#0b3b2c",
            borderColor: "#ffffff",
            borderWidth: 2,
            pointRadius: 9,
            pointHoverRadius: 11,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return " " + ctx.dataset.label + ": " + FV.fmtNum(ctx.parsed.x, 1) +
                  "% risk, " + FV.fmtNum(ctx.parsed.y, 1) + "% return";
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Risk — annualised volatility (%)" },
            min: 6,
            max: 24,
            ticks: { callback: function (v) { return v + "%"; } },
          },
          y: {
            title: { display: true, text: "Expected return (% p.a.)" },
            min: 7,
            max: 19,
            ticks: { callback: function (v) { return v + "%"; } },
          },
        },
      },
    });
  }

  function init() {
    renderStats();
    renderTable();
    renderChart();

    document.getElementById("apply-optimal").addEventListener("click", function () {
      if (applied) return;
      applied = true;
      allocation.forEach(function (a) { a.current = a.optimal; });
      currentPoint = { risk: OPT.optimal.risk, ret: OPT.optimal.ret };
      currentSharpe = OPT.optimalSharpe;
      renderStats();
      renderTable();
      renderChart();
      var btn = document.getElementById("apply-optimal");
      btn.disabled = true;
      btn.textContent = "✓ Optimal allocation applied";
      FV.toast("Optimal allocation applied — Sharpe improved to 1.86.");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
