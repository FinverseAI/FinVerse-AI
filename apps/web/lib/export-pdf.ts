import type { ExportTransaction } from "./export-csv";
import { dateKey } from "../app/(module-one)/dashboard/spending-data.ts";

/**
 * Renders transactions as a PDF statement (jsPDF, loaded on demand so
 * the library never joins the dashboard's initial bundle). One table:
 * Date, Name, Category, Amount, paginated across A4 pages with a
 * footer on each page.
 *
 * Amounts use "Rs." rather than ₹: jsPDF's built-in fonts cannot
 * render the rupee sign, and embedding a Unicode font would pull a
 * multi-megabyte font file into the bundle for one glyph.
 */

const PAGE_WIDTH = 595; // A4, points
const PAGE_HEIGHT = 842;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ROW_HEIGHT = 18;
const TITLE_SIZE = 16;
const BODY_SIZE = 10;
const FOOTER_Y = PAGE_HEIGHT - 24;

// Date, Name, Category, Amount (right-aligned).
const COLUMNS = [
  { label: "Date", x: MARGIN, width: 70 },
  { label: "Name", x: MARGIN + 70, width: 215 },
  { label: "Category", x: MARGIN + 285, width: 140 },
  {
    label: "Amount (Rs.)",
    x: MARGIN + 425,
    width: 90,
    align: "right" as const,
  },
];

function formatAmount(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}Rs. ${Math.abs(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

export async function transactionsToPdf(
  transactions: ExportTransaction[],
): Promise<Uint8Array> {
  const loaded = await import("jspdf");
  const JsPdf = loaded.jsPDF ?? loaded.default;
  const doc = new JsPdf({ unit: "pt", format: "a4" });
  // The export date is the user's local date (dateKey), never UTC:
  // toISOString() runs a day behind between 00:00 and 05:30 IST.
  const today = dateKey(new Date());

  function headerRow(y: number): number {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(BODY_SIZE);
    for (const column of COLUMNS) {
      doc.text(
        column.label,
        column.align === "right" ? column.x + column.width : column.x,
        y,
        { align: column.align ?? "left" },
      );
    }
    doc.setDrawColor(200);
    doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);
    doc.setFont("helvetica", "normal");
    return y + ROW_HEIGHT;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(TITLE_SIZE);
  doc.text("FinVerse — Transactions", MARGIN, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY_SIZE);
  doc.setTextColor(100);
  doc.text(
    `Exported ${today} · ${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`,
    MARGIN,
    74,
  );
  doc.setTextColor(0);

  let y = headerRow(100);
  for (const transaction of transactions) {
    if (y > PAGE_HEIGHT - 60) {
      doc.addPage();
      y = headerRow(56);
    }
    const cells = [
      transaction.date,
      truncate(transaction.name, 38),
      truncate(transaction.category, 24),
      formatAmount(transaction.amount),
    ];
    for (const [index, column] of COLUMNS.entries()) {
      doc.text(
        cells[index]!,
        column.align === "right" ? column.x + column.width : column.x,
        y,
        { align: column.align ?? "left" },
      );
    }
    y += ROW_HEIGHT;
  }
  if (transactions.length === 0) {
    doc.text("No transactions to show.", MARGIN, y);
  }

  const pages = doc.getNumberOfPages();
  doc.setFontSize(9);
  doc.setTextColor(100);
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.text(`Page ${page} of ${pages}`, MARGIN, FOOTER_Y);
    doc.text("FinVerse AI", PAGE_WIDTH - MARGIN, FOOTER_Y, {
      align: "right",
    });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}

/**
 * The account report as a PDF document: the monthly plan (from the
 * saved profile) beside the actuals for the current month (from
 * recorded transactions), plus unpaid bills as committed spending.
 * The plan and the actuals are separate sections, never mixed.
 */
export type AccountReport = {
  generatedOn: string;
  monthLabel: string;
  plan: {
    savings: number;
    income: number;
    expenses: number;
    target: number;
    surplus: number;
  };
  actual: {
    income: number;
    expenses: number;
    net: number;
    count: number;
  };
  committedBills: { total: number; count: number };
};

export async function accountReportToPdf(
  report: AccountReport,
): Promise<Uint8Array> {
  const loaded = await import("jspdf");
  const JsPdf = loaded.jsPDF ?? loaded.default;
  const doc = new JsPdf({ unit: "pt", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(TITLE_SIZE);
  doc.text("FinVerse — Account Report", MARGIN, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY_SIZE);
  doc.setTextColor(100);
  doc.text(`Generated ${report.generatedOn}`, MARGIN, 74);
  doc.setTextColor(0);

  let y = 104;
  function section(title: string, rows: [string, string][]) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, MARGIN, y);
    doc.setDrawColor(200);
    doc.line(MARGIN, y + 6, MARGIN + CONTENT_WIDTH, y + 6);
    y += ROW_HEIGHT + 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY_SIZE);
    for (const [label, value] of rows) {
      doc.text(label, MARGIN, y);
      doc.text(value, MARGIN + CONTENT_WIDTH, y, { align: "right" });
      y += ROW_HEIGHT;
    }
    y += 10;
  }

  section("Monthly plan — from your saved financial profile", [
    ["Current savings (snapshot)", formatAmount(report.plan.savings)],
    ["Monthly income", formatAmount(report.plan.income)],
    ["Monthly expenses", formatAmount(report.plan.expenses)],
    ["Savings target", formatAmount(report.plan.target)],
    ["Monthly surplus", formatAmount(report.plan.surplus)],
  ]);
  section(`Actual — ${report.monthLabel}, from recorded transactions`, [
    ["Recorded income", formatAmount(report.actual.income)],
    ["Recorded expenses", formatAmount(report.actual.expenses)],
    ["Net recorded flow", formatAmount(report.actual.net)],
    [
      "Unpaid bills due by month-end",
      `${formatAmount(report.committedBills.total)} (${report.committedBills.count} bill${report.committedBills.count === 1 ? "" : "s"})`,
    ],
  ]);
  doc.setFontSize(BODY_SIZE);
  doc.setTextColor(100);
  doc.text(
    `Based on ${report.actual.count} recorded transaction${report.actual.count === 1 ? "" : "s"} this month. ` +
      "The plan and the actuals are separate figures: the plan is what you set " +
      "out to spend, the actuals are what your records show.",
    MARGIN,
    y,
    { maxWidth: CONTENT_WIDTH },
  );

  doc.setFontSize(9);
  doc.text("Page 1 of 1", MARGIN, FOOTER_Y);
  doc.text("FinVerse AI", PAGE_WIDTH - MARGIN, FOOTER_Y, { align: "right" });
  return new Uint8Array(doc.output("arraybuffer"));
}
