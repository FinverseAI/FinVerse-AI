/* FinVerse sample UI — dashboard page.
   Month selector re-renders stats, donut, legend and bar chart. */

(function () {
  "use strict";

  var donutChart = null;
  var barsChart = null;

  function renderMonth(key) {
    var m = FV_DATA.MONTHS[key];
    if (!m) return;

    document.getElementById("month-title").textContent =
      m.label.replace(" 2026", "") + " overview";
    document.getElementById("stat-income").textContent = FV.fmtINR(m.income);
    document.getElementById("stat-available").textContent = FV.fmtINR(m.available);
    document.getElementById("stat-available-sub").textContent =
      Math.round((m.available / m.income) * 100) + "% of income left";
    document.getElementById("stat-spent").textContent = FV.fmtINR(m.spent);
    var prev = key === "2026-11" ? FV_DATA.MONTHS["2026-10"] : FV_DATA.MONTHS["2026-09"];
    var delta = m.spent - prev.spent;
    document.getElementById("stat-spent-sub").textContent =
      (delta <= 0 ? "↓ " : "↑ ") + FV.fmtINR(Math.abs(delta)) +
      (delta <= 0 ? " less" : " more") + " than " + prev.short;
    var savings = m.categories.find(function (c) { return c.name === "Savings"; });
    document.getElementById("stat-saved").textContent = FV.fmtINR(savings ? savings.amount : 0);

    /* Legend */
    var legend = document.getElementById("donut-legend");
    legend.innerHTML = m.categories.map(function (c) {
      return '<li><span class="dot" style="background:' + c.color + '"></span>' + c.name +
        ' <span class="amt">' + FV.fmtINR(c.amount) + "</span></li>";
    }).join("");

    /* Donut */
    FV.chartDefaults();
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(document.getElementById("donut-chart"), {
      type: "doughnut",
      data: {
        labels: m.categories.map(function (c) { return c.name; }),
        datasets: [{
          data: m.categories.map(function (c) { return c.amount; }),
          backgroundColor: m.categories.map(function (c) { return c.color; }),
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
          tooltip: { callbacks: { label: function (ctx) { return " " + ctx.label + ": " + FV.fmtINR(ctx.parsed); } } },
        },
      },
    });

    /* Daily bars */
    if (barsChart) barsChart.destroy();
    barsChart = new Chart(document.getElementById("bars-chart"), {
      type: "bar",
      data: {
        labels: m.daily.map(function (_, i) { return (i + 1).toString(); }),
        datasets: [{
          data: m.daily,
          backgroundColor: m.daily.map(function (_, i) { return i % 5 === 3 ? "#0b3b2c" : (i % 3 === 1 ? "#a9cbb2" : "#4c9a76"); }),
          borderRadius: 3,
          barPercentage: 0.75,
          categoryPercentage: 0.9,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { title: function (items) { return "Day " + items[0].label + " — " + m.short; }, label: function (ctx) { return " Spent " + FV.fmtINR(ctx.parsed.y); } } },
        },
        scales: {
          x: { grid: { display: false }, title: { display: true, text: "Day of month" } },
          y: { beginAtZero: true, ticks: { callback: function (v) { return "₹" + v.toLocaleString("en-IN"); } } },
        },
      },
    });
  }

  function renderBills() {
    var list = document.getElementById("bills-list");
    var upcoming = FV_DATA.BILLS.filter(function (b) { return b.status === "upcoming"; }).slice(0, 4);
    list.innerHTML = upcoming.map(function (b) {
      return '<li><span class="row-icon" aria-hidden="true">' + b.icon + "</span>" +
        '<div class="row-main"><div class="row-title">' + b.name + '</div><div class="row-sub">Due ' + b.dueLabel + " · " + b.payee + "</div></div>" +
        '<span class="row-amt">' + FV.fmtINR(b.amount) + "</span></li>";
    }).join("");
  }

  function renderGoals() {
    var wrap = document.getElementById("goals-snapshot");
    wrap.innerHTML = FV_DATA.GOALS.slice(0, 2).map(function (g) {
      var pct = Math.round((g.saved / g.target) * 100);
      return "<div><div style='display:flex;justify-content:space-between;gap:1rem;font-size:.9rem'><strong>" + g.name +
        "</strong><span style='color:var(--muted)'>" + pct + "%</span></div>" +
        '<div class="progress" style="margin-top:.4rem"><i style="width:' + pct + '%"></i></div>' +
        '<div class="progress-labels"><span>' + FV.fmtINR(g.saved) + " saved</span><span>Target " + FV.fmtINR(g.target) + "</span></div></div>";
    }).join("");
  }

  function renderRecent(extra) {
    var rows = FV_DATA.TRANSACTIONS.slice(0, 6);
    if (extra) rows = [extra].concat(rows).slice(0, 6);
    document.querySelector("#recent-table tbody").innerHTML = rows.map(function (t) {
      var cls = t.amount < 0 ? "" : "up";
      return "<tr><td>" + FV.fmtDate(t.date) + "</td><td><strong>" + t.merchant + "</strong>" +
        (t.note ? '<div style="font-size:.8rem;color:var(--muted)">' + t.note + "</div>" : "") + "</td>" +
        "<td>" + t.category + '</td><td class="num ' + cls + '">' +
        (t.amount < 0 ? "−" : "+") + FV.fmtINR(Math.abs(t.amount)) + "</td></tr>";
    }).join("");
  }

  function init() {
    var select = document.getElementById("month-select");
    select.addEventListener("change", function () { renderMonth(select.value); });
    renderMonth("2026-11");
    renderBills();
    renderGoals();
    renderRecent(null);

    var cat = document.getElementById("txn-category");
    cat.innerHTML = FV_DATA.CATEGORIES.filter(function (c) { return c !== "Income"; })
      .map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("");

    document.getElementById("add-txn-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var amount = Math.abs(Number(f.amount.value));
      var type = f.type.value;
      var txn = {
        date: f.date.value,
        merchant: f.merchant.value.trim(),
        category: type === "income" ? "Income" : f.category.value,
        amount: type === "income" ? amount : -amount,
        type: type,
        note: "",
      };
      renderRecent(txn);
      FV.closeModal("add-txn-modal");
      FV.toast("Transaction added — " + txn.merchant + " · " + FV.fmtINR(amount));
      f.reset();
      f.date.value = "2026-11-21";
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
