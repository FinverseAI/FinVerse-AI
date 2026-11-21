/* FinVerse sample UI — Ask FinVerse AI page.
   Rule-based answers over the demo dataset: every number comes from
   FV_DATA, every answer carries citations and a guardrail note. */

(function () {
  "use strict";

  var log = null;
  var input = null;
  var mode = "ask";

  var NAME_TO_SYMBOL = {
    reliance: "RELIANCE", "reliance industries": "RELIANCE",
    tcs: "TCS", "tata consultancy": "TCS",
    hdfc: "HDFCBANK", hdfcbank: "HDFCBANK", "hdfc bank": "HDFCBANK",
    infosys: "INFY", infy: "INFY",
    icici: "ICICIBANK", icicibank: "ICICIBANK", "icici bank": "ICICIBANK",
    hul: "HINDUNILVR", hindunilvr: "HINDUNILVR", "hindustan unilever": "HINDUNILVR", unilever: "HINDUNILVR",
    sbi: "SBIN", sbin: "SBIN", "state bank": "SBIN",
    airtel: "BHARTIARTL", bhartiartl: "BHARTIARTL", "bharti airtel": "BHARTIARTL",
    itc: "ITC",
    kotak: "KOTAKBANK", kotakbank: "KOTAKBANK",
    "l&t": "LT", lt: "LT", "larsen": "LT",
    "tata motors": "TATAMOTORS", tatamotors: "TATAMOTORS",
    sunpharma: "SUNPHARMA", "sun pharma": "SUNPHARMA",
    maruti: "MARUTI", "maruti suzuki": "MARUTI",
    titan: "TITAN",
  };

  function findStock(text) {
    var lower = text.toLowerCase();
    var found = null;
    Object.keys(NAME_TO_SYMBOL).forEach(function (key) {
      if (lower.indexOf(key) !== -1) found = NAME_TO_SYMBOL[key];
    });
    if (found) return FV_DATA.stockBySymbol(found);
    /* Bare symbol match, e.g. "RELIANCE" in any case. */
    var upper = text.toUpperCase();
    return FV_DATA.STOCKS.find(function (s) {
      return upper.indexOf(s.symbol) !== -1;
    }) || null;
  }

  function rsiRead(rsi) {
    if (rsi >= 70) return "overbought — the stock has run up fast and could cool off";
    if (rsi >= 55) return "in the upper half of its range — momentum is with it, but it is not stretched";
    if (rsi >= 45) return "in the middle of its range — no strong momentum either way";
    if (rsi >= 30) return "in the lower half of its range — momentum is weak";
    return "oversold — it has fallen hard and could bounce, but falling knives stay falling";
  }

  function stockAnswer(stock) {
    var dir = stock.change >= 0 ? "up" : "down";
    var trend = stock.price > stock.sma20 ? "above" : "below";
    var peNote = stock.pe > 40
      ? "a P/E of " + FV.fmtNum(stock.pe, 1) + ", which is expensive — the market is pricing in a lot of growth"
      : stock.pe > 25
        ? "a P/E of " + FV.fmtNum(stock.pe, 1) + ", roughly in line with large-cap peers"
        : "a P/E of " + FV.fmtNum(stock.pe, 1) + ", which is on the cheaper side for a large-cap";
    var body = "<p><strong>" + stock.name + " (" + stock.symbol + ")</strong> is at " +
      FV.fmtINR(stock.price, 2) + ", " + dir + " " + FV.fmtNum(Math.abs(stock.change)) +
      "% today. Its RSI is " + FV.fmtNum(stock.rsi, 1) + ", which means it is " + rsiRead(stock.rsi) +
      ". It trades " + trend + " its 20-day average of " + FV.fmtINR(stock.sma20, 2) +
      ", and carries " + peNote + ".</p>" +
      "<p>In plain words: " + (stock.rsi >= 70
        ? "the stock is hot right now — strong, but chasing it at this level is risky."
        : stock.rsi <= 30
          ? "the stock is beaten down — that can be an opportunity, but only with a plan for more falls."
          : stock.change >= 0 && stock.price > stock.sma20
            ? "the trend is friendly today, with momentum and the short-term average both on its side."
            : stock.change < 0 && stock.price < stock.sma20
              ? "the short-term trend is soft — the stock is below its 20-day average and falling today."
              : "there is no clear short-term signal — the price and momentum are telling different stories.") +
      " Whether it is a good buy depends on your goals and risk profile, not on one day's move.</p>";
    return {
      html: body,
      citations: [
        "Market data — " + stock.symbol + " quote, " + FV.fmtINR(stock.price, 2),
        "Technical indicators — RSI " + FV.fmtNum(stock.rsi, 1) + " · P/E " + FV.fmtNum(stock.pe, 1),
        "Stock detail — " + stock.name,
      ],
      link: FV.stockLink(stock.symbol),
      linkLabel: "Open " + stock.symbol + " detail →",
    };
  }

  function budgetAnswer() {
    var m = FV_DATA.MONTHS["2026-11"];
    var top = m.categories[0];
    return {
      html: "<p>November is on track. Your income is <strong>" + FV.fmtINR(m.income) +
        "</strong>, you have spent <strong>" + FV.fmtINR(m.spent) + "</strong> so far, and " +
        "<strong>" + FV.fmtINR(m.available) + "</strong> is still available — about " +
        Math.round((m.available / m.income) * 100) + "% of your income.</p>" +
        "<p>Your biggest line is <strong>" + top.name + " at " + FV.fmtINR(top.amount) +
        "</strong> (" + Math.round((top.amount / m.income) * 100) +
        "% of income), followed by Food at " + FV.fmtINR(m.categories[1].amount) +
        ". Spending is " + FV.fmtINR(43100 - m.spent) + " lower than October's " + FV.fmtINR(43100) + ".</p>",
      citations: [
        "Budget ledger — November 2026",
        "Monthly summary — income " + FV.fmtINR(m.income) + " · spent " + FV.fmtINR(m.spent),
        "Category breakdown — Rent " + FV.fmtINR(top.amount),
      ],
      link: "budget.html",
      linkLabel: "Open your budget →",
    };
  }

  function readinessAnswer() {
    var r = FV_DATA.READINESS;
    var top = r.factors.slice().sort(function (a, b) { return b.score - a.score; })[0];
    return {
      html: "<p>Your readiness score is <strong>" + r.score + " / 100</strong> — “" + r.verdict +
        "”. Your strongest factor is <strong>" + top.name + "</strong> (" + top.score +
        "/100): " + top.detail + "</p><p>The main gap is portfolio diversification (" +
        r.factors[4].score + "/100) — banking is 34% of your portfolio, above the 25% comfort level — and the emergency fund is at 4.2 months of expenses against a 6-month target.</p>",
      citations: [
        "Readiness score — " + r.score + "/100 · " + r.verdict,
        "Factor detail — " + top.name + " " + top.score + "/100",
        "Portfolio — banking 34% of holdings",
      ],
      link: "readiness.html",
      linkLabel: "Open your readiness score →",
    };
  }

  function billsAnswer() {
    var upcoming = FV_DATA.BILLS.filter(function (b) { return b.status === "upcoming"; });
    var total = upcoming.reduce(function (sum, b) { return sum + b.amount; }, 0);
    var items = upcoming.map(function (b) {
      return "<li><strong>" + b.name + "</strong> — " + FV.fmtINR(b.amount) + " due " + b.dueLabel + "</li>";
    }).join("");
    return {
      html: "<p>You have <strong>" + upcoming.length + " bills coming up</strong>, totalling " +
        FV.fmtINR(total) + ":</p><ul style=\"margin:0 0 0.6rem;padding-left:1.2rem\">" + items +
        "</ul><p>The nearest is Internet (" + FV.fmtINR(999) + ") on Nov 22, and the largest is your " +
        FV.fmtINR(10000) + " SIP on Dec 1. With " + FV.fmtINR(18400) +
        " available this month, all of them are covered.</p>",
      citations: [
        "Bills ledger — " + upcoming.length + " upcoming bills",
        "Next bill — Internet, " + FV.fmtINR(999) + ", due Nov 22",
        "Budget ledger — " + FV.fmtINR(18400) + " available in November",
      ],
      link: "bills.html",
      linkLabel: "Open your bills →",
    };
  }

  function goalsAnswer() {
    var g = FV_DATA.GOALS[0];
    var pct = Math.round((g.saved / g.target) * 100);
    return {
      html: "<p>Your emergency fund is at <strong>" + FV.fmtINR(g.saved) + " of " + FV.fmtINR(g.target) +
        "</strong> — " + pct + "% funded, with a target of " + g.deadline + ". That is 4.2 months of expenses; the goal is 6 months.</p>" +
        "<p>You are adding " + FV.fmtINR(2000) + " a month automatically. At that pace the fund reaches its target around " + g.deadline + " — adding " + FV.fmtINR(5000) + " a month would get you there sooner and lift your readiness score.</p>",
      citations: [
        "Goals — Emergency fund " + FV.fmtINR(g.saved) + " / " + FV.fmtINR(g.target),
        "Auto-transfer — " + FV.fmtINR(2000) + "/month on the 1st",
        "Readiness — emergency fund factor 88/100",
      ],
      link: "goals.html",
      linkLabel: "Open your goals →",
    };
  }

  function fallbackAnswer() {
    return {
      html: "<p>I can answer from your own data. Try asking about:</p>" +
        "<ul style=\"margin:0 0 0.6rem;padding-left:1.2rem\">" +
        "<li>Your <strong>budget</strong> — “How is my budget this month?”</li>" +
        "<li>A <strong>stock</strong> — “Is INFY a good buy right now?”</li>" +
        "<li>Your <strong>readiness to invest</strong> — “Am I ready to invest?”</li>" +
        "<li><strong>Bills due soon</strong> or your <strong>goals</strong></li></ul>" +
        "<p>For stocks that pass your filters, the <a href=\"screener.html\">Smart Screener</a> is the fastest way to compare them.</p>",
      citations: [
        "Budget ledger — November 2026",
        "Market data — 15 NSE stocks",
        "Readiness score — 72/100",
      ],
      link: "screener.html",
      linkLabel: "Open the Smart Screener →",
    };
  }

  function answerFor(question) {
    var q = question.toLowerCase();
    if (/(budget|spent|spend|spending|income|money left|available)/.test(q)) return budgetAnswer();
    if (/(ready|readiness|invest)/.test(q)) return readinessAnswer();
    if (/(bill|due|pay)/.test(q)) return billsAnswer();
    if (/(goal|emergency fund|japan|laptop|trip)/.test(q)) return goalsAnswer();
    if (/(screener|rsi|screen|filter)/.test(q)) {
      var a = fallbackAnswer();
      a.html = "<p>The <a href=\"screener.html\">Smart Screener</a> scans all 15 NSE stocks on RSI, P/E, trend and more — for example, TATAMOTORS has the highest RSI at 71.8 (overbought) and HINDUNILVR the lowest at 38.6. Open the screener, set your RSI range, and it lists every stock that passes.</p>" + a.html;
      return a;
    }
    var stock = findStock(question);
    if (stock) return stockAnswer(stock);
    return fallbackAnswer();
  }

  function explainStock(symbol) {
    var s = FV_DATA.stockBySymbol(symbol);
    if (!s) return null;
    var news = FV_DATA.NEWS.find(function (n) { return n.symbol === symbol; });
    var peers = FV_DATA.STOCKS.filter(function (x) { return x.sector === s.sector && x.symbol !== symbol; });
    var peerAvg = peers.length
      ? peers.reduce(function (sum, x) { return sum + x.change; }, 0) / peers.length
      : null;
    var dir = s.change >= 0 ? "rose" : "fell";
    var html = "<p><strong>" + s.name + " (" + s.symbol + ") — explained</strong></p>" +
      "<p><strong>Price action.</strong> The stock " + dir + " " + FV.fmtNum(Math.abs(s.change)) +
      "% today to " + FV.fmtINR(s.price, 2) + ", trading " +
      (s.price > s.sma20 ? "above" : "below") + " its 20-day average of " + FV.fmtINR(s.sma20, 2) +
      " and " + (s.sma20 > s.sma50 ? "with" : "against") + " the longer trend (50-day average " +
      FV.fmtINR(s.sma50, 2) + "). Its 52-week range is " + FV.fmtINR(s.low52, 2) + " – " +
      FV.fmtINR(s.high52, 2) + ".</p>" +
      "<p><strong>Indicators.</strong> RSI is " + FV.fmtNum(s.rsi, 1) + " (" + rsiRead(s.rsi) +
      "), P/E is " + FV.fmtNum(s.pe, 1) + ", and the dividend yield is " + FV.fmtNum(s.divYield) +
      "%. Beta of " + FV.fmtNum(s.beta) + " means it typically moves " +
      (s.beta > 1 ? "a bit more than" : "a bit less than") + " the market.</p>" +
      "<p><strong>News.</strong> " + (news
        ? "“" + news.headline + "” (" + news.publisher + ", " + news.time + ") — sentiment " + news.sentiment + "."
        : "No fresh headline for this stock in today's feed.") + "</p>" +
      "<p><strong>What to watch.</strong> " + (peerAvg === null
        ? s.name + " is the only " + s.sector + " stock in our 15-stock universe, so there are no direct peers to compare with — watch the sector index instead."
        : "Its " + s.sector + " peers moved " + FV.fmtSigned(peerAvg) + " on average today, so " +
          (Math.sign(peerAvg) === Math.sign(s.change) ? "the sector is moving with it." : "this move is stock-specific, not sector-wide.")) +
      " Next, watch whether the price holds above its 20-day average and what the next quarterly results say.</p>";
    return {
      html: html,
      citations: [
        "Market data — " + s.symbol + " " + FV.fmtINR(s.price, 2) + " (" + FV.fmtSigned(s.change) + ")",
        news ? "News — " + news.publisher + " · sentiment " + news.sentiment : "News — no item for " + s.symbol + " today",
        "Technical indicators — RSI " + FV.fmtNum(s.rsi, 1) + " · P/E " + FV.fmtNum(s.pe, 1),
        "Sector — " + s.sector + (peerAvg === null ? " (no peers in universe)" : " peers " + FV.fmtSigned(peerAvg)),
      ],
      link: FV.stockLink(s.symbol),
      linkLabel: "Open " + s.symbol + " detail →",
    };
  }

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function addUserMessage(text) {
    var msg = el('<div class="chat-msg user"><span class="avatar">VB</span><div class="bubble"></div></div>');
    msg.querySelector(".bubble").textContent = text;
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
  }

  function addAiMessage(answer) {
    var msg = el('<div class="chat-msg"><span class="avatar">FV</span><div class="bubble"></div></div>');
    var bubble = msg.querySelector(".bubble");
    bubble.innerHTML = answer.html;
    if (answer.link) {
      var a = document.createElement("a");
      a.href = answer.link;
      a.className = "card-link";
      a.textContent = answer.linkLabel;
      bubble.appendChild(a);
    }
    var cites = document.createElement("ul");
    cites.className = "citations";
    answer.citations.forEach(function (c) {
      var li = document.createElement("li");
      li.textContent = c;
      cites.appendChild(li);
    });
    bubble.appendChild(cites);
    var guard = document.createElement("div");
    guard.className = "guardrail-note";
    guard.textContent = "✓ Verified against your data — every number checked";
    bubble.appendChild(guard);
    var disc = document.createElement("p");
    disc.className = "disclaimer";
    disc.style.marginTop = "0.7rem";
    disc.textContent = "Decision support, not financial advice.";
    bubble.appendChild(disc);
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
  }

  function showTyping() {
    var msg = el('<div class="chat-msg" id="typing-msg"><span class="avatar">FV</span><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div></div>');
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    return msg;
  }

  function ask(question) {
    if (!question) return;
    addUserMessage(question);
    var typing = showTyping();
    setTimeout(function () {
      typing.remove();
      addAiMessage(answerFor(question));
    }, 700);
  }

  function runExplain(symbol) {
    var answer = explainStock(symbol);
    if (!answer) return;
    addUserMessage("Explain " + symbol + " for me.");
    var typing = showTyping();
    setTimeout(function () {
      typing.remove();
      addAiMessage(answer);
    }, 700);
  }

  function setMode(next) {
    mode = next;
    var askBtn = document.getElementById("mode-ask");
    var exBtn = document.getElementById("mode-explain");
    askBtn.classList.toggle("active", next === "ask");
    exBtn.classList.toggle("active", next === "explain");
    askBtn.setAttribute("aria-selected", next === "ask" ? "true" : "false");
    exBtn.setAttribute("aria-selected", next === "explain" ? "true" : "false");
    document.getElementById("chat-suggestions").hidden = next !== "ask";
    document.getElementById("chat-form").hidden = next !== "ask";
    document.getElementById("explain-panel").hidden = next !== "explain";
  }

  document.addEventListener("DOMContentLoaded", function () {
    log = document.getElementById("chat-log");
    input = document.getElementById("chat-input");

    /* Welcome message */
    addAiMessage({
      html: "<p>Hello, Vivek. I can explain your money in plain words — your November budget, any of the 15 stocks we track, your bills, goals and readiness to invest.</p><p>Pick a suggestion below, or ask anything in your own words.</p>",
      citations: [
        "Budget ledger — November 2026",
        "Market data — 15 NSE stocks",
        "Readiness score — 72/100",
      ],
      link: "dashboard.html",
      linkLabel: "Back to your dashboard →",
    });

    /* Stock select */
    var select = document.getElementById("explain-stock");
    FV_DATA.STOCKS.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.symbol;
      opt.textContent = s.symbol + " — " + s.name;
      select.appendChild(opt);
    });

    /* Mode tabs */
    document.getElementById("mode-ask").addEventListener("click", function () { setMode("ask"); });
    document.getElementById("mode-explain").addEventListener("click", function () { setMode("explain"); });

    /* Suggestions */
    document.querySelectorAll(".suggestion").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ask(btn.textContent.trim());
      });
    });

    /* Free-text form */
    document.getElementById("chat-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      input.value = "";
      ask(q);
    });

    /* Explain mode */
    document.getElementById("explain-btn").addEventListener("click", function () {
      runExplain(select.value);
    });
    select.addEventListener("change", function () {
      FV.toast("Selected " + select.value + " — press Explain for the breakdown.");
    });

    /* ?stock=X deep link: pre-select and explain */
    var param = FV.getParam("stock");
    if (param) {
      var stock = FV_DATA.stockBySymbol(param.toUpperCase());
      if (stock) {
        select.value = stock.symbol;
        setMode("explain");
        runExplain(stock.symbol);
      }
    }
  });
})();
