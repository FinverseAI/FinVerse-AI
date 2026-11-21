/* FinVerse sample UI — bills page.
   Upcoming / paid bill lists with status toggling and add-bill modal. */

(function () {
  "use strict";

  /* Work on a copy so toggles stay local to this visit. */
  var bills = FV_DATA.BILLS.map(function (b) {
    return {
      id: b.id, name: b.name, payee: b.payee, amount: b.amount,
      due: b.due, dueLabel: b.dueLabel, status: b.status, icon: b.icon,
    };
  });
  var nextId = 100;

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function shortDue(iso) {
    var d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  function renderStats() {
    var dueThisMonth = 0, paidSoFar = 0, upcomingCount = 0, upcomingTotal = 0;
    bills.forEach(function (b) {
      if (b.due.indexOf("2026-11") === 0) dueThisMonth += b.amount;
      if (b.status === "paid") paidSoFar += b.amount;
      else { upcomingCount += 1; upcomingTotal += b.amount; }
    });
    document.getElementById("stat-due").textContent = FV.fmtINR(dueThisMonth);
    document.getElementById("stat-due-sub").textContent = "All bills due in November 2026";
    document.getElementById("stat-paid").textContent = FV.fmtINR(paidSoFar);
    document.getElementById("stat-paid-sub").textContent =
      bills.filter(function (b) { return b.status === "paid"; }).length + " bills settled";
    document.getElementById("stat-upcoming").textContent = upcomingCount;
    document.getElementById("stat-upcoming-sub").textContent =
      FV.fmtINR(upcomingTotal) + " still to pay";
  }

  function billRow(b) {
    var paid = b.status === "paid";
    var badge = paid ? ' <span class="badge badge-up">Paid</span>' : "";
    var btnLabel = paid ? "Mark unpaid" : "Mark paid";
    var btnClass = paid ? "btn btn-ghost btn-sm" : "btn btn-outline btn-sm";
    return '<li><span class="row-icon" aria-hidden="true">' + b.icon + "</span>" +
      '<div class="row-main"><div class="row-title">' + escapeHtml(b.name) + badge + "</div>" +
      '<div class="row-sub">' + escapeHtml(b.payee) + " · Due " + escapeHtml(b.dueLabel) + "</div></div>" +
      '<span class="row-amt">' + FV.fmtINR(b.amount) + "</span>" +
      '<button class="' + btnClass + '" type="button" data-toggle-bill="' + b.id + '">' + btnLabel + "</button></li>";
  }

  function renderLists() {
    var upcoming = bills.filter(function (b) { return b.status !== "paid"; })
      .sort(function (a, b) { return a.due < b.due ? -1 : 1; });
    var paid = bills.filter(function (b) { return b.status === "paid"; })
      .sort(function (a, b) { return a.due < b.due ? -1 : 1; });

    document.getElementById("upcoming-list").innerHTML = upcoming.map(billRow).join("");
    document.getElementById("paid-list").innerHTML = paid.map(billRow).join("");
    document.getElementById("upcoming-empty").hidden = upcoming.length > 0;
    document.getElementById("paid-empty").hidden = paid.length > 0;
  }

  function renderAll() {
    renderStats();
    renderLists();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-toggle-bill]");
      if (!btn) return;
      var id = parseInt(btn.getAttribute("data-toggle-bill"), 10);
      var b = bills.find(function (x) { return x.id === id; });
      if (!b) return;
      b.status = b.status === "paid" ? "upcoming" : "paid";
      renderAll();
      FV.toast(b.status === "paid"
        ? b.name + " marked as paid"
        : b.name + " moved back to upcoming");
    });

    document.getElementById("add-bill-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      bills.push({
        id: nextId++,
        name: form.name.value.trim(),
        payee: form.payee.value.trim(),
        amount: Math.round(parseFloat(form.amount.value)),
        due: form.due.value,
        dueLabel: shortDue(form.due.value),
        status: "upcoming",
        icon: "▭",
      });
      form.reset();
      form.due.value = "2026-11-30";
      FV.closeModal("add-bill-modal");
      renderAll();
      FV.toast("Bill added to upcoming");
    });

    renderAll();
  });
})();
