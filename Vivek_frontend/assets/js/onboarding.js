/* FinVerse sample UI — Profile & Risk (onboarding) page.
   Profile form saves with a toast; the 5-question quiz scores 5–25
   and maps to Conservative / Moderate / Aggressive with a suggested
   allocation donut. */

(function () {
  "use strict";

  var PROFILES = {
    Conservative: {
      min: 5, max: 11,
      allocation: [
        { label: "Equity", value: 30, color: "#0b3b2c" },
        { label: "Debt", value: 50, color: "#2e7d5b" },
        { label: "Gold", value: 10, color: "#d9a441" },
        { label: "Cash", value: 10, color: "#a9cbb2" },
      ],
      explanation: "You value protecting your capital over chasing returns. A debt-heavy mix with a modest equity slice grows your money steadily while keeping big falls unlikely — and your emergency fund stays fully separate.",
    },
    Moderate: {
      min: 12, max: 18,
      allocation: [
        { label: "Equity", value: 55, color: "#0b3b2c" },
        { label: "Debt", value: 30, color: "#2e7d5b" },
        { label: "Gold", value: 5, color: "#d9a441" },
        { label: "Cash", value: 10, color: "#a9cbb2" },
      ],
      explanation: "You are comfortable with normal market ups and downs in exchange for better long-term growth. An equity-led mix with a solid debt cushion fits that balance — steady SIPs, no panic selling on a 20% dip.",
    },
    Aggressive: {
      min: 19, max: 25,
      allocation: [
        { label: "Equity", value: 75, color: "#0b3b2c" },
        { label: "Debt", value: 15, color: "#2e7d5b" },
        { label: "Gold", value: 5, color: "#d9a441" },
        { label: "Cash", value: 5, color: "#a9cbb2" },
      ],
      explanation: "You have a long horizon, stable income and the stomach for volatility. An equity-heavy mix aims for maximum long-term growth — but it means accepting 20–30% falls along the way without selling.",
    },
  };

  var allocChart = null;

  function profileFor(total) {
    if (total <= 11) return "Conservative";
    if (total <= 18) return "Moderate";
    return "Aggressive";
  }

  function showProfile(total) {
    var name = profileFor(total);
    var p = PROFILES[name];

    document.getElementById("profile-result").hidden = false;
    document.getElementById("result-badge").textContent = name;
    document.getElementById("result-score").textContent =
      "Quiz score " + total + " out of 25 · " + name + " (" + p.min + "–" + p.max + ")";
    document.getElementById("result-explanation").textContent = p.explanation;

    document.getElementById("result-legend").innerHTML = p.allocation.map(function (a) {
      return '<li><span class="dot" style="background:' + a.color + '"></span>' + a.label +
        ' <span class="amt">' + a.value + "%</span></li>";
    }).join("");

    FV.chartDefaults();
    if (allocChart) allocChart.destroy();
    allocChart = new Chart(document.getElementById("allocation-chart"), {
      type: "doughnut",
      data: {
        labels: p.allocation.map(function (a) { return a.label; }),
        datasets: [{
          data: p.allocation.map(function (a) { return a.value; }),
          backgroundColor: p.allocation.map(function (a) { return a.color; }),
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
          tooltip: { callbacks: { label: function (ctx) { return " " + ctx.label + ": " + ctx.parsed + "%"; } } },
        },
      },
    });

    document.getElementById("profile-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
    FV.toast("Your risk profile is " + name + " (" + total + "/25).");
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("profile-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("profile-name").value.trim() || "Vivek Bartwal";
      FV.toast("Profile saved for " + name + ".");
    });

    document.getElementById("quiz-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var total = 0;
      for (var q = 1; q <= 5; q++) {
        var checked = document.querySelector('input[name="q' + q + '"]:checked');
        total += checked ? parseInt(checked.value, 10) : 3;
      }
      showProfile(total);
    });
  });
})();
