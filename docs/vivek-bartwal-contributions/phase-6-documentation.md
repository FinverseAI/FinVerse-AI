# Phase 6 — Documentation

## Metadata

| Field           | Value                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase           | Phase 6 — Documentation: project guide Edition 1.2 (five new chapters + PDF rebuild), architecture + methodology write-up for the report submission, README correction (synopsis Expected Outcomes, last bullet)                                                                                                                                                                                    |
| Date            | 23 November 2026                                                                                                                                                                                                                                                                                                                                                                                       |
| Author          | Vivek Bartwal (B.Tech CSE, GEHU, Roll No. 2319881)                                                                                                                                                                                                                                                                                                                                                     |
| Team            | CSE27-079 — Sarthak Thapliyal (2319526), Ayushman Kothari (2318646), Vidish Bijalwan (2319849), Vivek Bartwal (2319881)                                                                                                                                                                                                                                                                                |
| Guide           | Dr. Prateek Srivastava, Assistant Professor, GEHU                                                                                                                                                                                                                                                                                                                                                      |
| Repository      | github.com/FinverseAI/FinVerse-AI (public)                                                                                                                                                                                                                                                                                                                                                             |
| Branch          | `main` — direct commit, no pull request (team rule from Sarthak, 23 November 2026: no PRs, commit directly)                                                                                                                                                                                                                                                                                           |
| Commits         | One commit on `main`, directly on top of `a940eee` (the Phase 5 commit) — see `git log` for the hash                                                                                                                                                                                                                                                                                                   |
| Scope           | 7 files, +1,391 / −55 lines (plus the rebuilt PDF, 105,935 → 108,130 bytes); **no runtime code changes, no migration, no new environment variable, no new dependency** (reportlab was installed only in a throwaway virtual environment on the build machine, not in the repository)                                                                                                                                                                           |
| Status          | **Built on `main` — committed locally, NOT pushed (parent re-verifies before pushing); CI not run yet** (23 November 2026)                                                                                                                                                                                                                                                                            |
| Standing caveat | This phase documents the system as it exists at `a940eee` plus these documentation changes. Every claim in the new chapters was re-verified against the source during this phase; where the source could not settle a question (production migration state, live model behaviour), the documents say so explicitly instead of guessing. No live model call has been measured yet — the API key is still pending. |

All times in this document are IST. All numbers, hashes and run identifiers are
taken from the Git repository, the approved phase plan and the verified work log
for 23 November 2026. Implementation was executed with AI assistance under my
direction; I approved the plan, made the decisions recorded in Section 6,
and verified every result independently before it was called done.

---

## 1. Overview — what this phase is and why it exists

Phases 0–5 built a system and measured it. But a system nobody can explain is
not a major project — it is a pile of code. The synopsis's last Expected Outcome
is explicit: *"A documented system architecture and methodology suitable for
submission as a research contribution in explainable, reasoning-native
financial intelligence."* Phase 6 is that outcome, plus the update of the
documents that had gone stale while the system was being built.

The problem this phase solves is documentation drift. The living project guide
(Edition 1.1, 15 November 2026) was written when only Module 1 existed. It
described the stock module as "planned", the AI layer as "not implemented",
the vector store as "proposed only", and the README still said FinVerse
"does not provide an AI adviser". All four statements were true on 15 November
and all four were false by 23 November. A teacher, a recruiter or a new
teammate reading the old guide would have formed a picture of the project
that was eight days out of date — missing the entire second module, the AI
layer, the guardrails, the Readiness score and the evaluation.

### What existed before this phase

- `docs/finverse-project-guide.md`, Edition 1.1, 540 lines, 16 chapters
  (+07A, 08A), with a 21-page PDF built from it
  (`output/pdf/FinVerse_AI_Project_Guide.pdf`).
- `docs/build_finverse_guide.py`, the reportlab generator that rebuilds the
  PDF from the Markdown source — with the edition number, date and module
  status **hardcoded** in the script (Section 8.2).
- `docs/evaluation-writeup.md` (Phase 5) and the per-phase contribution
  docs for Phases 0–5.
- `README.md`, 116 lines, whose "What works" section described only Module 1
  and whose line 14 denied the existence of an AI adviser.
- No architecture/methodology write-up suitable for the report submission.

### What this phase delivered

1. **Project guide Edition 1.2** — five new chapters (§04A market module,
   §08B AI layer, §08C guardrails, §08D Readiness, §12A evaluation), every
   stale status table updated, two new source keys (S11, S12), and a
   **rebuilt 36-page PDF** (from 21 pages).
2. **Architecture + methodology write-up** (`docs/architecture-methodology.md`)
   — 15 sections, report-submission quality, including the ML-vs-LLM argument
   and comparison table from the strategy document.
3. **README correction** — the AI claim replaced with what the AI layer
   actually does, plus Module 2 / AI / evaluation bullets and structure-table
   rows (and a second stale claim fixed in the same paragraph: goal
   contributions *are* now tracked).
4. **This contribution doc** — the per-phase record for Phase 6.

---

## 2. Objectives and acceptance criteria

From the approved plan (§2, Phase 6):

| # | Objective | Acceptance criterion | Result |
| --- | --- | --- | --- |
| 1 | Project guide Edition 1.2 | New chapters for the market module, AI layer, guardrails, Readiness and evaluation, in the chapter slots §16 reserves; existing status tables updated so new readers do not mistake old limitations for current state | ✅ Done — five chapters added, all status tables updated |
| 2 | Rebuild the PDF | `docs/build_finverse_guide.py` runs cleanly on this VM and the PDF reflects Edition 1.2 | ✅ Done — 36 pages, verified by text extraction (reportlab installed in a throwaway venv; see §8.1) |
| 3 | Architecture + methodology write-up | Suitable for the report submission (synopsis Expected Outcomes, last bullet) | ✅ Done — `docs/architecture-methodology.md`, 15 sections |
| 4 | README fix | Line 14's "does not provide an AI adviser" replaced with what the AI layer actually does; bank/payments part stays accurate | ✅ Done — plus the goal-contributions correction in the same paragraph |
| 5 | Contribution doc | One 10–15 page first-person doc under `docs/vivek-bartwal-contributions/` | ✅ Done — this document |
| 6 | No regressions | Backend 612/612, web 68/68, e2e 4/4, tsc, oxlint, prettier, web check-types + ESLint all still green | ✅ Done — see §7 (documentation-only change, but verified anyway) |

The plan's Phase 6 also names the strategy document's §1 ML-vs-LLM argument
and comparison table as "viva/report material (Phase 6)" (§7 of the plan).
That material is reproduced verbatim in the architecture write-up (§10)
and is summarised in §4.3 below.

---

## 3. Architecture — how Phase 6 fits the system

Phase 6 changes no runtime code. Its architecture is the **documentation
system** of the project, which has three layers:

```
Source of truth: the code + git history + test results
        │
        ▼
Layer 1 — The living project guide (docs/finverse-project-guide.md)
          Plain-language, source-grounded, for teachers/recruiters/teammates.
          Generated PDF: docs/build_finverse_guide.py → output/pdf/...
        │
Layer 2 — Report-submission documents (docs/)
          architecture-methodology.md (this phase)
          evaluation-writeup.md (Phase 5)
        │
Layer 3 — Contribution records (docs/vivek-bartwal-contributions/)
          One first-person doc per phase, facts from git/code only.
```

The guide's §16 sets the rules this phase followed: **keep section IDs
stable** when pages are added (hence the letter-suffixed chapters 04A, 08B,
08C, 08D, 12A — the same pattern the guide already used for 07A and 08A),
**update the existing status tables** alongside the new chapters, and answer
the **same eight questions for every new feature** (feature+date, problem+user
action, start-to-finish example, data+ownership, calculation-or-AI,
evidence+limits, technology decision, status+next step). Every new chapter in
Edition 1.2 follows that template.

The PDF generator is part of the system too: the guide's Markdown is the
editable source, and `build_finverse_guide.py` rebuilds the PDF with
explicit page breaks per chapter and vector diagrams. A documentation change
is not complete until the PDF is rebuilt — otherwise the Markdown and the
PDF disagree, and the PDF is what a teacher actually opens.

---

## 4. What was built — document by document

### 4.1 Project guide Edition 1.2 (`docs/finverse-project-guide.md`)

The guide grew from 540 lines / 16 chapters / 21 PDF pages to **821 lines /
21 chapters / 36 PDF pages**. The work had three parts: five new chapters,
updates to the existing chapters, and front/back-matter updates.

**New chapter §04A — Stock intelligence: what is built.** Follows the §16
template: market data (Yahoo Finance via `yahoo-finance2`, quotes cached
15 minutes, history 24 hours, stale prices marked, never invented), the
calculation table (SMA/EMA/RSI/MACD, portfolio value and gains, CAGR/XIRR,
concentration, Markowitz + Sharpe — with the file each lives in), the
user-facing feature table (overview, search/profile, charts, holdings,
watchlist, portfolio dashboard, screener), a start-to-finish example
(recording 10 RELIANCE shares and seeing the valued loss), data and
ownership, evidence and limits (including the honest caveat that whether the
market migration is applied in production cannot be verified from source),
the technology decision (yahoo-finance2 over Alpha Vantage's 25 requests/day;
TypeScript over the blueprint's Python), and status/next step.

**New chapter §08B — The AI layer: how the assistant works.** The core rule
(the LLM reasons, the code calculates), the pinned models with their roles
and prices, the nine tools in a table (each with what it returns), the six
endpoints, the RAG pipeline (chunking, `bge-base-en-v1.5` embeddings,
pgvector, public-vs-user scoping, the prompt-injection guard), and the
safety rails (rate limits, 30 s timeout, cost cap, refusal path). Ends with
the honest statement that live model behaviour is not yet measured because
the key is not configured.

**New chapter §08C — Guardrails: checking every claim.** The verification
table (money exact to the paise, percentages ±0.1, scores exact, source
existence, citation match), the failure path (one retry, then template
fallback), the `guardrail_checks` log, the corrupted-output suite (22/22),
and the evaluation's corrupt-fixture result (0/19 answers passed — exactly
one failing check per scenario, the score value). Closes with what the
guardrail *cannot* do: check fairness, completeness or judgement.

**New chapter §08D — Investment Readiness: the cross-module score.** The
five-factor formula table (weights, thresholds, full/zero marks), the bands,
the missing-data rescaling rule, a worked example (the healthy saver scores
100; the single-stock gambler scores 28 — both real numbers from the
evaluation scenarios), and how the explanation endpoint works.

**New chapter §12A — Evaluation: measuring the AI layer.** The four metrics
in a table, the template baseline and why it is the comparison point, the
no-key run results table (baseline 100.0%, corrupt fixture 0/19, live LLM
"pending key"), and what is still to be measured. The numbers are copied
from `docs/evaluation-writeup.md` and the committed results — not
re-measured, not re-worded.

**Updates to existing chapters.** §01 (module table + the long-term
connection, now a working feature), §04 (a pointer note: the plan is now
implemented, see §04A), §05 (the AI layer now exists, in TypeScript, not
Python), §07 (seven new table rows: goal contributions, bill payments,
holdings, watchlist, quotes, history, RAG documents, guardrail checks; the
vector-storage paragraph rewritten for pgvector), §07A (the storage table
and the "no implemented storage" sentence), §08 (retitled "Calculations and
the AI layer"; the jobs table and the accuracy section updated; the blueprint
section rewritten as "what was built instead"), §08A (the "future" table
rewritten as "now implemented"), §09 (three new dependency rows:
pgvector, `yahoo-finance2` ^4.0.6, Zod ^4.6.7 — versions read from
`package.json`, not guessed), §11 (a "Decisions made since Edition 1.1"
table: eight blueprint proposals vs the decisions taken), §12 (progress
table, verification record with the 612/612 + 68/68 + 4/4 counts, snapshot
commit `a940eee`), §13 (stages 5–6 marked done; the open questions updated
with the answers the code now provides), §14 (three glossary rows: template
baseline, self-consistency, factual grounding), §15 (source keys S11 and
S12; S8 updated for the new migrations), §16 (edition history + 1.2 row;
the future-chapters list with the now-built topics removed).

### 4.2 The PDF rebuild (`docs/build_finverse_guide.py` + `output/pdf/`)

The generator needed `reportlab`, which was not installed on this VM, and
the system Python refuses `pip install` (PEP 668, externally managed
environment). I installed reportlab 5.1.0 into a throwaway virtual
environment (`/tmp/guide-venv`) — no system modification, nothing added to
the repository — and ran the generator from there. It ran cleanly on the
first attempt, both on the pre-edit baseline (21 pages, confirming the tool
worked before my changes) and on the edited guide (**36 pages**).

The PDF was verified by **text extraction** (pypdf), not by byte search:
raw-byte search fails because reportlab compresses text streams. All key
strings were found in the extracted text: "Edition 1.2", "23 November 2026",
all five new chapter numbers, `guardrail_checks`, "OpenRouter", "Qwen",
"100.0% (19/19)", "Netlify". The chapter list from the generator's own
output confirms the layout: §04A on page 8, §08B on 17, §08C on 19, §08D
on 20, §12A on 29.

Two script fixes were needed (Section 8.2): the cover page and the running
header had the edition hardcoded as "1.1 / 15 November 2026", and the cover
still labelled stock intelligence a "PLANNED MODULE". Both are now correct;
the only remaining "1.1" in the PDF is the §16 edition-history table, where
it belongs.

### 4.3 Architecture + methodology write-up (`docs/architecture-methodology.md`)

A new 15-section document, written for the report submission rather than for
teammates — formal register, no Hinglish, every claim traceable to code, the
plan, the strategy document or the synopsis:

1. Abstract — the hybrid architecture in one paragraph.
2. Introduction — the two gaps (isolated apps, black-box ML) and the six
   synopsis outcomes, with this document identified as the last one.
3. Design principles — the five standing principles as a table.
4. System architecture — components, request lifecycle, data model (three
   groups, with the pgvector `Unsupported` note), deployment (Netlify,
   `finverseaii.netlify.app`, the required env vars, the migration caveat).
5. The deterministic core — Module 1 calculations and Module 2 math.
6. The LLM layer — models and hosting (including the documented deviation
   from the strategy doc's local 7B/14B proposal, with the reason), the nine
   tools, structured output, RAG, the six features, safety rails.
7. Guardrails — verification rules, failure handling, the check log, the
   corrupted-output suite, and what the guardrail cannot do.
8. Investment Readiness — the formula table, missing-data rescaling, the
   explanation endpoint, worked examples.
9. Evaluation methodology and results — the four metrics, the baseline, the
   no-key results table, what is still to be measured, and the three
   discussion observations from the evaluation write-up.
10. **Why LLM reasoning, not traditional ML** — the strategy document's §1
    argument (opacity, rigidity, false precision) and its comparison table,
    reproduced verbatim (7 rows, 3 columns), with the closing point that the
    hybrid architecture assigns each side the job it is good at.
11. Technology decisions — the blueprint-vs-as-built table (8 rows).
12. Verification record — the 612/612 + 68/68 + 4/4 table, plus the
    five things that are *not* verified.
13. Limitations — six, stated plainly.
14. Future work — the key, the live evaluation, the unbuilt strategy-doc
    features (Why Did My Stock Move?, Market Regime Detection, What-If
    Simulator), alerts, a second price source, the dashboard card.
15. Reproduction — the exact commands for tests, the eval run and the guide
    PDF build.

### 4.4 README correction (`README.md`)

Line 14 previously read: *"FinVerse does not connect bank accounts, execute
payments, or provide an AI adviser. … contributions to individual goals are
not tracked."* Both halves of that sentence were stale: the AI layer exists,
and goal contributions have been tracked since the Module 1 gaps work
(17 November). The new text says FinVerse "does not connect bank accounts or
execute payments", describes the AI layer as explaining "the user's own
numbers and market data" without giving "personalised investment advice",
and records that contributions *are* tracked. Two new bullets were added to
"What works" (stock intelligence; AI layer + Readiness + evaluation) and
six rows to the structure table (module-two routes, market, ai, rag,
readiness, eval). The bank/payments claim is unchanged and still accurate.

### 4.5 This contribution doc

Following the standing doc rule (one 10–15 page first-person doc per phase)
and the structure of the Phase 0–5 docs: Metadata, Overview, Objectives,
Architecture, What was built, Configuration, Decisions, Verification,
Problems, Deployment, Open/unverified, Lessons, Appendix. As in the Phase 5
doc, the Commits row deliberately does **not** contain this commit's own
hash — a document cannot reference its own commit's hash, since amending
the commit changes it.

### 4.6 `.prettierignore` — generated eval outputs excluded

Two directories added (`apps/backend/eval/results/`,
`apps/backend/eval/rating-pack/`), with a comment explaining that the eval
runner regenerates these files on every run. Without this, the repo's
`format:check` — which CI runs — fails on the Phase 5 generated JSON files
(§8.5). This is the only non-documentation change in the phase, and it
changes no artifact: it only tells the formatter that generated outputs are
not hand-formatted code.

---

## 5. Configuration

Phase 6 adds no configuration to the repository. The only tooling involved
was the PDF build, which used a throwaway virtual environment on the build
machine:

| Item | Value | Notes |
| --- | --- | --- |
| reportlab | 5.1.0 | Installed with `pip install reportlab` inside `/tmp/guide-venv`; not in any `requirements` file, not in the repo |
| pypdf | (latest, for verification only) | Used to extract text from the built PDF and assert the key strings are present; not part of the build |
| Python | system `python3` | The venv was created with `python3 -m venv /tmp/guide-venv` |
| Fonts | Helvetica fallback | The generator falls back to Helvetica when the Windows fonts are absent, as on this VM; the PDF renders correctly |

No environment variable, no dependency, no migration, no new npm package.
The scope row in the metadata table records the final `git diff --stat`
(see §12).

---

## 6. Decisions taken

### 6.1 Letter-suffixed chapters, not renumbering

The new chapters could have been inserted as 05–09 with everything after
renumbered, or appended as 17–21 at the end. I chose the letter-suffix
pattern (§04A, §08B, §08C, §08D, §12A) because §16 says *"Keep the section
IDs stable even when page numbers change"* and the guide already uses it
(07A, 08A). Renumbering would break every cross-reference in the guide and
in the contribution docs; appending at the end would put the AI chapters
after the glossary and the source map, where no reader would find them. The
suffixes place each chapter next to the chapter it extends (§04A after the
stock plan, §08B–D after the calculations chapter, §12A after the progress
record).

### 6.2 Keep the old plan chapters as a record

§04 still describes the stock module as "a detailed product plan, not an
implemented part of this working copy" — a sentence that is now false. I
added a pointer note at the top of §04 ("the plan described in this chapter
is now implemented — see §04A") rather than rewriting the chapter, because
the plan is the historical record of what was intended, and §04A is the
record of what was built. Deleting the plan would lose the ability to check
whether the implementation matches the intent. The same reasoning applies
to §11's proposed-technology table: the blueprint's candidates are kept,
with a new "Decisions made since Edition 1.1" table recording what was
actually chosen.

### 6.3 Verify every new claim against the code, not from memory

The guide's standing rule is that claims come from the reviewed source. I
re-verified the facts the new chapters assert rather than trusting the
Phase 0–5 summaries: the Prisma model list (which tables exist), the
endpoint list (which routes exist), the dependency versions (`yahoo-finance2`
^4.0.6, Zod ^4.6.7), the cache TTLs (15 minutes / 24 hours), the RSI
reference value (55.55, Investopedia example, in `ai.indicators.spec.ts`),
the news source (Yahoo, not Finnhub — confirmed in `rag.ingest.ts` and
`rag.service.ts`), and the eval numbers (copied from the committed results,
not re-typed from memory). Two of my first-draft edits failed because I
misremembered the guide's own wording — the edit tool's exact-match
requirement caught both, and I re-read the sections before retrying. The
lesson from Phase 5 (verify the response body, not just the status code)
applies to documentation too: verify the file, not the summary of the file.

### 6.4 Fix the README's second stale claim too

The task named only the AI claim on line 14. The same sentence also said
goal contributions "are not tracked", which has been false since 17
November. Leaving a known-false statement in the sentence I was fixing
would have been worse than the original error — a reader would assume the
whole sentence had been checked. I fixed it in the same edit and recorded
it here.

### 6.5 The architecture write-up is formal; the guide stays plain

The guide is written for teachers, friends, recruiters and new teammates —
plain language, worked examples, a glossary. The architecture write-up is
written for the report submission — formal register, sectioned like a
research document, with a comparison table and a limitations section. The
two documents serve different readers and different purposes; making the
write-up a copy of the guide chapters would have served neither. Where they
overlap (the formula, the guardrail tolerances, the eval results), the
numbers are identical — I copied them from the same sources, not from each
other.

> **Correction (24 November 2026):** the claim above was too strong. The
> two documents agreed with each other, but both carried the plan's draft
> Readiness bands — Ready 80–100, monthly debt-to-income, concentration
> zero at 80%, volatility 10–40% — which differ from the implemented
> formula: Ready 70–100, total debt ÷ annual income, concentration zero
> at a single holding (100%), volatility full ≤ 15% and zero ≥ 60%
> (`readiness.formula.ts`, pinned by `readiness.formula.spec.ts`). The
> guide (§08D) and the write-up (§8.1) were corrected to the code values
> on 24 November 2026. The guardrail tolerances and the eval results were
> identical and correct.

### 6.6 The venv, not `--break-system-packages`

The system Python refuses `pip install` (PEP 668). The sanctioned override
(`--break-system-packages`) would have modified the system Python. A
throwaway virtual environment achieved the same result with no system
change and no repository change, and it can be deleted without a trace.
The reproduction section of the architecture write-up records the venv
commands so the next person does not have to rediscover this.

---

## 7. Verification

Phase 6 changes no runtime code, but the standing rule is that every phase
is verified before it is committed — documentation edits can break a build
too (a bad Markdown table can break the PDF generator; a bad edit can
corrupt a file).

| Check | Command / method | Result |
| --- | --- | --- |
| Backend tests | `node --experimental-vm-modules ../../node_modules/jest/bin/jest.js` in `apps/backend` | 612/612 (48 suites) — baseline held |
| Web tests | `node --test test/*.test.mjs` in `apps/web` | 68/68 — baseline held |
| End-to-end tests | `node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --config ./test/jest-e2e.json` in `apps/backend` | 4/4 — baseline held |
| Backend type check | `tsc --noEmit --incremental false` | Clean |
| Backend lint | `oxlint --type-aware --deny-warnings src/ test/` (the exact CI command) | 0 errors, 0 warnings |
| Format | Repo `format:check` (root prettier glob) | **Clean after the fix in §8.5** — it initially failed on 2 Phase 5 generated JSON files |
| Web type check + lint | `tsc --noEmit` + ESLint | Clean |
| PDF build (baseline) | `build_finverse_guide.py` on the pre-edit guide | 21 pages — the tool worked before my changes |
| PDF build (Edition 1.2) | `build_finverse_guide.py` on the edited guide | **36 pages**, all new chapters in the generator's chapter list |
| PDF content | pypdf text extraction, key-string assertions | All found: "Edition 1.2", "23 November 2026", 04A/08B/08C/08D/12A, `guardrail_checks`, "OpenRouter", "Qwen", "100.0% (19/19)", "Netlify" |
| PDF cover/header | Text extraction | "Edition 1.2", "IMPLEMENTED MODULE", "EDITION 1.2 / 23 NOV 2026"; the only remaining "1.1" is the §16 history table |
| Guide line count | `wc -l` | 540 → 821 lines |
| Diff review | `git diff` before commit | Reviewed in full; no unintended changes |

### What was hand-verified (not just asserted by a tool)

- Every number in the new guide chapters was traced to its source: the
  eval results (`apps/backend/eval/results/eval-results.md`), the Prisma
  schema, the controller route decorators, `package.json`, or the spec
  files.
- The ML-vs-LLM comparison table in the architecture write-up was extracted
  from the strategy document's `.docx` (table 0, 8 rows) and reproduced
  verbatim — not re-typed from memory.
- The synopsis's Expected Outcomes were extracted from the PDF (page 17)
  to confirm the last bullet is the architecture/methodology outcome this
  phase delivers.
- The guide's internal cross-references were checked by reading the
  surrounding sections (§04 → §04A, §08 → §08B/§08C, §12 → §12A).

---

## 8. Problems faced and fixes

### 8.1 reportlab is not installed, and the system Python refuses pip

**Symptom:** `python3 -c "import reportlab"` → `ModuleNotFoundError`.
`pip install reportlab` → PEP 668 error ("externally-managed-environment").
`pip install --user reportlab` → the same PEP 668 error.

**Fix:** `python3 -m venv /tmp/guide-venv`, then
`/tmp/guide-venv/bin/pip install reportlab` (5.1.0). The generator was run
from the venv's Python. No system packages were modified and nothing was
added to the repository. The venv is disposable; the reproduction commands
in the architecture write-up record how to recreate it.

**Lesson:** on a locked-down VM, a venv is the first resort, not the
override flag. The override flag modifies shared state; the venv does not.

### 8.2 The cover page and header had the edition hardcoded

**Symptom:** after rebuilding the PDF from the edited Markdown, text
extraction showed the body was Edition 1.2 but the cover still said
"Edition 1.1 / Reviewed 15 November 2026", the running header still said
"EDITION 1.1 / 15 NOV 2026", and the cover still labelled stock
intelligence a "PLANNED MODULE".

**Cause:** `build_finverse_guide.py` hardcodes the edition, date and module
status in the cover-drawing and header functions (lines 169, 186, 188, 198,
214) and in the contents-page snapshot line (321). The Markdown's edition
line does not feed the cover.

**Fix:** six small edits to the script (edition → 1.2, date → 23 November
2026, "PLANNED MODULE" → "IMPLEMENTED MODULE", PDF metadata, header,
snapshot line), then a rebuild and re-verification by text extraction.
The generator's Markdown parsing was not touched.

**Lesson:** a generated document has two sources of truth — the content
file and the generator's template. Checking only the body would have
shipped a PDF whose cover contradicted its contents. The verification step
(extract the text, assert the key strings) caught it; a page-count check
alone would not have.

### 8.3 Raw-byte search does not work on a reportlab PDF

**Symptom:** searching the PDF bytes for "Edition 1.2" returned "MISSING"
even though the string was visibly in the document.

**Cause:** reportlab compresses text streams (FlateDecode), so literal
strings do not appear in the raw bytes. (Two short strings, "04A" and
"12A", happened to be found — they appear in uncompressed metadata — which
made the byte search look half-working and therefore more misleading.)

**Fix:** extract the text with pypdf and search the extracted text. This is
now the documented verification method for the guide PDF.

### 8.4 Two edits failed on misremembered wording

**Symptom:** two `edit` calls on the guide failed with "old_text was not
present" — I had written the §05 "Where Redis and AI fit" paragraph and the
§07 data table from the compacted summary's paraphrase, not from the file.

**Fix:** re-read the actual sections with `grep` + `read`, then retried
with the exact text. Both edits then applied cleanly.

**Lesson:** after a context compaction, summaries paraphrase. Never edit a
file from a summary's wording — always re-read the target lines first. The
exact-match edit tool is a safety net here, not an annoyance: it refused to
apply an edit to text that did not exist, instead of silently changing the
wrong thing.

### 8.5 The repo's format check failed on Phase 5's generated JSON — a pre-existing CI failure

**Symptom:** the repo's `format:check` script (which CI runs — `.github/
workflows/ci.yml`, line 28) failed on two files committed in Phase 5:
`apps/backend/eval/rating-pack/key.json` and
`apps/backend/eval/results/eval-results.json`. Phase 6 touches neither file,
so the failure predates this phase: the Phase 5 verification checked
"all touched files", and the generated JSONs evidently were not in that
check. Had this gone unnoticed, the next push would have failed CI.

**Why the files fail:** the eval runner writes JSON with
`JSON.stringify(data, null, 2)`, whose layout differs from prettier's
(2-space indent, 80-column print width) on nested structures. Any generated
JSON will fail the check unless it is reformatted after every run.

**Fix chosen:** add the two generated-output directories to
`.prettierignore` (with a comment explaining why), rather than reformatting
the files. Reformatting would have changed the committed artifacts'
byte size — the Phase 5 doc records `eval-results.json` as 693 KB — and
would be undone by the next eval run anyway. Ignoring generated outputs is
the established pattern in the same file (`output/`, `dist/`, `coverage/`
are already ignored). After the fix, `format:check` passes:
"All matched files use Prettier code style!"

**Lesson:** verify with the repo's own commands, not with an approximation
of them. My first prettier run (`prettier --check .` in `apps/backend`)
flagged 128 files — mostly `.md` files the repo's glob never covers — which
looked alarming but was the wrong invocation. The repo's `format:check`
glob is the real gate, and it failed on exactly the two files that mattered.

---

## 9. Deployment

Phase 6 deploys nothing. The documents are committed to `main` on the
repository; the PDF is committed in the repository
(`output/pdf/FinVerse_AI_Project_Guide.pdf`) so it travels with the source.
The live site (`https://finverseaii.netlify.app`) is unaffected — no code
changed, so no redeploy is needed and no live behaviour can have changed.

The Netlify deployment itself is now documented for the first time: the
guide (§12, §13) and the architecture write-up (§3.4) both record that the
frontend and backend run on Netlify, the backend as a Netlify Function,
with `BACKEND_URL` + `BETTER_AUTH_URL` as required production variables.
Previously that knowledge lived only in chat and memory.

---

## 10. What is still open or unverified

| Item | Status | What would close it |
| --- | --- | --- |
| OpenRouter API key | **Still missing** (since 19 Nov; Sarthak) | The key, set in Netlify env vars — then the live eval run (one command) and the live AI smoke test |
| Live LLM metrics | Pending the key | The live eval run; the guide and the write-up both say "pending key", not a number |
| Human rubric ratings | Not collected | A rater (Sarthak or the guide) working through the blind rating pack (~30–45 min) |
| Production migration state | Unverified from source | Whoever holds Neon access confirming the Phase 0/2/3 migrations are applied (the docs say so explicitly) |
| Guide PDF visual review | Not done | A human opening the 36-page PDF and checking the layout (Edition 1.1 was visually reviewed; 1.2 has been text-verified only) |
| Readiness dashboard card | **Built in Phase 4** — `readiness-card.tsx` (`8b8388a`, 21 Nov 2026); this row was wrong when written, corrected 24 Nov 2026 | — |
| Strategy-doc features (§3) | "Why Did My Stock Move?", Market Regime Detection, What-If Simulator not built | Future phases; listed in the write-up's §14 |
| CI on this commit | Not run yet | The parent's re-verification + push |

---

## 11. Lessons learned

1. **Documentation drift is a bug, not a chore.** Four statements in the
   guide and README were false within eight days of being written — not
   because anyone lied, but because the system moved and the documents did
   not. The guide's §16 rule (update the status tables with every new
   chapter) exists precisely because of this; Phase 6 applied it to five
   phases' worth of drift at once. The cheaper habit is to update the guide
   in the same commit as the feature.
2. **A generated document has two sources of truth.** The Markdown and the
   generator's template both carry the edition. Checking only one ships a
   contradiction. Verify the *output* (extracted PDF text), not the input.
3. **Byte search lies on compressed files.** A "MISSING" result from
   `grep` on a PDF means nothing. Extract, then search. The same principle
   as Phase 5's "verify the response body, not just the status code" —
   applied to a file format instead of an HTTP response.
4. **After a compaction, re-read before editing.** Summaries paraphrase;
   files do not. Two failed edits cost minutes; an edit applied to the
   wrong text would have cost more. The exact-match tool is the safety net.
5. **Fix the stale claim next to the one you were asked to fix.** The
   goal-contributions sentence was not in the task, but leaving it false
   in a sentence I had just "fixed" would have been worse than leaving the
   whole sentence alone. A correction carries an implicit claim that the
   surrounding text was checked.
6. **Honest "pending" is a feature, not a gap.** The guide, the write-up
   and the evaluation all say "pending key" where the key is missing. That
   consistency is deliberate: a reader who finds the same honest status in
   three documents trusts all three. A single invented number would have
   destroyed that trust.

---

## 12. Appendix

### A. File inventory (Phase 6)

| File | Change |
| --- | --- |
| `docs/finverse-project-guide.md` | Edition 1.1 → 1.2: five new chapters, all status tables updated, S11/S12 added, 540 → 821 lines |
| `docs/build_finverse_guide.py` | Edition/date/module-status hardcodes updated (6 edits) |
| `output/pdf/FinVerse_AI_Project_Guide.pdf` | Rebuilt: 21 → 36 pages |
| `docs/architecture-methodology.md` | **New** — 15 sections, report-submission write-up |
| `README.md` | Line 14 AI claim corrected; goal-contributions claim corrected; 2 new "What works" bullets; 6 new structure-table rows |
| `.prettierignore` | Generated eval output directories excluded (see §8.5) |
| `docs/vivek-bartwal-contributions/phase-6-documentation.md` | **New** — this document |

### B. Guide chapter map (Edition 1.2)

| Chapter | Title | Status |
| --- | --- | --- |
| 01–03 | Start here / Personal finance: what is built / boundaries | Updated (§01) |
| 04 | Stock intelligence: the planned module | Pointer note added |
| **04A** | **Stock intelligence: what is built** | **New** |
| 05–07A | How the parts fit / Follow one expense / Where the data lives / How records connect | Updated |
| 08 | Calculations and the AI layer (retitled) | Updated |
| 08A | Understand the numbers with examples | Updated |
| **08B** | **The AI layer: how the assistant works** | **New** |
| **08C** | **Guardrails: checking every claim** | **New** |
| **08D** | **Investment Readiness: the cross-module score** | **New** |
| 09–11 | Technology / Dev tools / Proposed technology | Updated (§09, §11) |
| 12 | Progress and evidence today | Updated |
| **12A** | **Evaluation: measuring the AI layer** | **New** |
| 13–16 | What comes next / Glossary / Source map / Keep the guide growing | Updated |

### C. How to rebuild the guide PDF

```bash
# reportlab is not in the repo; use a throwaway venv (system pip is PEP 668-locked)
python3 -m venv /tmp/guide-venv
/tmp/guide-venv/bin/pip install reportlab
/tmp/guide-venv/bin/python docs/build_finverse_guide.py
# Output: output/pdf/FinVerse_AI_Project_Guide.pdf

# Verify the content (byte search does NOT work — extract the text first)
/tmp/guide-venv/bin/pip install pypdf
/tmp/guide-venv/bin/python -c "
from pypdf import PdfReader
r = PdfReader('output/pdf/FinVerse_AI_Project_Guide.pdf')
text = '\n'.join((p.extract_text() or '') for p in r.pages)
assert 'Edition 1.2' in text and 'IMPLEMENTED MODULE' in text
print('pages:', len(r.pages))
"
```

### D. Sources used for this phase

- The project source (`apps/backend/src/`, `apps/web/`, `apps/backend/prisma/`)
- The approved plan (`llm-layer-guardrails-readiness-evaluation-plan.md`, §2 Phase 6 and §7)
- The strategy document (`FinVerse_AI_LLM_Integration_Strategy.docx`, §1 comparison table)
- The synopsis (`Finverse_Ai_Final_Synopsys.pdf`, Expected Outcomes, p. 17)
- The evaluation results (`apps/backend/eval/results/`, `docs/evaluation-writeup.md`)
- The Phase 0–5 contribution docs (`docs/vivek-bartwal-contributions/`)
- Git history (`git log`, `git diff --stat`) — for the commit and diffstat facts
