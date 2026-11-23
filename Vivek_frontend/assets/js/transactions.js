/* FinVerse sample UI — transactions page.
   Full ledger with search / category / type filters, live totals,
   add-transaction modal, plain-words entry and CSV export. */

(function () {
  "use strict";

  var added = []; /* user-added transactions, kept in memory for this visit */
  var nextId = 1000;

  function allTxns() {
    return added.concat(FV_DATA.TRANSACTIONS).slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.id - a.id;
    });
  }

  function filteredTxns() {
    var q = document.getElementById("txn-search").value.trim().toLowerCase();
    var cat = document.getElementById("txn-category").value;
    var type = document.getElementById("txn-type").value;
    return allTxns().filter(function (t) {
      if (cat && t.category !== cat) return false;
      if (type && t.type !== type) return false;
      if (q) {
        var hay = (t.merchant + " " + (t.note || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function render() {
    var rows = filteredTxns();
    var tbody = document.querySelector("#txn-table tbody");
    var income = 0, expenses = 0;
    rows.forEach(function (t) {
      if (t.type === "income") income += t.amount;
      else expenses += Math.abs(t.amount);
    });

    document.getElementById("sum-income").textContent = FV.fmtINR(income);
    document.getElementById("sum-expenses").textContent = FV.fmtINR(expenses);
    document.getElementById("sum-net").textContent = FV.fmtINR(income - expenses);
    document.getElementById("sum-income-sub").textContent =
      rows.filter(function (t) { return t.type === "income"; }).length + " income entries";
    document.getElementById("sum-expenses-sub").textContent =
      rows.filter(function (t) { return t.type === "expense"; }).length + " expense entries";
    document.getElementById("sum-net-sub").textContent =
      (income - expenses) >= 0 ? "Surplus for this filter" : "Deficit for this filter";
    document.getElementById("txn-count").textContent =
      rows.length + " of " + allTxns().length + " transactions · newest first.";

    document.getElementById("txn-empty").hidden = rows.length > 0;
    document.getElementById("txn-table").style.display = rows.length ? "" : "none";

    tbody.innerHTML = rows.map(function (t) {
      var amtClass = t.type === "income" ? "num up" : "num down";
      var amt = (t.type === "income" ? "+" : "−") + FV.fmtINR(Math.abs(t.amount));
      return "<tr><td>" + FV.fmtDate(t.date) + "</td><td><strong>" +
        escapeHtml(t.merchant) + "</strong></td><td>" + escapeHtml(t.category) +
        "</td><td>" + escapeHtml(t.note || "—") + '</td><td class="' + amtClass + '">' +
        amt + "</td></tr>";
    }).join("");
  }

  /* ---------- Plain-words parsing ---------- */
  var KEYWORDS = [
    { words: ["swiggy", "zomato", "blinkit", "bigbasket", "lunch", "dinner", "breakfast", "food", "grocer", "coffee", "starbucks", "restaurant", "pizza", "chai"], category: "Food" },
    { words: ["uber", "ola", "metro", "cab", "taxi", "train", "irctc", "flight", "petrol", "fuel", "bus"], category: "Transport" },
    { words: ["movie", "netflix", "pvr", "bookmyshow", "concert", "entertainment", "spotify", "prime video"], category: "Entertainment" },
    { words: ["rent", "landlord"], category: "Rent" },
    { words: ["amazon", "myntra", "flipkart", "shopping", "clothes", "shoes", "decathlon"], category: "Shopping" },
    { words: ["gym", "pharmacy", "doctor", "hospital", "cult.fit", "medicine", "health"], category: "Health" },
    { words: ["sip", "fund", "investment", "mutual fund", "fd", "deposit"], category: "Savings" },
    { words: ["electricity", "bill", "recharge", "jio", "airtel", "internet", "wifi", "broadband"], category: "Bills" },
    { words: ["salary", "freelance", "refund", "income", "earned"], category: "Income" },
  ];

  function guessCategory(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < KEYWORDS.length; i++) {
      for (var j = 0; j < KEYWORDS[i].words.length; j++) {
        if (lower.indexOf(KEYWORDS[i].words[j]) !== -1) return KEYWORDS[i].category;
      }
    }
    return "Other";
  }

  function addPlainWords() {
    var input = document.getElementById("plain-input");
    var text = input.value.trim();
    if (!text) { FV.toast("Type something first — e.g. ₹500 lunch with friends"); return; }
    var match = text.match(/(?:₹|rs\.?\s*)?\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (!match) { FV.toast("I couldn't find an amount — include a number like ₹500"); return; }
    var amount = Math.round(parseFloat(match[1].replace(/,/g, "")));
    if (!amount || amount <= 0) { FV.toast("That amount doesn't look right — try again"); return; }
    var category = guessCategory(text);
    var merchant = text.replace(match[0], "").replace(/[₹,]/g, "").trim();
    merchant = merchant.replace(/^(for|on|at)\s+/i, "").trim();
    if (!merchant) merchant = category === "Income" ? "Income" : category + " expense";
    merchant = merchant.charAt(0).toUpperCase() + merchant.slice(1);
    var isIncome = category === "Income";
    added.unshift({
      id: nextId++, date: "2026-11-21", merchant: merchant, category: category,
      amount: isIncome ? amount : -amount, type: isIncome ? "income" : "expense",
      note: "Added in plain words",
    });
    input.value = "";
    render();
    FV.toast("Added " + FV.fmtINR(amount) + " under " + category);
  }

  /* ---------- CSV export ---------- */
  function csvCell(v) {
    var s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportCSV() {
    var rows = filteredTxns();
    if (!rows.length) { FV.toast("Nothing to export — no rows match the filters"); return; }
    var lines = [["Date", "Merchant", "Category", "Type", "Amount (₹)", "Note"].join(",")];
    rows.forEach(function (t) {
      lines.push([t.date, csvCell(t.merchant), t.category, t.type, t.amount, csvCell(t.note || "")].join(","));
    });
    var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "finverse-transactions.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    FV.toast("Exported " + rows.length + " transactions as CSV");
  }

  document.addEventListener("DOMContentLoaded", function () {
    /* Populate category selects from shared data */
    var filterSel = document.getElementById("txn-category");
    var modalSel = document.getElementById("modal-txn-category");
    FV_DATA.CATEGORIES.forEach(function (c) {
      var o1 = document.createElement("option");
      o1.value = c; o1.textContent = c;
      filterSel.appendChild(o1);
      var o2 = document.createElement("option");
      o2.value = c; o2.textContent = c;
      modalSel.appendChild(o2);
    });

    document.getElementById("txn-search").addEventListener("input", render);
    document.getElementById("txn-category").addEventListener("change", render);
    document.getElementById("txn-type").addEventListener("change", render);
    document.getElementById("export-csv-btn").addEventListener("click", exportCSV);
    document.getElementById("plain-add-btn").addEventListener("click", addPlainWords);
    document.getElementById("plain-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); addPlainWords(); }
    });

    document.getElementById("add-txn-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      var amount = Math.round(parseFloat(form.amount.value));
      var type = form.type.value;
      added.unshift({
        id: nextId++,
        date: form.date.value,
        merchant: form.merchant.value.trim(),
        category: form.category.value,
        amount: type === "income" ? amount : -amount,
        type: type,
        note: "",
      });
      form.reset();
      form.date.value = "2026-11-21";
      FV.closeModal("add-txn-modal");
      render();
      FV.toast("Transaction added");
    });

    render();
  });
})();
