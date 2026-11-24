/* Market tables render only records supplied through FV_DATA.STOCKS. */
(function () {
  "use strict";
  var sortKey = null;
  var sortDir = 1;
  function changeClass(change) { return change >= 0 ? "up" : "down"; }
  function renderMovers() {
    var stocks = FV_DATA.STOCKS.slice().sort(function (a, b) { return b.change - a.change; });
    function row(stock) { return '<li><div class="row-main"><div class="row-title"><a href="' + FV.stockLink(stock.symbol) + '">' + stock.symbol + '</a></div><div class="row-sub">' + stock.name + '</div></div><div class="row-amt"><span class="' + changeClass(stock.change) + '">' + FV.fmtSigned(stock.change) + '</span><div class="row-sub">' + FV.fmtINR(stock.price, 2) + '</div></div></li>'; }
    document.getElementById("gainers-list").innerHTML = stocks.filter(function (stock) { return stock.change > 0; }).slice(0, 3).map(row).join("");
    document.getElementById("losers-list").innerHTML = stocks.filter(function (stock) { return stock.change < 0; }).slice(-3).reverse().map(row).join("");
  }
  function filteredStocks() {
    var query = document.getElementById("market-search").value.trim().toLowerCase();
    var sector = document.getElementById("market-sector").value;
    var records = FV_DATA.STOCKS.filter(function (stock) { return (!query || stock.symbol.toLowerCase().indexOf(query) !== -1 || stock.name.toLowerCase().indexOf(query) !== -1) && (!sector || stock.sector === sector); });
    if (sortKey) records.sort(function (a, b) { return (a[sortKey] - b[sortKey]) * sortDir; });
    return records;
  }
  function renderTable() {
    var records = filteredStocks();
    document.querySelector("#market-table tbody").innerHTML = records.map(function (stock) { return '<tr><td><a class="sym" href="' + FV.stockLink(stock.symbol) + '">' + stock.symbol + '</a></td><td>' + stock.name + '</td><td class="num">' + FV.fmtINR(stock.price, 2) + '</td><td class="num ' + changeClass(stock.change) + '">' + FV.fmtSigned(stock.change) + '</td><td class="num">' + FV.fmtNum(stock.pe, 1) + '</td><td class="num">' + FV.fmtNum(stock.rsi, 1) + '</td><td>' + stock.sector + '</td><td>' + stock.trendLabel + '</td></tr>'; }).join("");
    document.getElementById("market-count").textContent = records.length ? "Showing " + records.length + " of " + FV_DATA.STOCKS.length + " stocks." : "";
  }
  document.addEventListener("DOMContentLoaded", function () {
    var sector = document.getElementById("market-sector");
    FV_DATA.SECTORS.forEach(function (name) { var option = document.createElement("option"); option.value = name; option.textContent = name; sector.appendChild(option); });
    renderMovers(); renderTable();
    document.getElementById("market-search").addEventListener("input", renderTable); sector.addEventListener("change", renderTable);
    document.querySelectorAll("#market-table th[data-sort]").forEach(function (header) { header.addEventListener("click", function () { var key = header.getAttribute("data-sort"); sortDir = sortKey === key ? -sortDir : (key === "change" ? -1 : 1); sortKey = key; renderTable(); }); });
  });
})();
