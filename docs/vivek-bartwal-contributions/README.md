# Vivek Bartwal — Contribution Log

Deep per-phase documentation of my contribution to the FinVerse AI major
project (B.Tech CSE, GEHU, Team CSE27-079, guide Dr. Prateek Srivastava).
Each document in this folder covers one phase of the work I led: what was
built, why it was built that way, how it was verified, what went wrong,
and what is still open. They are written for a guide or examiner to read
as a record of the work, and for the team to use as the project's
institutional memory.

Implementation was executed with AI assistance under my direction. I
approved the plan for each phase, made the key decisions recorded in the
documents (hosting, models, migration approach, architecture trade-offs),
did the Render dashboard and deployment work myself, and verified every
result independently — tests, CI runs and live checks — before it was
called done.

## Standing rule

**One deep document per phase, written after each phase, till the end of
the project.** Each phase document is 10–15 pages (roughly 5,000–7,500
words) and follows the same structure: metadata, overview with synopsis
objective mapping, objectives and acceptance criteria, architecture,
what was built module by module, decisions taken, verification, problems
faced and fixes, deployment, what is still open or unverified, lessons
learned, and an appendix with the commit table and full file list.

The documents distinguish four states that are often confused: **built**
(the code exists and passes local checks), **pushed** (the code is on
`main` in the repository), **CI green** (the full GitHub Actions gate
passed), and **live-verified** (the change was confirmed running on the
production service by reading its response). A phase is only called done
when all four hold — and where a claim could not be verified, the
document says so honestly in its "what is still open" section instead of
claiming it.

Times in every document are IST. Commit hashes are exact. No credentials,
tokens, API keys or secret values appear anywhere in this folder; env
var names are given where they matter, never their values.

## How to read the documents

- **Start here** for the shape of the whole workstream; then read the
  phase documents in order. Each one opens with a "what existed before
  this phase" table, so it can also be read on its own.
- **Verification sections** carry the evidence: exact test counts, CI
  run numbers with outcomes, and the exact live checks with their
  results. If a number matters to you, that is where to check it.
- **Decisions sections** record the options considered, why the chosen
  one won, and who decided — including the decisions that changed the
  plan (the model substitutions in Phases 1 and 2).
- **"What is still open" sections** are the honest boundary of each
  phase. They are as important as the verification sections: they say
  what has _not_ been proven yet, and what is blocking it.
- **Appendices** carry the commit tables (hash, IST time, message,
  files/lines) and the full file lists, so any claim in the body can be
  traced back to the repository.

## Phase list

| Phase                                 | Date        | Document                                                         | Summary                                                                                                                                                                                                                                                                                                                                                                                                                       | Status                                                                                                                                                                |
| ------------------------------------- | ----------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 — Module 2 deterministic core | 19 Nov 2026 | [phase-0-deterministic-core.md](./phase-0-deterministic-core.md) | Market data (Yahoo/NSE), indicators (SMA/EMA/RSI/MACD), portfolio math (exact paise, CAGR/XIRR), Markowitz + Sharpe optimiser, and the full `/market` UI — the deterministic layer everything else reads.                                                                                                                                                                                                                     | Done — built, pushed, CI green, live-verified                                                                                                                         |
| Phase 1 — LLM foundation              | 19 Nov 2026 | [phase-1-llm-foundation.md](./phase-1-llm-foundation.md)         | OpenRouter provider, 7 typed tools over the deterministic layer, Zod structured output (claims + evidence), bounded tool loop with raw-metrics fallback, and the "Ask FinVerse AI" dashboard chat. Includes the finding that the synopsis's model IDs no longer exist, and the paid-defaults decision.                                                                                                                        | Done — built, pushed, CI green, live-verified (routes). Live model behaviour unverified — OpenRouter key pending                                                      |
| Phase 2 — RAG                         | 19 Nov 2026 | [phase-2-rag.md](./phase-2-rag.md)                               | pgvector on Neon (768d embeddings), news/profile/transaction ingestion, lexicon sentiment, deterministic Smart Stock Screener, `searchKnowledge` + `applyScreenerFilters` tools, explain-news with a deterministic no-context refusal. Includes the day's only real defect (DI wiring, one-line fix) and the standing rule it produced: always run the full test suite including e2e before pushing.                          | Done — built, pushed, CI green, live-verified (routes). Live retrieval unverified — OpenRouter key pending                                                            |
| Phase 3 — Guardrails                  | 21 Nov 2026 | [phase-3-guardrails.md](./phase-3-guardrails.md)                 | Deterministic verification of every LLM claim against the evidence of its own request (field-name matching, money exact to the paise, %/ratios ±0.1, prose checked too), one correction-prompt retry, template fallback from verified numbers only, and every check logged to `guardrail_checks` for the Phase 5 pass-rate metric. Corrupted-output suite 22/22 caught. The build passed every gate cleanly on the first run. | Built — in PR #4 (`vivek/phase-3-guardrails`, merged with the remote's Netlify move), awaiting Sarthak's review; CI + live verification pending                       |
| Phase 4 — Investment Readiness        | 21 Nov 2026 | [phase-4-readiness.md](./phase-4-readiness.md)                   | Deterministic 0–100 readiness score from both modules (emergency fund 25, debt-to-income 20, monthly surplus 25, concentration 15, volatility 15; bands Not ready / Building / Ready), missing factors reported unavailable and rescaled rather than zeroed, a reasoning-model explanation through the Phase 3 guardrail with a template fallback, and the dashboard Readiness card with deterministic top-3 suggestions.     | Built on branch `vivek/phase-4-readiness` — NOT pushed, no PR yet (stacked on Phase 3; needs a rebase onto `main` after PR #4 merges); CI + live verification pending |

## The project in one paragraph

FinVerse AI is a unified AI financial-intelligence platform: Module 1 is
a personal finance dashboard; Module 2 is stock and investment
intelligence; and the LLM layer explains both. The governing principle,
from the project's LLM Integration Strategy, is **"the LLM reasons, the
code calculates"** — the model never computes a number, every claim cites
its source, and the system refuses honestly when it has no evidence. The
work in this folder covers the Module 2 deterministic core and the first
four LLM phases — Phases 0–2 built on 19 November 2026, Phases 3 and 4
on 21 November 2026.

## Project links

- Repository: `github.com/FinverseAI/FinVerse-AI` (public)
- Backend (Render): `https://finverse-ai-r050.onrender.com`
- Web (Render): `https://finverse-web.onrender.com`
- Approved plan: `llm-layer-guardrails-readiness-evaluation-plan.md`
  (project goal files)
- Project guide: `docs/finverse-project-guide.md` (Edition 1.1)

## Upcoming phases

Per the approved plan, the next documents in this folder will be:

- **Phase 5 — Evaluation**: guardrail pass rate, self-consistency (×5),
  blind human rubric, latency and cost benchmarking.
- **Phase 6 — Documentation**: project guide Edition 1.2, README
  update, and the final report.
