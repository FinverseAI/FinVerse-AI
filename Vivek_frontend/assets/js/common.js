/* FinVerse sample UI — shared shell, navigation and helpers.
   Every app page declares <body data-page="..." data-title="..."> and
   includes two empty roots (#sidebar-root, #topbar-root) that this
   script fills, so the sidebar stays identical on all 20 pages. */

(function () {
  "use strict";

  /* ---------------- Navigation model ---------------- */
  /* concept: true => feature is part of the synopsis vision but not
     built yet in the real app; shown with a gold dot + page badge. */
  var NAV = [
    { group: null, items: [
      { id: "dashboard", label: "Dashboard", file: "dashboard.html", icon: "home" },
    ]},
    { group: "Money", items: [
      { id: "transactions", label: "Transactions", file: "transactions.html", icon: "receipt" },
      { id: "budget", label: "Budget", file: "budget.html", icon: "wallet" },
      { id: "bills", label: "Bills", file: "bills.html", icon: "bell" },
      { id: "goals", label: "Goals", file: "goals.html", icon: "target" },
      { id: "reports", label: "Reports", file: "reports.html", icon: "report", concept: true },
    ]},
    { group: "Investing", items: [
      { id: "market", label: "Market", file: "market.html", icon: "chart" },
      { id: "portfolio", label: "Portfolio", file: "portfolio.html", icon: "briefcase" },
      { id: "watchlist", label: "Watchlist", file: "watchlist.html", icon: "star" },
      { id: "screener", label: "Smart Screener", file: "screener.html", icon: "filter" },
      { id: "optimizer", label: "Optimizer", file: "optimizer.html", icon: "compass" },
    ]},
    { group: "AI Insights", items: [
      { id: "ai-chat", label: "Ask FinVerse AI", file: "ai-chat.html", icon: "chat" },
      { id: "news", label: "News & Sentiment", file: "news.html", icon: "news" },
      { id: "why-moved", label: "Why Did My Stock Move?", file: "why-moved.html", icon: "question", concept: true },
      { id: "regime", label: "Market Regime", file: "regime.html", icon: "gauge", concept: true },
      { id: "simulator", label: "What-If Simulator", file: "simulator.html", icon: "sliders", concept: true },
      { id: "readiness", label: "Investment Readiness", file: "readiness.html", icon: "shield", concept: true },
    ]},
    { group: "Account", items: [
      { id: "onboarding", label: "Profile & Risk", file: "onboarding.html", icon: "user" },
      { id: "settings", label: "Settings", file: "settings.html", icon: "gear" },
    ]},
  ];

  /* Pages reachable by link but not listed in the sidebar. */
  var HIDDEN = {
    stock: { label: "Stock detail", highlight: "market" },
  };

  var ICONS = {
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    receipt: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21z"/><path d="M9 8h6M9 12h6"/></svg>',
    wallet: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h13v4H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1"/><circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
    bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/></svg>',
    target: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>',
    report: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
    chart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
    briefcase: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></svg>',
    star: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6L12 16.9 6.6 19.6l1.1-6L3.2 9.4l6.1-.8z"/></svg>',
    filter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6.5 8v5.5L10.5 21v-8z"/></svg>',
    compass: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
    chat: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>',
    news: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 8h2a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2"/><path d="M7 9h7M7 13h7"/></svg>',
    question: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.4 9a2.6 2.6 0 1 1 3.6 2.4c-.9.4-1 .9-1 1.6"/><path d="M12 16.5h.01"/></svg>',
    gauge: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14a8 8 0 1 1 16 0"/><path d="M12 14l4-4"/><path d="M4 18h16"/></svg>',
    sliders: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h10M18 8h2M4 16h4M12 16h8"/><circle cx="16" cy="8" r="2.2"/><circle cx="10" cy="16" r="2.2"/></svg>',
    shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8.4 7 10 4-1.6 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4.5"/></svg>',
    user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/></svg>',
    gear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8"/></svg>',
  };

  var LOGO_MARK = '<svg class="logo-mark" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="2" y="14" width="4.5" height="8" rx="1"/><rect x="9.5" y="9" width="4.5" height="13" rx="1"/><rect x="17" y="3" width="4.5" height="19" rx="1"/></svg>';

  /* ---------------- Formatting helpers ---------------- */
  function fmtINR(n, decimals) {
    var v = Number(n) || 0;
    return "₹" + v.toLocaleString("en-IN", {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals || 0,
    });
  }
  function fmtNum(n, decimals) {
    return (Number(n) || 0).toLocaleString("en-IN", {
      minimumFractionDigits: decimals == null ? 2 : decimals,
      maximumFractionDigits: decimals == null ? 2 : decimals,
    });
  }
  function fmtSigned(n, suffix) {
    var v = Number(n) || 0;
    return (v >= 0 ? "+" : "") + fmtNum(v) + (suffix || "%");
  }
  function fmtCrore(n) {
    var v = Number(n) || 0;
    return "₹" + v.toLocaleString("en-IN") + " cr";
  }
  function fmtDate(iso) {
    var d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
  function stockLink(symbol) {
    return "stock.html?symbol=" + encodeURIComponent(symbol);
  }

  /* ---------------- Toast ---------------- */
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  /* ---------------- Modal ---------------- */
  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.add("open");
    var first = m.querySelector("input, select, textarea, button");
    if (first) first.focus();
  }
  function closeModal(el) {
    var m = typeof el === "string" ? document.getElementById(el) : el.closest(".modal-backdrop");
    if (m) m.classList.remove("open");
  }

  /* ---------------- Chart.js defaults ---------------- */
  function chartDefaults() {
    if (typeof Chart === "undefined") return;
    Chart.defaults.font.family = "'Inter', -apple-system, 'Segoe UI', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = "#6e7568";
    Chart.defaults.borderColor = "#ede6d2";
    Chart.defaults.plugins.tooltip.backgroundColor = "#0b3b2c";
    Chart.defaults.plugins.tooltip.titleFont = { weight: "600" };
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
  }
  var GREEN_PALETTE = ["#0b3b2c", "#2e7d5b", "#7fb392", "#a9cbb2", "#d9a441", "#114e3a", "#4c9a76", "#c9dec9"];

  /* ---------------- Shell injection ---------------- */
  function buildSidebar(pageId) {
    var activeId = (HIDDEN[pageId] && HIDDEN[pageId].highlight) || pageId;
    var html = '<aside class="sidebar" id="sidebar" aria-label="Main navigation">';
    html += '<div class="sidebar-head"><a class="logo" href="../index.html">' + LOGO_MARK +
      '<span class="logo-word">FinVerse</span></a></div>';
    html += '<nav class="sidebar-nav">';
    NAV.forEach(function (section) {
      if (section.group) {
        html += '<div class="nav-group-label">' + section.group + "</div>";
      }
      section.items.forEach(function (item) {
        var active = item.id === activeId ? " active" : "";
        var aria = item.id === activeId ? ' aria-current="page"' : "";
        var dot = item.concept
          ? '<span class="concept-dot" title="Concept preview — planned, not built yet"></span>'
          : "";
        html += '<a class="nav-link' + active + '" href="' + item.file + '"' + aria + ">" +
          ICONS[item.icon] + "<span>" + item.label + "</span>" + dot + "</a>";
      });
    });
    html += "</nav>";
    html += '<div class="sidebar-foot"><strong>Vivek Bartwal</strong>Demo account · Team CSE27-079<br>Sample UI — demo data only</div>';
    html += "</aside>";
    return html;
  }

  function buildTopbar(pageId, title) {
    var hidden = HIDDEN[pageId];
    var label = title || (hidden ? hidden.label : pageId);
    return '<header class="topbar">' +
      '<button class="hamburger" id="hamburger" type="button" aria-label="Open navigation" aria-expanded="false">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
      '<span class="topbar-title">' + label + "</span>" +
      '<div class="topbar-right"><span class="badge badge-demo">Demo data</span>' +
      '<a class="avatar-chip" href="settings.html"><span class="avatar" aria-hidden="true">VB</span><span class="avatar-name">Vivek</span></a></div>' +
      "</header>";
  }

  function initShell() {
    var body = document.body;
    var pageId = body.getAttribute("data-page") || "dashboard";
    var title = body.getAttribute("data-title") || "";
    var sRoot = document.getElementById("sidebar-root");
    var tRoot = document.getElementById("topbar-root");
    if (sRoot) sRoot.innerHTML = buildSidebar(pageId);
    if (tRoot) tRoot.innerHTML = buildTopbar(pageId, title);

    var sidebar = document.getElementById("sidebar");
    var backdrop = document.getElementById("sidebar-backdrop");
    var burger = document.getElementById("hamburger");
    function closeSidebar() {
      if (!sidebar) return;
      sidebar.classList.remove("open");
      if (backdrop) backdrop.classList.remove("show");
      if (burger) burger.setAttribute("aria-expanded", "false");
    }
    if (burger && sidebar) {
      burger.addEventListener("click", function () {
        var open = sidebar.classList.toggle("open");
        if (backdrop) backdrop.classList.toggle("show", open);
        burger.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    if (backdrop) backdrop.addEventListener("click", closeSidebar);
    if (sidebar) {
      sidebar.addEventListener("click", function (e) {
        if (e.target.closest("a")) closeSidebar();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeSidebar();
        document.querySelectorAll(".modal-backdrop.open").forEach(function (m) {
          m.classList.remove("open");
        });
      }
    });
    document.querySelectorAll(".modal-backdrop").forEach(function (m) {
      m.addEventListener("click", function (e) {
        if (e.target === m) m.classList.remove("open");
      });
    });
    document.querySelectorAll("[data-close-modal]").forEach(function (btn) {
      btn.addEventListener("click", function () { closeModal(btn); });
    });
    document.querySelectorAll("[data-open-modal]").forEach(function (btn) {
      btn.addEventListener("click", function () { openModal(btn.getAttribute("data-open-modal")); });
    });
  }

  window.FV = {
    fmtINR: fmtINR, fmtNum: fmtNum, fmtSigned: fmtSigned, fmtCrore: fmtCrore,
    fmtDate: fmtDate, getParam: getParam, stockLink: stockLink,
    toast: toast, openModal: openModal, closeModal: closeModal,
    chartDefaults: chartDefaults, GREEN_PALETTE: GREEN_PALETTE,
    NAV: NAV, ICONS: ICONS, LOGO_MARK: LOGO_MARK,
  };

  document.addEventListener("DOMContentLoaded", initShell);
})();
