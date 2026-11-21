/* FinVerse sample UI — smart screener.
   All filtering is deterministic over FV_DATA.STOCKS. The natural-
   language box only translates words into the same form fields. */

(function () {
  "use strict";

  var FILTER_IDS = [
    "f-min-price", "f-max-price", "f-min-pe", "f-max-pe",
    "f-min-rsi", "f-max-rsi", "f-sector", "f-trend", "f-min-cap",
  ];

  function numVal(id) {
    var raw = document.getElementById(id).value;
    if (raw === "" || raw == null) return null;
    var v = parseFloat(raw);
    return isNaN(v) ? null : v;
  }

  function matches(s) {
    var minPrice = numVal("f-min-price");
    var maxPrice = numVal("f-max-price");
    var minPe = numVal("f-min-pe");
    var maxPe = numVal("f-max-pe");
    var minRsi = numVal("f-min-rsi");
    var maxRsi = numVal("f-max-rsi");
    var sector = document.getElementById("f-sector").value;
    var trend = document.getElementById("f-trend").value;
    var minCap = numVal("f-min-cap");

    if (minPrice != null && s.price < minPrice) return false;
    if (maxPrice != null && s.price > maxPrice) return false;
    if (minPe != null && s.pe < minPe) return false;
    if (maxPe != null && s.pe > maxPe) return false;
    if (minRsi != null && s.rsi < minRsi) return false;
    if (maxRsi != null && s.rsi > maxRsi) return false;
    if (sector && s.sector !== sector) return false;
    if (minCap != null && s.marketCapCrore < minCap) return false;

    if (trend === "above-sma20" && !(s.price > s.sma20)) return false;
    if (trend === "below-sma20" && !(s.price < s.sma20)) return false;
    if (trend === "golden" && !(s.sma20 > s.sma50)) return false;
    if (trend === "death" && !(s.sma20 < s.sma50)) return false;
    return true;
  }

  function render() {
    var rows = FV_DATA.STOCKS.filter(matches);
    var tbody = document.querySelector("#results-table tbody");
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:1.5rem 0.75rem">' +
        "No stocks match these filters. Try widening a range or resetting the filters.</td></tr>";
    } else {
      tbody.innerHTML = rows.map(function (s) {
        return "<tr>" +
          '<td><a class="sym" href="' + FV.stockLink(s.symbol) + '">' + s.symbol + "</a></td>" +
          "<td>" + s.name + "</td>" +
          '<td class="num">' + FV.fmtINR(s.price, 2) + "</td>" +
          '<td class="num ' + (s.change >= 0 ? "up" : "down") + '">' + FV.fmtSigned(s.change) + "</td>" +
          '<td class="num">' + FV.fmtNum(s.pe, 1) + "</td>" +
          '<td class="num">' + FV.fmtNum(s.rsi, 1) + "</td>" +
          "<td>" + s.sector + "</td>" +
          '<td class="num">' + FV.fmtCrore(s.marketCapCrore) + "</td>" +
          "<td>" + s.trendLabel + (s.goldenCross ? " · Golden cross" : " · Death cross") + "</td>" +
          "</tr>";
      }).join("");
    }
    document.getElementById("results-count").textContent =
      rows.length + " of 15 stocks match.";
  }

  function resetFilters() {
    FILTER_IDS.forEach(function (id) {
      document.getElementById(id).value = "";
    });
    render();
  }

  /* Parse a plain-words query into the form fields. Understands sector
     names plus "rsi/pe/price below/above N". */
  function applyNaturalLanguage() {
    var text = document.getElementById("nl-input").value.trim().toLowerCase();
    if (!text) {
      FV.toast("Type a description first — e.g. “banking stocks with RSI below 50”.");
      return;
    }
    var applied = [];

    var sectorWords = {
      banking: "Banking", bank: "Banking", it: "IT", technology: "IT",
      energy: "Energy", fmcg: "FMCG", auto: "Auto", automobile: "Auto",
      pharma: "Pharma", telecom: "Telecom", infrastructure: "Infrastructure",
      infra: "Infrastructure", consumer: "Consumer",
    };
    Object.keys(sectorWords).forEach(function (word) {
      var re = new RegExp("\\b" + word + "\\b");
      if (re.test(text)) {
        document.getElementById("f-sector").value = sectorWords[word];
        applied.push("sector " + sectorWords[word]);
      }
    });

    function parseBound(pattern, minId, maxId, label) {
      var m = text.match(pattern);
      if (!m) return;
      var dir = m[1];
      var value = parseFloat(m[2].replace(/,/g, ""));
      if (isNaN(value)) return;
      var below = /below|under|less/.test(dir);
      if (below) {
        document.getElementById(maxId).value = value;
        applied.push(label + " below " + value);
      } else {
        document.getElementById(minId).value = value;
        applied.push(label + " above " + value);
      }
    }

    var dirWords = "(below|under|less than|above|over|greater than|more than)";
    parseBound(new RegExp("rsi\\s+" + dirWords + "\\s*([\\d,.]+)"), "f-min-rsi", "f-max-rsi", "RSI");
    parseBound(new RegExp("p\\/?e\\s+" + dirWords + "\\s*([\\d,.]+)"), "f-min-pe", "f-max-pe", "P/E");
    parseBound(new RegExp("price\\s+" + dirWords + "\\s*(?:rs\\.?\\s*)?([\\d,.]+)"), "f-min-price", "f-max-price", "price");

    if (!applied.length) {
      FV.toast("Couldn't understand that — try a sector name plus “RSI below 50”, “PE below 30” or “price above 1500”.");
      return;
    }
    render();
    FV.toast("Applied: " + applied.join(", ") + ".");
  }

  function init() {
    var sectorSelect = document.getElementById("f-sector");
    FV_DATA.SECTORS.forEach(function (sec) {
      var opt = document.createElement("option");
      opt.value = sec;
      opt.textContent = sec;
      sectorSelect.appendChild(opt);
    });

    FILTER_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });

    document.getElementById("reset-filters").addEventListener("click", function () {
      resetFilters();
      document.getElementById("nl-input").value = "";
      FV.toast("Filters reset — showing all 15 stocks.");
    });

    document.getElementById("nl-apply").addEventListener("click", applyNaturalLanguage);
    document.getElementById("nl-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") applyNaturalLanguage();
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
