import type { ExportTransaction } from "./export-csv";

/**
 * Renders transactions as a real .xlsx workbook (SheetJS, loaded on
 * demand so the library never joins the dashboard's initial bundle).
 * Amounts stay numeric so the sheet can be summed and filtered in
 * Excel or LibreOffice; the header keeps the ₹ sign (XLSX is UTF-8).
 */

export async function transactionsToXlsx(
  transactions: ExportTransaction[],
): Promise<Uint8Array> {
  const loaded = await import("xlsx");
  // SheetJS ships CommonJS: bundlers expose it as the default export,
  // Node's ESM loader exposes its named exports directly. Both shapes
  // carry the same object, so take whichever is present.
  const XLSX =
    (loaded as unknown as { default?: typeof loaded }).default ?? loaded;
  const rows: Array<Array<string | number>> = [
    ["Date", "Name", "Category", "Amount (₹)"],
    ...transactions.map((transaction) => [
      transaction.date,
      transaction.name,
      transaction.category,
      transaction.amount,
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Transactions");
  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as Uint8Array;
}
