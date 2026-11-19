/** CSV for pt-BR spreadsheets: semicolon separated, UTF-8 with BOM, quotes escaped. Pure. */

const needsQuotes = /[";\r\n]/;

export function csvCell(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // A cell that starts like a formula would run in Excel: neutralize it.
  if (/^[=+\-@]/.test(text) && !/^-?\d+([.,]\d+)?$/.test(text))
    text = `'${text}`;
  return needsQuotes.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(
  header: readonly string[],
  rows: readonly (readonly (string | number | boolean | null | undefined)[])[],
): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}
