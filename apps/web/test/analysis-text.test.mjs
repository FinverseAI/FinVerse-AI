import assert from "node:assert/strict";
import test from "node:test";
import { analysisInline, parseAnalysis } from "../lib/analysis.ts";

test("analysis separates headings, paragraphs and consecutive list types", () => {
  assert.deepEqual(
    parseAnalysis(
      "## Market view\r\n\r\nA strong quarter.\nRevenue grew.\n\n- Earnings improved\n- Margins expanded\n1. Review results\n2. Check valuation",
    ),
    [
      { kind: "heading", lines: ["Market view"] },
      { kind: "paragraph", lines: ["A strong quarter. Revenue grew."] },
      { kind: "unordered", lines: ["Earnings improved", "Margins expanded"] },
      { kind: "ordered", lines: ["Review results", "Check valuation"] },
    ],
  );
});

test("analysis preserves unsupported markup as text and handles incomplete bold", () => {
  const text = "<script>alert(1)</script> [link](javascript:alert(1))";
  assert.deepEqual(parseAnalysis(text), [{ kind: "paragraph", lines: [text] }]);
  assert.deepEqual(analysisInline("A **strong** quarter. **unfinished"), [
    { bold: false, text: "A " },
    { bold: true, text: "strong" },
    { bold: false, text: " quarter. **unfinished" },
  ]);
  assert.deepEqual(parseAnalysis("\n \n"), []);
});
