/* FinVerse sample UI — reports page (CONCEPT preview).
   Month selector re-renders income/expense, savings rate, top
   categories, biggest transactions and a written monthly summary. */

(function () {
  "use strict";

  var chart = null;
  var currentKey = "2026-11";

  /* Written summaries, one per month, derived from the demo data. */
  var SUMMARIES = {
    "2026-09":
      "September was the heaviest spending month of the quarter: ₹45,800 went out against ₹60,000 of income, " +
      "leaving a savings rate of 23.7%. Food was the outlier at ₹9,200 — the highest of the three months — " +
      "while rent held steady at ₹21,000. The ₹11,000 moved to savings kept the emergency fund on track, but " +
      "the month's 'Other' spending (₹6,800) is the line to watch: it is the least explained slice of the quarter. " +
      "The fix for October was simple — cook more, order less — and it worked.",
    "2026-10":
      "October tightened up nicely. Spending fell to ₹43,100, lifting the savings rate to 28.2% — the best of the " +
      "quarter so far. Food dropped ₹800 to ₹8,400, the clearest sign the September cooking habit stuck, though " +
      "Transport rose to ₹4,600 on an airport trip and extra rides. The winter jacket (₹3,299 at Myntra) was the " +
      "month's biggest discretionary purchase, and savings rose to ₹11,500. With two months of the quarter done, " +
      "the pattern is set: fixed costs are flat, food is the swing factor.",
    "2026-11":
      "November is the strongest month of the quarter so far. Spending through the 21st is ₹41,600 against ₹60,000 " +
      "of income — a 30.7% savings rate, the highest yet — helped by a ₹4,500 freelance payment on top of salary. " +
      "Rent (₹21,000) remains the single biggest line at 35% of income, and the ₹10,000 Nifty 50 SIP plus ₹2,000 " +
      "to the emergency fund went out on schedule. Food is steady at ₹8,600. With nine days left and ₹18,400 " +
      "available, the month is on course to close as the quarter's best for savings.",
  };

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderMonth(key) {
    currentKey = key;
    var m = FV_DATA.MONTHS[key];
    if (!m) return;

    var saved = m.income - m.spent;
    var rate = m.income ? Math.round((saved / m.income) * 1000) / 10 : 0;

    document.getElementById("stat-income").textContent = FV.fmtINR(m.income);
    document.getElementById("stat-income-sub").textContent = m.label + " · salary + freelance";
    document.getElementById("stat-spent").textContent = FV.fmtINR(m.spent);
    document.getElementById("stat-spent-sub").textContent =
      key === "2026-11" ? "Through 21 November" : "Full month";
    document.getElementById("stat-rate").textContent = rate + "%";
    document.getElementById("stat-rate-sub").textContent =
      FV.fmtINR(saved) + " kept of " + FV.fmtINR(m.income);
    document.getElementById("chart-sub").textContent = m.label;
    document.getElementById("summary-month").textContent = m.label;
    document.getElementById("summary-text").textContent = SUMMARIES[key] || "";

    /* Income vs expense chart */
    FV.chartDefaults();
    if (chart) chart.destroy();
    chart = new Chart(document.getElementById("report-chart"), {
      type: "bar",
      data: {
        labels: ["Income", "Spent", "Kept"],
        datasets: [{
          data: [m.income, m.spent, saved],
          backgroundColor: ["#0b3b2c", "#d9a441", "#4c9a76"],
          borderRadius: 6,
          barPercentage: 0.55,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return " " + ctx.label + ": " + FV.fmtINR(ctx.parsed.y); },
            },
          },
        },
        scales: {
          y: { ticks: { callback: function (v) { return "₹" + (v / 1000) + "k"; } } },
        },
      },
    });

    /* Top 3 categories */
    var top = m.categories.slice().sort(function (a, b) { return b.amount - a.amount; }).slice(0, 3);
    document.getElementById("top-categories").innerHTML = top.map(function (c, i) {
      var share = m.spent ? Math.round((c.amount / m.spent) * 100) : 0;
      return '<li><span class="dot" style="background:' + c.color + '"></span>' + (i + 1) + ". " + c.name +
        " · " + share + "% <span class=\"amt\">" + FV.fmtINR(c.amount) + "</span></li>";
    }).join("");

    /* Biggest transactions of the month */
    var biggest = FV_DATA.TRANSACTIONS
      .filter(function (t) { return t.date.indexOf(key) === 0; })
      .sort(function (a, b) { return Math.abs(b.amount) - Math.abs(a.amount); })
      .slice(0, 5);
    document.getElementById("biggest-sub").textContent =
      biggest.length ? "Top " + biggest.length + " by size · " + m.label : m.label;
    document.getElementById("biggest-empty").hidden = biggest.length > 0;
    document.getElementById("biggest-table").style.display = biggest.length ? "" : "none";
    document.querySelector("#biggest-table tbody").innerHTML = biggest.map(function (t) {
      var amtClass = t.type === "income" ? "num up" : "num down";
      var amt = (t.type === "income" ? "+" : "−") + FV.fmtINR(Math.abs(t.amount));
      return "<tr><td>" + FV.fmtDate(t.date) + "</td><td><strong>" +
        escapeHtml(t.merchant) + "</strong></td><td>" + escapeHtml(t.category) +
        '</td><td class="' + amtClass + '">' + amt + "</td></tr>";
    }).join("");
  }

  function downloadSummary() {
    var m = FV_DATA.MONTHS[currentKey];
    if (!m) return;
    var saved = m.income - m.spent;
    var rate = m.income ? Math.round((saved / m.income) * 1000) / 10 : 0;
    var top = m.categories.slice().sort(function (a, b) { return b.amount - a.amount; }).slice(0, 3);
    var lines = [
      "FinVerse — Monthly report",
      m.label,
      "=".repeat(24),
      "",
      "Income:      " + FV.fmtINR(m.income),
      "Spent:       " + FV.fmtINR(m.spent),
      "Kept:        " + FV.fmtINR(saved),
      "Savings rate: " + rate + "%",
      "",
      "Top categories:",
    ];
    top.forEach(function (c, i) {
      lines.push("  " + (i + 1) + ". " + c.name + " — " + FV.fmtINR(c.amount));
    });
    lines.push("", "Summary:", SUMMARIES[currentKey] || "");
    lines.push("", "Concept preview — generated from FinVerse demo data.");
    var blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "finverse-report-" + currentKey + ".txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    FV.toast("Downloaded the " + m.short + " summary");
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("month-select").addEventListener("change", function (e) {
      renderMonth(e.target.value);
    });
    document.getElementById("download-summary-btn").addEventListener("click", downloadSummary);
    renderMonth(currentKey);
  });
})();
