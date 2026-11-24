/* Watchlist entries are user supplied. Quote-dependent cells remain empty. */
(function () {
  "use strict";
  var entries = [];
  function cell(row, text, className) {
    var result = row.insertCell(); result.textContent = text || "";
    if (className) result.className = className;
    return result;
  }
  function render() {
    var tbody = document.querySelector("#watch-table tbody");
    var wrap = document.getElementById("watch-table-wrap");
    var empty = document.getElementById("watch-empty");
    document.getElementById("watch-count").textContent = entries.length ? entries.length + (entries.length === 1 ? " stock" : " stocks") + " on your watchlist." : "";
    tbody.textContent = "";
    wrap.style.display = entries.length ? "block" : "none";
    empty.style.display = entries.length ? "none" : "block";
    entries.forEach(function (entry, index) {
      var row = tbody.insertRow();
      cell(row, entry.symbol); cell(row, "", "num"); cell(row, "", "num");
      cell(row, entry.note); cell(row, entry.target); cell(row, "");
      var actions = cell(row, "", "num");
      var remove = document.createElement("button");
      remove.type = "button"; remove.className = "btn btn-ghost btn-sm"; remove.textContent = "Remove";
      remove.addEventListener("click", function () { entries.splice(index, 1); render(); });
      actions.appendChild(remove);
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    render();
    document.getElementById("add-watch-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var symbol = document.getElementById("watch-symbol").value.trim().toUpperCase();
      if (!symbol) return;
      var above = document.getElementById("watch-above").value;
      var below = document.getElementById("watch-below").value;
      entries.push({ symbol: symbol, note: document.getElementById("watch-note").value.trim(), target: above ? "Above " + above : (below ? "Below " + below : "") });
      render(); FV.closeModal("add-watch-modal"); event.target.reset();
    });
  });
})();
