/* FinVerse sample UI — settings page.
   Profile editing, preferences, notification toggles and demo-data tools. */

(function () {
  "use strict";

  var editing = false;
  var profileFields = ["profile-name", "profile-email", "profile-team"];

  function downloadJSON(filename, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  document.addEventListener("DOMContentLoaded", function () {
    /* ---------- Profile: Edit toggles fields editable, Save toasts ---------- */
    var editBtn = document.getElementById("profile-edit-btn");
    editBtn.addEventListener("click", function () {
      editing = !editing;
      profileFields.forEach(function (id) {
        document.getElementById(id).readOnly = !editing;
      });
      editBtn.textContent = editing ? "Save" : "Edit";
      if (editing) {
        document.getElementById("profile-name").focus();
      } else {
        FV.toast("Profile saved");
      }
    });

    /* ---------- Preferences ---------- */
    document.getElementById("pref-month-start").addEventListener("change", function (e) {
      var day = e.target.value;
      var suffix = day === "1" ? "st" : "th";
      FV.toast("Month will start on the " + day + suffix + " from next month");
    });
    document.getElementById("pref-landing").addEventListener("change", function (e) {
      var label = e.target.options[e.target.selectedIndex].text;
      FV.toast("Default landing page set to " + label);
    });

    /* ---------- Notifications ---------- */
    [
      { id: "notif-bills", label: "Bill reminders" },
      { id: "notif-goals", label: "Goal milestones" },
      { id: "notif-market", label: "Market alerts" },
    ].forEach(function (n) {
      document.getElementById(n.id).addEventListener("change", function (e) {
        FV.toast(n.label + (e.target.checked ? " on" : " off"));
      });
    });

    /* ---------- Data ---------- */
    document.getElementById("export-data-btn").addEventListener("click", function () {
      downloadJSON("finverse-demo-data.json", {
        exportedAt: "2026-11-21",
        account: "Vivek Bartwal · Team CSE27-079",
        transactions: FV_DATA.TRANSACTIONS,
        budgets: FV_DATA.BUDGETS,
        bills: FV_DATA.BILLS,
        goals: FV_DATA.GOALS,
      });
      FV.toast("Demo data exported as JSON");
    });
    document.getElementById("reset-data-btn").addEventListener("click", function () {
      FV.toast("Demo data resets on reload — nothing to clear");
    });
  });
})();
