/* FinVerse sample UI — goals page.
   Savings-goal cards with contributions, monthly-needed math
   (from November 2026 to each deadline) and new-goal creation. */

(function () {
  "use strict";

  /* Work on a copy so edits stay local to this visit. */
  var goals = FV_DATA.GOALS.map(function (g) {
    return {
      id: g.id, name: g.name, target: g.target, saved: g.saved,
      deadline: g.deadline, icon: g.icon,
    };
  });
  var nextId = 100;

  /* Demo "today" is November 2026. */
  var NOW_YEAR = 2026;
  var NOW_MONTH = 11;

  var MONTH_NAMES = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  };
  var MONTH_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* Deadline labels look like "Jun 2027". */
  function monthsToDeadline(label) {
    var parts = label.split(" ");
    var month = MONTH_NAMES[parts[0]] || 1;
    var year = parseInt(parts[1], 10) || NOW_YEAR;
    var months = (year - NOW_YEAR) * 12 + (month - NOW_MONTH);
    return Math.max(months, 1);
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderCards() {
    var wrap = document.getElementById("goal-cards");
    wrap.innerHTML = goals.map(function (g) {
      var pct = g.target ? Math.round((g.saved / g.target) * 100) : 0;
      var barPct = Math.min(pct, 100);
      var remaining = Math.max(g.target - g.saved, 0);
      var months = monthsToDeadline(g.deadline);
      var monthly = remaining > 0 ? Math.ceil(remaining / months) : 0;
      var monthlyText = remaining > 0
        ? FV.fmtINR(monthly) + " / month for " + months + " months"
        : "Goal reached — well done";
      return '<section class="card" aria-label="' + escapeHtml(g.name) + '">' +
        '<div class="card-head"><div style="display:flex;gap:0.75rem;align-items:center">' +
        '<span class="stat-icon" aria-hidden="true" style="font-size:1.15rem">' + g.icon + "</span>" +
        "<h2>" + escapeHtml(g.name) + "</h2></div>" +
        '<button class="btn btn-outline btn-sm" type="button" data-contribute="' + g.id + '">Add contribution</button></div>' +
        '<p style="margin:0 0 0.75rem;color:var(--ink-soft)"><strong>' + FV.fmtINR(g.saved) +
        "</strong> saved of " + FV.fmtINR(g.target) + " · due " + escapeHtml(g.deadline) + "</p>" +
        '<div class="progress' + (pct >= 100 ? " gold" : "") + '" role="progressbar" aria-valuenow="' + barPct +
        '" aria-valuemin="0" aria-valuemax="100" aria-label="' + escapeHtml(g.name) + ' progress"><i style="width:' + barPct + '%"></i></div>' +
        '<div class="progress-labels"><span>' + pct + "% funded</span><strong>" + monthlyText + "</strong></div>" +
        "</section>";
    }).join("");

    wrap.querySelectorAll("[data-contribute]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = parseInt(btn.getAttribute("data-contribute"), 10);
        var g = goals.find(function (x) { return x.id === id; });
        if (!g) return;
        document.getElementById("contribute-title").textContent =
          "Add to " + g.name;
        document.getElementById("contribute-goal-id").value = g.id;
        document.getElementById("contribute-amount").value = "";
        document.getElementById("contribute-hint").textContent =
          "Saved so far: " + FV.fmtINR(g.saved) + " of " + FV.fmtINR(g.target) +
          " · " + FV.fmtINR(Math.max(g.target - g.saved, 0)) + " still needed.";
        FV.openModal("contribute-modal");
      });
    });
  }

  function renderSummary() {
    var saved = 0, target = 0, monthly = 0;
    goals.forEach(function (g) {
      saved += g.saved;
      target += g.target;
      var remaining = Math.max(g.target - g.saved, 0);
      if (remaining > 0) monthly += Math.ceil(remaining / monthsToDeadline(g.deadline));
    });
    var pct = target ? Math.round((saved / target) * 100) : 0;
    document.getElementById("goals-kv").innerHTML =
      "<dt>Total saved</dt><dd>" + FV.fmtINR(saved) + "</dd>" +
      "<dt>Total targets</dt><dd>" + FV.fmtINR(target) + "</dd>" +
      "<dt>Overall funded</dt><dd>" + pct + "%</dd>" +
      "<dt>Monthly needed, all goals</dt><dd>" + FV.fmtINR(monthly) + " / month</dd>";
  }

  function renderAll() {
    renderCards();
    renderSummary();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("contribute-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      var id = parseInt(form.goalId.value, 10);
      var amount = Math.round(parseFloat(form.amount.value));
      var g = goals.find(function (x) { return x.id === id; });
      if (!g || isNaN(amount) || amount <= 0) return;
      g.saved += amount;
      FV.closeModal("contribute-modal");
      renderAll();
      FV.toast(FV.fmtINR(amount) + " added to " + g.name +
        (g.saved >= g.target ? " — goal reached!" : ""));
    });

    document.getElementById("new-goal-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      var parts = form.deadline.value.split("-");
      var label = MONTH_SHORT[parseInt(parts[1], 10)] + " " + parts[0];
      goals.push({
        id: nextId++,
        name: form.name.value.trim(),
        target: Math.round(parseFloat(form.target.value)),
        saved: 0,
        deadline: label,
        icon: "⬢",
      });
      form.reset();
      form.deadline.value = "2027-06";
      FV.closeModal("new-goal-modal");
      renderAll();
      FV.toast("Goal created — start with a first contribution");
    });

    renderAll();
  });
})();
