# Blind rating pack — FinVerse AI explanation quality

Generated: 2026-11-24T17:22:03.307Z. Outputs: 18 (one per system per measured scenario).

## What this is

This pack rates explanation quality (Phase 5, metric 3) — the one metric a script cannot measure. Each output is an explanation of one scenario's readiness score, produced either by the template baseline or by the reasoning model. The outputs are shuffled and labelled with opaque codes (S01-A, S01-B): **you do not know which system produced which output, and that is the point.** Rate them blind, then unblind with `key.json` afterwards.

This pack contains BOTH systems (template baseline + LLM), shuffled per scenario.

## How to rate

1. Read `outputs.md` — each output has its scenario context (the true score, band, and factor numbers) above it.
2. Fill in `rating-sheet.md`: one row per output, 1–5 on each dimension, plus your name and any notes.
3. **Do not open `key.json` until every rating is finished.** It maps each label to its system; opening it early breaks the blind.
4. When all ratings are in, unblind with `key.json` and average each dimension per system. Report the averages and the number of raters.

## Rubric — rate each output 1–5 on each dimension

**Clarity** — is the explanation easy to follow?
- 1: Confusing, jargon-heavy, or hard to follow; a non-expert would give up.
- 3: Understandable with effort; the main points come through.
- 5: Plain language throughout; a non-expert follows it first time.

**Evidence use** — does it use the numbers correctly?
- 1: Numbers missing, wrong, or stated without any tie to the factors.
- 3: Most numbers present and right; some factors mentioned without numbers.
- 5: Every number correct and tied to its factor; nothing invented, nothing missing that matters.

**Actionability** — does it say what to do?
- 1: No concrete next step at all.
- 3: A general direction (e.g. "save more") without specifics.
- 5: A specific, prioritised action tied to the score (what to fix, what it gains).

Rate each output independently. Do not compare outputs against each other — rate each against the rubric and the scenario context. If an output refuses to explain (no score measurable), mark all three dimensions "n/a" and note the refusal.

## Returning the sheet

Send the completed `rating-sheet.md` back to the eval owner with your name on every row you rated. Disagreements between raters are findings, not errors — note them.
