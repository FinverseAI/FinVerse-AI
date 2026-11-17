export type ExportTransaction = {
  name: string;
  amount: number;
  date: string;
  category: string;
};

function escapeField(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/* Renders transactions as RFC 4180 CSV: CRLF line endings, fields with
   commas, quotes or newlines double-quoted with quotes doubled, amounts
   to two decimal places. A UTF-8 byte order mark is prepended so
   spreadsheet apps (notably Excel) open the ₹ header correctly. */
export function transactionsToCsv(transactions: ExportTransaction[]) {
  const header = "Date,Name,Category,Amount (₹)";
  const rows = transactions.map((transaction) =>
    [
      transaction.date,
      escapeField(transaction.name),
      escapeField(transaction.category),
      transaction.amount.toFixed(2),
    ].join(","),
  );
  return `\uFEFF${[header, ...rows].join("\r\n")}\r\n`;
}
