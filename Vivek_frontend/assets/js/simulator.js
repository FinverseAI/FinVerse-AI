/* FinVerse sample UI — What-If Simulator page (concept preview).
   Future value of a monthly SIP + lump sum, monthly compounding,
   compared across bear (6%), base (11%) and bull (14%) scenarios. */

(function () {
  "use strict";

  var SCENARIOS = [
    { name: "Bear", rate: 6, color: "#b3402e" },
    { name: "Base", rate: 11, color: "#0b3b2c" },
    { name: "Bull", rate: 14, color: "#2e7d5b" },
  ];

  var chart = null;
  var selectedRate = 11;
  var selectedName = "Base";

  function inputs() {
    return {
      sip: Math.max(0, parseFloat(document.getElementById("sim-sip").value) || 0),
      lump: Math.max(0, parseFloat(document.getElementById("sim-lumpsum").value) || 0),
      years: parseInt(document.getElementById("sim-years").value, 10) || 1,
      rate: parseFloat(document.getElementById("sim-return").value) || 0,
    };
  }

  /* Future value after n months at monthly rate i (contributions at month start). */
  function futureValue(sip, lump, annualRate, months) {
    var i = annualRate / 100 / 12;
    if (i === 0) return lump + sip * months;
    var growth = Math.pow(1 + i, months);
    var sipFV = sip * ((growth - 1) / i) * (1 + i);
    return lump * growth + sipFV;
  }

  function scenarioNameFor(rate) {
    var match = SCENARIOS.find(function (s) { return s.rate === rate; });
    return match ? match.name : "Custom";
  }

  function render() {
    var inp = inputs();
    selectedRate = inp.rate;
    selectedName = scenarioNameFor(inp.rate);

    document.getElementById("sim-years-label").textContent = inp.years;
    document.getElementById("sim-return-label").textContent = inp.rate + "%";

    var months = inp.years * 12;
    var invested = inp.sip * months + inp.lump;
    var value = futureValue(inp.sip, inp.lump, inp.rate, months);
    var gained = value - invested;

    document.getElementById("out-value").textContent = FV.fmtINR(Math.round(value));
    document.getElementById("out-value-sub").textContent =
      selectedName + " scenario · " + inp.rate + "% per year · " + inp.years + " years";
    document.getElementById("out-invested").textContent = FV.fmtINR(invested);
    document.getElementById("out-gained").textContent = FV.fmtINR(Math.round(gained));
    document.getElementById("out-gained-sub").textContent =
      invested > 0 ? Math.round((gained / invested) * 100) + "% growth over what you put in" : "Growth over what you put in";

    /* SIP boost line: +₹2,000/month. */
    var boosted = futureValue(inp.sip + 2000, inp.lump, inp.rate, months);
    document.getElementById("sip-boost-line").innerHTML =
      "<strong>Small step, big difference.</strong> Increasing your SIP by " + FV.fmtINR(2000) +
      "/month would add <strong>" + FV.fmtINR(Math.round(boosted - value)) + "</strong> by year " +
      inp.years + " at " + inp.rate + "% per year.";

    /* Chart: three scenarios over the years. */
    var labels = [];
    for (var y = 0; y <= inp.years; y++) labels.push("Year " + y);
    FV.chartDefaults();
    if (chart) chart.destroy();
    chart = new Chart(document.getElementById("sim-chart"), {
      type: "line",
      data: {
        labels: labels,
        datasets: SCENARIOS.map(function (s) {
          return {
            label: s.name + " (" + s.rate + "%)",
            data: labels.map(function (_, yi) {
              return Math.round(futureValue(inp.sip, inp.lump, s.rate, yi * 12));
            }),
            borderColor: s.color,
            backgroundColor: s.color,
            borderWidth: s.rate === selectedRate ? 3 : 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.15,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          y: { ticks: { callback: function (v) { return "₹" + (v / 100000).toFixed(1) + "L"; } } },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function (ctx) { return " " + ctx.dataset.label + ": " + FV.fmtINR(ctx.parsed.y); },
            },
          },
        },
      },
    });

    /* Year-by-year table for the selected scenario. */
    document.getElementById("table-sub").textContent =
      selectedName + " scenario · " + inp.rate + "% per year";
    var rows = "";
    for (var yr = 1; yr <= inp.years; yr++) {
      var inv = inp.sip * yr * 12 + inp.lump;
      var val = futureValue(inp.sip, inp.lump, inp.rate, yr * 12);
      rows += "<tr><td><strong>Year " + yr + "</strong></td>" +
        '<td class="num">' + FV.fmtINR(inv) + '</td>' +
        '<td class="num"><strong>' + FV.fmtINR(Math.round(val)) + "</strong></td>" +
        '<td class="num up">' + FV.fmtINR(Math.round(val - inv)) + "</td></tr>";
    }
    document.querySelector("#sim-table tbody").innerHTML = rows;
  }

  function markActivePreset() {
    var rate = parseFloat(document.getElementById("sim-return").value);
    document.querySelectorAll("#scenario-switch button").forEach(function (btn) {
      btn.classList.toggle("active", parseFloat(btn.getAttribute("data-return")) === rate);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["sim-sip", "sim-lumpsum", "sim-years", "sim-return"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", function () {
        markActivePreset();
        render();
      });
    });

    document.querySelectorAll("#scenario-switch button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.getElementById("sim-return").value = btn.getAttribute("data-return");
        markActivePreset();
        render();
        FV.toast(btn.textContent.trim() + " scenario selected.");
      });
    });

    render();
  });
})();
