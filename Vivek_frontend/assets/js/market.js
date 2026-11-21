/* FinVerse sample UI — market page.
   Index stats, Nifty chart (scaled from the first stock's history),
   top gainers/losers, and a sortable, searchable, sector-filtered
   table of all 15 stocks. */

(function () {
  "use strict";

  var sortKey = null;
  var sortDir = 1;
  var niftyChart = null;

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

  function changeClass(change) {
    return change >= 0 ? "up" : "down";
  }

  function renderMovers() {
    var sorted = FV_DATA.STOCKS.slice().sort(function (a, b) { return b.change - a.change; });
    var gainers = sorted.slice(0, 3);
    var losers = sorted.slice(-3).reverse();

    function row(s) {
      return '<li><div class="row-main"><div class="row-title"><a href="' + FV.stockLink(s.symbol) + '">' +
        s.symbol + '</a></div><div class="row-sub">' + s.name + '</div></div>' +
        '<div class="row-amt"><span class="' + changeClass(s.change) + '">' + FV.fmtSigned(s.change) + '</span>' +
        '<div class="row-sub">' + FV.fmtINR(s.price, 2) + '</div></div></li>';
    }

    document.getElementById("gainers-list").innerHTML = gainers.map(row).join("");
    document.getElementById("losers-list").innerHTML = losers.map(row).join("");
  }

  function filteredStocks() {
    var q = document.getElementById("market-search").value.trim().toLowerCase();
    var sector = document.getElementById("market-sector").value;
    var rows = FV_DATA.STOCKS.filter(function (s) {
      var matchesQ = !q || s.symbol.toLowerCase().indexOf(q) !== -1 ||
        s.name.toLowerCase().indexOf(q) !== -1;
      var matchesSector = !sector || s.sector === sector;
      return matchesQ && matchesSector;
    });
    if (sortKey) {
      rows.sort(function (a, b) { return (a[sortKey] - b[sortKey]) * sortDir; });
    }
    return rows;
  }

  function renderTable() {
    var rows = filteredStocks();
    var tbody = document.querySelector("#market-table tbody");
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:1.5rem 0.75rem">' +
        'No stocks match your search and filters.</td></tr>';
    } else {
      tbody.innerHTML = rows.map(function (s) {
        return "<tr>" +
          '<td><a class="sym" href="' + FV.stockLink(s.symbol) + '">' + s.symbol + "</a></td>" +
          "<td>" + s.name + "</td>" +
          '<td class="num">' + FV.fmtINR(s.price, 2) + "</td>" +
          '<td class="num ' + changeClass(s.change) + '">' + FV.fmtSigned(s.change) + "</td>" +
          '<td class="num">' + FV.fmtNum(s.pe, 1) + "</td>" +
          '<td class="num">' + FV.fmtNum(s.rsi, 1) + "</td>" +
          "<td>" + s.sector + "</td>" +
          "<td>" + s.trendLabel + "</td>" +
          "</tr>";
      }).join("");
    }
    document.getElementById("market-count").textContent =
      "Showing " + rows.length + " of 15 stocks. Click a column header to sort.";
  }

  function updateArrows() {
    document.querySelectorAll("[data-arrow]").forEach(function (el) {
      el.textContent = el.getAttribute("data-arrow") === sortKey
        ? (sortDir === 1 ? "▲" : "▼")
        : "";
    });
  }

  function buildNiftyChart() {
    FV.chartDefaults();
    var base = FV_DATA.STOCKS[0];
    var factor = 26184.55 / base.price;
    var series = base.history.map(function (p) { return Math.round(p * factor * 100) / 100; });
    if (niftyChart) niftyChart.destroy();
    niftyChart = new Chart(document.getElementById("nifty-chart"), {
      type: "line",
      data: {
        labels: dateLabels(60),
        datasets: [{
          label: "Nifty 50",
          data: series,
          borderColor: "#0b3b2c",
          backgroundColor: "rgba(11, 59, 44, 0.08)",
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
              label: function (ctx) { return " Nifty 50: " + FV.fmtNum(ctx.parsed.y, 2); },
            },
          },
        },
        scales: {
          x: { ticks: { maxTicksLimit: 8 } },
          y: {
            ticks: {
              callback: function (v) { return FV.fmtNum(v, 0); },
            },
          },
        },
      },
    });
  }

  function init() {
    var sectorSelect = document.getElementById("market-sector");
    FV_DATA.SECTORS.forEach(function (sec) {
      var opt = document.createElement("option");
      opt.value = sec;
      opt.textContent = sec;
      sectorSelect.appendChild(opt);
    });

    buildNiftyChart();
    renderMovers();
    renderTable();

    document.getElementById("market-search").addEventListener("input", renderTable);
    sectorSelect.addEventListener("change", renderTable);

    document.querySelectorAll("#market-table th[data-sort]").forEach(function (th) {
      th.addEventListener("click", function () {
        var key = th.getAttribute("data-sort");
        if (sortKey === key) {
          sortDir = -sortDir;
        } else {
          sortKey = key;
          sortDir = key === "change" ? -1 : 1;
        }
        updateArrows();
        renderTable();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
