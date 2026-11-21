/* FinVerse sample UI — Investment Readiness page (concept preview).
   Score ring and factor cards from FV_DATA.READINESS; the improvement
   checklist updates the displayed score live (capped at 95). */

(function () {
  "use strict";

  var BASE_SCORE = 72;

  function currentScore() {
    var bonus = 0;
    document.querySelectorAll("#improve-list input[type='checkbox']").forEach(function (box) {
      if (box.checked) bonus += parseInt(box.getAttribute("data-points"), 10) || 0;
    });
    return Math.min(95, BASE_SCORE + bonus);
  }

  function renderScore() {
    var score = currentScore();
    document.getElementById("score-num").textContent = score;
    document.getElementById("score-ring").style.setProperty("--pct", score + "%");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var r = FV_DATA.READINESS;
    BASE_SCORE = r.score;

    document.getElementById("score-num").textContent = r.score;
    document.getElementById("score-ring").style.setProperty("--pct", r.score + "%");
    document.getElementById("score-verdict").textContent = r.verdict;
    document.getElementById("readiness-suggestion").textContent = r.suggestion;

    document.getElementById("factors-grid").innerHTML = r.factors.map(function (f) {
      var barClass = f.score >= 75 ? "" : f.score >= 60 ? " gold" : " red";
      return '<div class="card">' +
        '<div class="card-head"><div><h3>' + f.name + "</h3></div>" +
        '<span class="badge badge-neutral">Weight ' + f.weight + "%</span></div>" +
        '<div class="stat-value" style="font-size:1.4rem;margin-bottom:0.5rem">' + f.score + '<span style="font-size:0.95rem;color:var(--muted)"> / 100</span></div>' +
        '<div class="progress' + barClass + '"><i style="width:' + f.score + '%"></i></div>' +
        '<p style="color:var(--ink-soft);margin:0.75rem 0 0;font-size:0.92rem">' + f.detail + "</p>" +
        "</div>";
    }).join("");

    document.querySelectorAll("#improve-list input[type='checkbox']").forEach(function (box) {
      box.addEventListener("change", function () {
        renderScore();
        var label = box.parentElement.textContent.trim().replace(/\s+/g, " ");
        if (box.checked) {
          FV.toast("Done — score is now " + currentScore() + "/100.");
        } else {
          FV.toast("Removed — score is back to " + currentScore() + "/100.");
        }
      });
    });
  });
})();
