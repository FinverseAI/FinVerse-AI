/* FinVerse sample UI — budget page.
   Per-category budget cards with editable limits, totals and a
   budget-vs-spent comparison chart. */

(function () {
  "use strict";

  /* Work on a copy so edits stay local to this visit. */
  var budgets = FV_DATA.BUDGETS.map(function (b) {
    return { category: b.category, budget: b.budget, spent: b.spent, icon: b.icon };
  });
  var chart = null;

  function totals() {
    var t = { budget: 0, spent: 0 };
    budgets.forEach(function (b) { t.budget += b.budget; t.spent += b.spent; });
    t.remaining = t.budget - t.spent;
    return t;
  }

  function renderStats() {
    var t = totals();
    document.getElementById("stat-budget").textContent = FV.fmtINR(t.budget);
    document.getElementById("stat-spent").textContent = FV.fmtINR(t.spent);
    document.getElementById("stat-remaining").textContent = FV.fmtINR(t.remaining);
    var pct = t.budget ? Math.round((t.spent / t.budget) * 100) : 0;
    document.getElementById("stat-spent-sub").textContent = pct + "% of the monthly budget";
    document.getElementById("stat-remaining-sub").textContent =
      (100 - pct) + "% of the budget still available";

    var over = budgets.filter(function (b) { return b.budget && b.spent / b.budget > 0.9; });
    var biggest = budgets.slice().sort(function (a, b) { return b.budget - a.budget; })[0];
    var headroom = budgets.slice().sort(function (a, b) {
      return (b.budget - b.spent) - (a.budget - a.spent);
    })[0];
    var kv = document.getElementById("budget-kv");
    kv.innerHTML =
      "<dt>Categories over 90%</dt><dd>" + over.length + " of " + budgets.length + "</dd>" +
      "<dt>Biggest budget</dt><dd>" + biggest.category + " · " + FV.fmtINR(biggest.budget) + "</dd>" +
      "<dt>Most headroom</dt><dd>" + headroom.category + " · " + FV.fmtINR(headroom.budget - headroom.spent) + " left</dd>" +
      "<dt>Income covered</dt><dd>" + FV.fmtINR(FV_DATA.MONTHS["2026-11"].income) + " / month</dd>";
  }

  function renderCards() {
    var wrap = document.getElementById("budget-cards");
    wrap.innerHTML = budgets.map(function (b) {
      var pct = b.budget ? Math.round((b.spent / b.budget) * 100) : 0;
      var barPct = Math.min(pct, 100);
      var over = b.budget && b.spent / b.budget > 0.9;
      var remaining = b.budget - b.spent;
      var remainText = remaining >= 0
        ? FV.fmtINR(remaining) + " left"
        : FV.fmtINR(Math.abs(remaining)) + " over budget";
      return '<section class="card" aria-label="' + b.category + ' budget">' +
        '<div class="card-head"><div style="display:flex;gap:0.75rem;align-items:center">' +
        '<span class="stat-icon" aria-hidden="true" style="font-size:1.15rem">' + b.icon + "</span>" +
        "<h2>" + b.category + "</h2></div>" +
        '<button class="btn btn-outline btn-sm" type="button" data-edit-budget="' + b.category + '">Edit budget</button></div>' +
        '<p style="margin:0 0 0.75rem;color:var(--ink-soft)"><strong>' + FV.fmtINR(b.spent) +
        "</strong> spent of " + FV.fmtINR(b.budget) + "</p>" +
        '<div class="progress' + (over ? " red" : "") + '" role="progressbar" aria-valuenow="' + barPct +
        '" aria-valuemin="0" aria-valuemax="100" aria-label="' + b.category + ' budget used"><i style="width:' + barPct + '%"></i></div>' +
        '<div class="progress-labels"><span>' + pct + "% used</span><strong>" + remainText + "</strong></div>" +
        "</section>";
    }).join("");

    wrap.querySelectorAll("[data-edit-budget]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cat = btn.getAttribute("data-edit-budget");
        var b = budgets.find(function (x) { return x.category === cat; });
        if (!b) return;
        document.getElementById("edit-budget-title").textContent = "Edit budget — " + cat;
        document.getElementById("edit-budget-category").value = cat;
        document.getElementById("edit-budget-amount").value = b.budget;
        document.getElementById("edit-budget-hint").textContent =
          "Spent so far this month: " + FV.fmtINR(b.spent) + ".";
        FV.openModal("edit-budget-modal");
      });
    });
  }

  function renderChart() {
    FV.chartDefaults();
    if (chart) chart.destroy();
    chart = new Chart(document.getElementById("budget-chart"), {
      type: "bar",
      data: {
        labels: budgets.map(function (b) { return b.category; }),
        datasets: [
          {
            label: "Budget",
            data: budgets.map(function (b) { return b.budget; }),
            backgroundColor: "#0b3b2c",
            borderRadius: 4,
          },
          {
            label: "Spent",
            data: budgets.map(function (b) { return b.spent; }),
            backgroundColor: "#d9a441",
            borderRadius: 4,
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
              label: function (ctx) { return " " + ctx.dataset.label + ": " + FV.fmtINR(ctx.parsed.y); },
            },
          },
        },
        scales: {
          y: {
            ticks: { callback: function (v) { return "₹" + (v / 1000) + "k"; } },
          },
        },
      },
    });
  }

  function renderAll() {
    renderStats();
    renderCards();
    renderChart();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("edit-budget-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      var cat = form.category.value;
      var amount = Math.round(parseFloat(form.amount.value));
      var b = budgets.find(function (x) { return x.category === cat; });
      if (!b || isNaN(amount) || amount < 0) return;
      b.budget = amount;
      FV.closeModal("edit-budget-modal");
      renderAll();
      FV.toast(cat + " budget set to " + FV.fmtINR(amount) + " / month");
    });
    renderAll();
  });
})();
