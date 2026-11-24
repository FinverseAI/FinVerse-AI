# Phases 7–12 — roadmap

**Finalised 24 November 2026, by Vivek Bartwal's direction.**
State of the repository at finalisation: `main` at `f5ac221`,
live site `https://finverseaii.netlify.app`, test suites
722/722 backend, 194/194 web, 6/6 end-to-end.

## Where this mapping comes from

The approved plan
(`llm-layer-guardrails-readiness-evaluation-plan.md`) defines **only
Phases 0–6**. No Phase 0–12 plan ever existed: the plan document, the
synopsis and the LLM Integration Strategy document were all checked on
23 November 2026 and contain no Phase 7–12 definitions. The "phase 12"
phrasing came from a team message about doing "all the work from phase 0
to till phase 12" in the new repository — an aspiration, not a plan.

This document defines Phases 7–12 against the state of the project on
24 November 2026. Two of the six phases are already built: the draft
mapping proposed on 23 November put the entry UI and Module 1 completion
at Phases 8–9, and both were built on 23–24 November, so they are
recorded here as done, with their commit ranges, rather than re-planned.

| Phase | Title | Status on 24 Nov 2026 |
| --- | --- | --- |
| 7 | Live verification + production hardening | **Open — highest priority** |
| 8 | NL / voice / receipt entry UI | **Done** (23–24 Nov 2026) |
| 9 | Module 1 completion | **Done** (24 Nov 2026) |
| 10 | Advanced evaluation | Planned |
| 11 | Final report + viva prep | Planned |
| 12 | Final submission + demo | Planned |

---

## Phase 7 — Live verification + production hardening

**Status:** open. **Owner:** team (items below name their owner).

### Objective

Prove the built system works end to end on the live service with real
services connected, and close the production gaps that code alone cannot
close. Every item below is blocked on an owner-side action or a live
check — none of it is new feature code.

### Scope

1. **OpenRouter key in production.** The key was provided on 24 November
   2026 and a live evaluation is running against it, but the key is not
   yet set in the Netlify environment variables, so the deployed site
   still answers AI requests with the no-key fallback. Set
   `OPENROUTER_API_KEY` in the Netlify dashboard and redeploy.
   (Owner: whoever holds Netlify access — Vidish / Vivek.)
2. **Production Neon migrations.** The Module 1, Phase 0/2/3 and
   recurrence migrations (including `guardrail_checks` and
   `20261123193600_add_bill_recurrence`) have not been confirmed applied
   on the production database. Apply them and confirm from source.
   (Owner: whoever holds Neon access — likely Sarthak.)
3. **Live AI smoke test.** With the key in production: chat,
   explain-stock and explain-readiness against the live site, checking
   that answers carry verified numbers and no fallback flag.
   (Owner: Vivek.)
4. **One full authenticated journey, live.** Google sign-in, onboarding,
   a saved change, reload persistence, and user separation — verified
   against a real account on the live site. No test account exists yet,
   so this needs one created first. (Owner: team.)
5. **Receipt OCR end to end in a browser.** The OCR parser is
   unit-tested and the flow is built (Phase 8); the full path — photo,
   in-browser read, confirm dialog, save — has never been run in a real
   browser. (Owner: Vivek.)
6. **NSE/BSE live announcement feeds.** Best effort: both exchanges'
   APIs return HTTP 403 (Akamai) from datacenter IPs, probed live on
   24 November 2026, so the deployed feeds will usually be unavailable
   and the Filings & Reports section leans on its official deep links.
   Record the feed state honestly; do not attempt to bypass the block.
   (Owner: Vivek.)

### Entry criteria

Phases 0–6 and the Filings & Reports module live on the production
site. **Met 24 November 2026.**

### Done criteria

Key in production and the live AI smoke test green; migrations applied
and confirmed from source; one authenticated journey verified live;
receipt OCR verified end to end; the NSE/BSE feed state recorded.

---

## Phase 8 — NL / voice / receipt entry UI

**Status: done, 23–24 November 2026.** **Owner:** Vivek.

### What was delivered

Plain-words expense entry (`POST /api/ai/extract-expense`, AI
extraction with a local fallback and a confirm-before-save review),
voice entry (Web Speech API, in-browser transcription), receipt entry
(Tesseract.js OCR fully in-browser — the photo never leaves the device),
12-category alignment with legacy mapping, PDF/Excel exports, monthly
balance history, bill payments that create their matching expense
transaction, and the in-app notification centre.

### Evidence

Commit range `8f3293c..11670fe` (11 commits), CI green, live on
Netlify. Product decisions (receipts never uploaded, reminders in-app
only, bill payment creates a transaction, current savings stays a
user-entered snapshot) recorded in guide §13. The one item carried
forward is the browser end-to-end receipt run — see Phase 7, item 5.

---

## Phase 9 — Module 1 completion

**Status: done, 24 November 2026.** **Owner:** Vivek.

### What was delivered

The four remaining integration items: the budget split as the single
source of truth for derived amounts (server recomputes fixed/variable/
target from income × split); auto-pay execution with monthly bill
recurrence (dashboard-load run; paying a monthly bill generates its next
occurrence); money definitions (unpaid bills count as committed spending
in forecasts; plan vs actual shown side by side, labelled, never mixed);
and the account-report PDF export. Plus the proxy fixes (same-origin
acceptance, 204/304 passthrough) and the harsh verification pass: 8
pages, 41 backend endpoints, 32 proxy routes, 41 component renders,
24 flows — all passing.

### Evidence

Commit range `11670fe..fc080eb` (9 commits), CI green, live on Netlify.
Suites at `fc080eb`: backend 679/679, end-to-end 6/6, web 187/187
(later 722/722 and 194/194 after the Filings & Reports rebase).

---

## Phase 10 — Advanced evaluation

**Status:** planned. **Owner:** Vivek (harness) + Sarthak or the guide
(human ratings).

### Objective

Strengthen the Phase 5 evaluation with a finance-tuned baseline, a
second-model comparison, and the human judgement the harness cannot
supply.

### Scope

1. **FinBERT sentiment baseline.** Compare the lexicon sentiment used
   by the news explainer against a finance-tuned model on the same
   passages; record agreement and the cases where they disagree.
2. **Second reasoning-model comparison.** Run the 20 evaluation
   scenarios against a second reasoning model (QwQ or equivalent) and
   compare grounding, self-consistency, latency and cost with the
   DeepSeek R1 results.
3. **Blind human ratings.** A rater (Sarthak or the guide) works through
   the Phase 5 blind rating pack (~30–45 minutes): explanation quality
   on the rubric, model vs template, blinded.
4. **Fold the live numbers in.** The live evaluation running on
   24 November 2026 produces the first real-model metrics; update the
   evaluation write-up (`docs/evaluation-writeup.md`) with them, keeping
   the no-key baseline beside the live results.

### Entry criteria

Live evaluation results from the 24 November run. **In progress.**

### Done criteria

FinBERT comparison recorded; model comparison recorded; human ratings
collected and reported; the evaluation write-up carries live numbers.

---

## Phase 11 — Final report + viva prep

**Status:** planned. **Owner:** Vivek (draft) + team (review).

### Objective

Turn the built system and its evidence into the formal major-project
report for college submission, and prepare the viva.

### Scope

1. **Assemble the formal report** from the synopsis, the architecture /
   methodology write-up, the project guide, the 49-page case file and
   the live evaluation results: title page, certificate, declaration,
   abstract, chapters, references, appendices.
2. **Viva preparation.** Likely examiner questions with answers drawn
   from the documents — the deterministic–LLM split, the guardrail
   tolerances, the readiness formula, the evaluation design, the
   limitations (§13 of the write-up).
3. **Demo script.** A rehearsed live walkthrough: onboarding, a
   transaction, stock analysis, the Readiness score, an AI chat answer
   with its verification state.

### Entry criteria

Phase 10 live metrics available.

### Done criteria

Report assembled and team-reviewed; demo rehearsed against the live
site.

---

## Phase 12 — Final submission + demo

**Status:** planned. **Owner:** team.

### Objective

Submit the project and deliver the demonstration.

### Scope

Submission package (report, code, demo) per the college's format; a
release tag on the repository freezing the submitted state; demo
delivery; handover notes for the next team or maintainer.

### Entry criteria

Phase 11 report approved by the team.

### Done criteria

Submitted; demo delivered.

---

## Outside the phase numbering

Two pieces of work do not belong to any phase above and are recorded
here so the roadmap accounts for them:

- **Filings & Reports module** (`cf41484`, 24 November 2026): a Module 2
  extension — exchange announcements plus official deep links to annual
  reports, quarterly results, investor presentations, DRHP filings and
  rating rationales, with deeper Yahoo fundamentals. Live on Netlify.
- **Sarthak's market-workspace work** (`de6d65d`, 24 November 2026):
  the stock-page refactor (snapshot component, section navigation),
  market web test coverage, and the project book — parallel team work
  on `main`.

The strategy document's further features — *Why Did My Stock Move?*,
Market Regime Detection, the What-If Portfolio Simulator and the AI
Portfolio Health Score — were never in the approved plan and remain
future work beyond Phase 12 unless the team adopts them.
