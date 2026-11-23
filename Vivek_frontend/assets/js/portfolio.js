/* FinVerse sample UI — portfolio page.
   Totals, P&L, allocation donut and sector bars are all computed from
   the holdings and live demo prices. Adding a holding re-renders all. */

(function () {
  "use strict";

  var holdings = FV_DATA.HOLDINGS.map(function (h) {
    return { symbol: h.symbol, qty: h.qty, avgCost: h.avgCost };
  });
  var allocChart = null;

  function rows() {
    return holdings.map(function (h) {
      var s = FV_DATA.stockBySymbol(h.symbol);
      var invested = h.qty * h.avgCost;
      var value = h.qty * s.price;
      var pnl = value - invested;
      return {
        holding: h, stock: s, invested: invested, value: value, pnl: pnl,
        pnlPct: invested ? (pnl / invested) * 100 : 0,
      };
    });
  }

  function totals(rs) {
    return rs.reduce(function (acc, r) {
      acc.invested += r.invested;
      acc.value += r.value;
      acc.pnl += r.pnl;
      return acc;
    }, { invested: 0, value: 0, pnl: 0 });
  }

  function renderStats(rs, t) {
    document.getElementById("stat-total-value").textContent = FV.fmtINR(t.value, 2);
    document.getElementById("stat-holdings-count").textContent =
      holdings.length + (holdings.length === 1 ? " holding" : " holdings");
    document.getElementById("stat-invested").textContent = FV.fmtINR(t.invested, 2);
    var pnlEl = document.getElementById("stat-pnl");
    var pnlPct = t.invested ? (t.pnl / t.invested) * 100 : 0;
    pnlEl.textContent = (t.pnl >= 0 ? "+" : "−") + FV.fmtINR(Math.abs(t.pnl), 2);
    pnlEl.className = "stat-value " + (t.pnl >= 0 ? "up" : "down");
    var sub = document.getElementById("stat-pnl-pct");
    sub.innerHTML = '<span class="' + (t.pnl >= 0 ? "up" : "down") + '">' +
      FV.fmtSigned(pnlPct) + " overall</span>";
  }

  function renderTable(rs, t) {
    var tbody = document.querySelector("#holdings-table tbody");
    tbody.innerHTML = rs.map(function (r) {
      var pnlText = (r.pnl >= 0 ? "+" : "−") + FV.fmtINR(Math.abs(r.pnl), 2);
      return "<tr>" +
        '<td><a class="sym" href="' + FV.stockLink(r.stock.symbol) + '">' + r.stock.symbol + "</a></td>" +
        '<td class="num">' + FV.fmtNum(r.holding.qty, 0) + "</td>" +
        '<td class="num">' + FV.fmtINR(r.holding.avgCost, 2) + "</td>" +
        '<td class="num">' + FV.fmtINR(r.stock.price, 2) + "</td>" +
        '<td class="num">' + FV.fmtINR(r.value, 2) + "</td>" +
        '<td class="num ' + (r.pnl >= 0 ? "up" : "down") + '">' + pnlText + "</td>" +
        '<td class="num ' + (r.pnl >= 0 ? "up" : "down") + '">' + FV.fmtSigned(r.pnlPct) + "</td>" +
        "</tr>";
    }).join("");

    var pnlPct = t.invested ? (t.pnl / t.invested) * 100 : 0;
    document.getElementById("foot-invested").textContent = FV.fmtINR(t.invested, 2);
    document.getElementById("foot-value").textContent = FV.fmtINR(t.value, 2);
    var footPnl = document.getElementById("foot-pnl");
    footPnl.textContent = (t.pnl >= 0 ? "+" : "−") + FV.fmtINR(Math.abs(t.pnl), 2);
    footPnl.className = "num " + (t.pnl >= 0 ? "up" : "down");
    var footPct = document.getElementById("foot-pnl-pct");
    footPct.textContent = FV.fmtSigned(pnlPct);
    footPct.className = "num " + (t.pnl >= 0 ? "up" : "down");
  }

  function renderDonut(rs, t) {
    FV.chartDefaults();
    var colors = FV.GREEN_PALETTE;
    var legend = document.getElementById("alloc-legend");
    legend.innerHTML = rs.map(function (r, i) {
      var pct = t.value ? (r.value / t.value) * 100 : 0;
      return '<li><span class="dot" style="background:' + colors[i % colors.length] + '"></span>' +
        r.stock.symbol + ' <span class="amt">' + FV.fmtNum(pct, 1) + "%</span></li>";
    }).join("");

    if (allocChart) allocChart.destroy();
    allocChart = new Chart(document.getElementById("alloc-chart"), {
      type: "doughnut",
      data: {
        labels: rs.map(function (r) { return r.stock.symbol; }),
        datasets: [{
          data: rs.map(function (r) { return Math.round(r.value * 100) / 100; }),
          backgroundColor: rs.map(function (r, i) { return colors[i % colors.length]; }),
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var pct = t.value ? (ctx.parsed / t.value) * 100 : 0;
                return " " + ctx.label + ": " + FV.fmtINR(ctx.parsed, 2) +
                  " (" + FV.fmtNum(pct, 1) + "%)";
              },
            },
          },
        },
      },
    });
  }

  function renderSectorBars(rs, t) {
    var bySector = {};
    rs.forEach(function (r) {
      var sec = r.stock.sector;
      bySector[sec] = (bySector[sec] || 0) + r.value;
    });
    var sectors = Object.keys(bySector).map(function (sec) {
      return { sector: sec, value: bySector[sec] };
    }).sort(function (a, b) { return b.value - a.value; });

    document.getElementById("sector-bars").innerHTML = sectors.map(function (s) {
      var pct = t.value ? (s.value / t.value) * 100 : 0;
      return '<div><div style="display:flex;justify-content:space-between;font-size:0.9rem;margin-bottom:0.35rem">' +
        "<strong>" + s.sector + "</strong><span>" + FV.fmtINR(s.value, 2) +
        " · " + FV.fmtNum(pct, 1) + "%</span></div>" +
        '<div class="progress"><i style="width:' + pct.toFixed(1) + '%"></i></div></div>';
    }).join("");
  }

  function renderAll() {
    var rs = rows();
    var t = totals(rs);
    renderStats(rs, t);
    renderTable(rs, t);
    renderDonut(rs, t);
    renderSectorBars(rs, t);
  }

  function refreshSymbolOptions() {
    var select = document.getElementById("holding-symbol");
    var held = {};
    holdings.forEach(function (h) { held[h.symbol] = true; });
    var available = FV_DATA.STOCKS.filter(function (s) { return !held[s.symbol]; });
    select.innerHTML = available.map(function (s) {
      return '<option value="' + s.symbol + '">' + s.symbol + " — " + s.name +
        " (" + FV.fmtINR(s.price, 2) + ")</option>";
    }).join("");
    select.disabled = available.length === 0;
  }

  function init() {
    renderAll();

    document.querySelector('[data-open-modal="add-holding-modal"]')
      .addEventListener("click", refreshSymbolOptions);

    document.getElementById("add-holding-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var symbol = document.getElementById("holding-symbol").value;
      var qty = parseInt(document.getElementById("holding-qty").value, 10);
      var avgCost = parseFloat(document.getElementById("holding-cost").value);
      if (!symbol || !qty || qty <= 0 || !avgCost || avgCost <= 0) {
        FV.toast("Enter a valid stock, quantity and average cost.");
        return;
      }
      holdings.push({ symbol: symbol, qty: qty, avgCost: avgCost });
      renderAll();
      FV.closeModal("add-holding-modal");
      e.target.reset();
      FV.toast(symbol + " added to your portfolio (" + qty + " shares).");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
