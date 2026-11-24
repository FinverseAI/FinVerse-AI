/* Portfolio entries are user supplied. Price-dependent values remain empty
   until a market-data source is connected. */
(function () {
  "use strict";
  var holdings = [];

  function write(id, value) { document.getElementById(id).textContent = value; }

  function render() {
    var invested = holdings.reduce(function (total, holding) { return total + holding.qty * holding.avgCost; }, 0);
    write("stat-total-value", "");
    write("stat-holdings-count", holdings.length ? holdings.length + (holdings.length === 1 ? " holding" : " holdings") : "");
    write("stat-invested", holdings.length ? FV.fmtINR(invested, 2) : "");
    write("stat-pnl", ""); write("stat-pnl-pct", "");
    write("foot-invested", holdings.length ? FV.fmtINR(invested, 2) : "");
    write("foot-value", ""); write("foot-pnl", ""); write("foot-pnl-pct", "");
    var tbody = document.querySelector("#holdings-table tbody");
    tbody.textContent = "";
    holdings.forEach(function (holding) {
      var row = tbody.insertRow();
      [holding.symbol, FV.fmtNum(holding.qty, 0), FV.fmtINR(holding.avgCost, 2), "", "", "", ""].forEach(function (value, index) {
        var cell = row.insertCell(); cell.textContent = value; if (index > 0) cell.className = "num";
      });
    });
    document.getElementById("alloc-legend").textContent = "";
    document.getElementById("sector-bars").textContent = "";
  }

  document.addEventListener("DOMContentLoaded", function () {
    render();
    document.getElementById("add-holding-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var symbol = document.getElementById("holding-symbol").value.trim().toUpperCase();
      var qty = Number(document.getElementById("holding-qty").value);
      var avgCost = Number(document.getElementById("holding-cost").value);
      if (!symbol || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(avgCost) || avgCost <= 0) { FV.toast("Enter a symbol, quantity and average cost."); return; }
      holdings.push({ symbol: symbol, qty: qty, avgCost: avgCost });
      render(); FV.closeModal("add-holding-modal"); event.target.reset();
    });
  });
})();
