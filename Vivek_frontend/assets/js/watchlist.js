/* FinVerse sample UI — watchlist page.
   Each entry shows the live demo price, the user's note, and whether
   its price alert has triggered against today's price. */

(function () {
  "use strict";

  var entries = FV_DATA.WATCHLIST.map(function (w) {
    return {
      symbol: w.symbol, note: w.note,
      alertAbove: w.alertAbove, alertBelow: w.alertBelow,
    };
  });

  function alertLabel(entry) {
    var parts = [];
    if (entry.alertAbove != null) parts.push("Above " + FV.fmtINR(entry.alertAbove, 2));
    if (entry.alertBelow != null) parts.push("Below " + FV.fmtINR(entry.alertBelow, 2));
    return parts.length ? parts.join(" · ") : "No alert set";
  }

  function alertStatus(entry, stock) {
    if (entry.alertAbove != null && stock.price >= entry.alertAbove) {
      return { triggered: true, text: "Triggered — above " + FV.fmtINR(entry.alertAbove, 2) };
    }
    if (entry.alertBelow != null && stock.price <= entry.alertBelow) {
      return { triggered: true, text: "Triggered — below " + FV.fmtINR(entry.alertBelow, 2) };
    }
    return { triggered: false, text: "Watching" };
  }

  function render() {
    var tbody = document.querySelector("#watch-table tbody");
    var wrap = document.getElementById("watch-table-wrap");
    var empty = document.getElementById("watch-empty");

    document.getElementById("watch-count").textContent =
      entries.length + (entries.length === 1 ? " stock" : " stocks") + " on your watchlist.";

    if (!entries.length) {
      wrap.style.display = "none";
      empty.style.display = "block";
      return;
    }
    wrap.style.display = "block";
    empty.style.display = "none";

    tbody.innerHTML = entries.map(function (entry) {
      var s = FV_DATA.stockBySymbol(entry.symbol);
      var status = alertStatus(entry, s);
      return "<tr>" +
        '<td><a class="sym" href="' + FV.stockLink(s.symbol) + '">' + s.symbol + "</a>" +
        '<div style="font-size:0.82rem;color:var(--muted);font-weight:400">' + s.name + "</div></td>" +
        '<td class="num">' + FV.fmtINR(s.price, 2) + "</td>" +
        '<td class="num ' + (s.change >= 0 ? "up" : "down") + '">' + FV.fmtSigned(s.change) + "</td>" +
        "<td>" + (entry.note || "—") + "</td>" +
        "<td>" + alertLabel(entry) + "</td>" +
        '<td><span class="badge ' + (status.triggered ? "badge-live" : "badge-neutral") + '">' +
        status.text + "</span></td>" +
        '<td class="num"><button class="btn btn-ghost btn-sm" type="button" data-remove="' +
        entry.symbol + '">Remove</button></td>' +
        "</tr>";
    }).join("");
  }

  function refreshSymbolOptions() {
    var select = document.getElementById("watch-symbol");
    var watched = {};
    entries.forEach(function (e) { watched[e.symbol] = true; });
    var available = FV_DATA.STOCKS.filter(function (s) { return !watched[s.symbol]; });
    select.innerHTML = available.map(function (s) {
      return '<option value="' + s.symbol + '">' + s.symbol + " — " + s.name +
        " (" + FV.fmtINR(s.price, 2) + ")</option>";
    }).join("");
    select.disabled = available.length === 0;
  }

  function init() {
    render();

    document.querySelector("#watch-table tbody").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove]");
      if (!btn) return;
      var symbol = btn.getAttribute("data-remove");
      entries = entries.filter(function (w) { return w.symbol !== symbol; });
      render();
      FV.toast(symbol + " removed from your watchlist.");
    });

    document.querySelector('[data-open-modal="add-watch-modal"]')
      .addEventListener("click", refreshSymbolOptions);

    document.getElementById("add-watch-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var symbol = document.getElementById("watch-symbol").value;
      var note = document.getElementById("watch-note").value.trim();
      var aboveRaw = document.getElementById("watch-above").value;
      var belowRaw = document.getElementById("watch-below").value;
      var above = aboveRaw ? parseFloat(aboveRaw) : null;
      var below = belowRaw ? parseFloat(belowRaw) : null;
      if (!symbol) {
        FV.toast("Choose a stock to watch.");
        return;
      }
      if (above != null && below != null && above <= below) {
        FV.toast("“Alert above” must be higher than “alert below”.");
        return;
      }
      entries.push({ symbol: symbol, note: note, alertAbove: above, alertBelow: below });
      render();
      FV.closeModal("add-watch-modal");
      e.target.reset();
      FV.toast(symbol + " added to your watchlist.");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
